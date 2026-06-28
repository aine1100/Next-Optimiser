#!/usr/bin/env node
import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import { resolveProjectRoot } from '../utils/fileUtils.js';
import { configLoader } from '../config/configLoader.js';
import { createScanner } from '../core/registerEngines.js';
import { ConsoleReporter } from '../reporting/consoleReporter.js';
import { JsonReporter } from '../reporting/jsonReporter.js';
import { HtmlReporter } from '../reporting/htmlReporter.js';
import { MarkdownReporter } from '../reporting/markdownReporter.js';
import { SarifReporter } from '../reporting/sarifReporter.js';
import { MetricsServer } from '../server/metricsServer.js';
import { DashboardServer } from '../server/dashboardServer.js';
import { metricsStore } from '../server/metricsStore.js';
import { PluginManager } from '../plugins/pluginManager.js';
import { Optimizer } from '../optimize/optimizer.js';
import { BaselineManager } from '../baseline/baselineManager.js';
import { FixSuggester } from '../ai/fixSuggester.js';
import { Scorer } from '../core/scorer.js';
import { Recommender } from '../core/recommender.js';
import { MonorepoAnalyzer } from '../engines/monorepo/monorepoAnalyzer.js';
import fs from 'fs-extra';
import path from 'path';

const program = new Command();

const packageJson = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

program
  .name('next-optimize')
  .description('Enterprise-ready performance optimization engine for React and Next.js')
  .version(packageJson.version);

program
  .option('-v, --verbose', 'Verbose output')
  .option('-d, --debug', 'Debug mode')
  .option('-c, --config <path>', 'Custom config file path');

async function setup(options: Record<string, unknown>) {
  if (options.verbose) logger.setVerbose(true);
  if (options.debug) logger.setDebug(true);

  const projectRoot = await resolveProjectRoot(process.cwd());
  const config = await configLoader.load(projectRoot);

  return { projectRoot, config };
}

async function runAnalysis(projectRoot: string, config: ReturnType<typeof configLoader.load> extends Promise<infer T> ? T : never, correlateRuntime = false) {
  const scanner = createScanner(config);
  const result = await scanner.scan(projectRoot);

  if (correlateRuntime) {
    const correlatedIssues = metricsStore.correlateWithIssues(result.issues);
    result.issues = correlatedIssues;
    result.score = Scorer.calculate(correlatedIssues);
    result.recommendations = Recommender.generate(correlatedIssues);
  }

  return result;
}

async function outputReports(
  result: Awaited<ReturnType<typeof runAnalysis>>,
  config: Awaited<ReturnType<typeof setup>>['config'],
  outputPath?: string
) {
  if (config.outputFormats.includes('json')) {
    await JsonReporter.report(result, outputPath ? `${outputPath}.json` : undefined);
  }
  if (config.outputFormats.includes('html')) {
    await HtmlReporter.report(result, outputPath ? `${outputPath}.html` : undefined);
  }
  if (config.outputFormats.includes('markdown')) {
    await MarkdownReporter.report(result, outputPath ? `${outputPath}.md` : undefined);
  }
  if (config.outputFormats.includes('sarif')) {
    await SarifReporter.report(result, outputPath ? `${outputPath}.sarif` : undefined);
  }
}

program
  .command('analyze')
  .description('Run a full performance analysis')
  .option('-o, --output <path>', 'Custom report output path')
  .option('--runtime', 'Correlate with runtime metrics from monitor session')
  .option('--workspace', 'Analyze all monorepo workspace packages')
  .action(async (cmdOptions) => {
    const { projectRoot, config } = await setup(program.opts());

    logger.header('Performance Analysis Started');
    logger.info(`Analyzing project at: ${projectRoot}`);

    try {
      if (cmdOptions.workspace) {
        const monorepo = new MonorepoAnalyzer(config);
        const packages = await monorepo.detectWorkspaces(projectRoot);
        logger.info(`Scanning ${packages.length} workspace package(s)...`);

        for (const pkg of packages) {
          logger.header(`Package: ${pkg.name}`);
          const result = await runAnalysis(pkg.path, config, cmdOptions.runtime);
          ConsoleReporter.report(result);
          await outputReports(result, config, cmdOptions.output ? `${cmdOptions.output}-${pkg.name}` : undefined);
        }
        return;
      }

      const result = await runAnalysis(projectRoot, config, cmdOptions.runtime);
      ConsoleReporter.report(result);
      await outputReports(result, config, cmdOptions.output);

      if (result.score.overall < 50) {
        logger.error('Performance score is critical! Significant optimizations needed.');
      }
    } catch (error) {
      logger.error('Analysis failed:', error);
      process.exit(1);
    }
  });

program
  .command('monitor')
  .description('Start real-time monitoring agent with live dashboard')
  .option('-p, --port <number>', 'WebSocket server port', '3005')
  .option('--dashboard-port <number>', 'HTTP dashboard port', '3006')
  .action(async (cmdOptions) => {
    const { projectRoot } = await setup(program.opts());
    logger.header('Real-time Monitoring Started');
    logger.info(`Monitoring project at: ${projectRoot}`);

    const server = new MetricsServer(parseInt(cmdOptions.port));
    server.start();

    const dashboard = new DashboardServer(parseInt(cmdOptions.dashboardPort));
    dashboard.start();

    logger.info('Press Ctrl+C to stop monitoring');
  });

program
  .command('doctor')
  .description('Check project health and configuration')
  .action(async () => {
    const { projectRoot } = await setup(program.opts());
    logger.header('Project Health Check');

    const checks = [
      { name: 'Node Version', status: !!process.version, detail: process.version },
      { name: 'Package JSON', status: await fs.pathExists(path.join(projectRoot, 'package.json')) },
      {
        name: 'Next Config',
        status:
          (await fs.pathExists(path.join(projectRoot, 'next.config.js'))) ||
          (await fs.pathExists(path.join(projectRoot, 'next.config.mjs'))),
      },
      {
        name: 'Build Directory',
        status:
          (await fs.pathExists(path.join(projectRoot, '.next'))) ||
          (await fs.pathExists(path.join(projectRoot, 'dist'))),
      },
    ];

    checks.forEach((c) => {
      if (c.status) logger.success(`${c.name}: Found (${c.detail || ''})`);
      else logger.warn(`${c.name}: Not Found`);
    });
  });

program
  .command('ci')
  .description('Run in CI mode with optional baseline regression check')
  .option('--threshold <score>', 'Minimum performance score to pass', '70')
  .option('--baseline', 'Compare against saved baseline and fail on regression')
  .option('--save-baseline', 'Save current results as baseline after successful run')
  .action(async (cmdOptions) => {
    const { projectRoot, config } = await setup(program.opts());
    logger.info('Running in CI mode');

    try {
      const result = await runAnalysis(projectRoot, config);
      const minScore = parseInt(cmdOptions.threshold);

      ConsoleReporter.report(result);
      await SarifReporter.report(result);

      const baseline = new BaselineManager(projectRoot);

      if (cmdOptions.baseline) {
        const saved = await baseline.load();
        if (saved) {
          const diff = baseline.diff(result, saved);
          logger.info(`Score delta: ${diff.scoreDelta >= 0 ? '+' : ''}${diff.scoreDelta}`);
          logger.info(`New issues: ${diff.newIssues.length}, Resolved: ${diff.resolvedIssues.length}`);

          if (!diff.passed) {
            logger.error('CI FAILED: Performance regression detected.');
            if (diff.newIssues.length > 0) {
              diff.newIssues.slice(0, 5).forEach((i) => logger.warn(`  NEW: ${i.title}`));
            }
            process.exit(1);
          }
          logger.success('No performance regression detected.');
        } else {
          logger.warn('No baseline found. Run "next-optimize baseline save" first.');
        }
      }

      if (result.score.overall < minScore) {
        logger.error(`CI FAILED: Performance score ${result.score.overall} is below threshold ${minScore}`);
        process.exit(1);
      }

      if (cmdOptions.saveBaseline) {
        await baseline.save(result);
      }

      logger.success('CI PASSED: Performance thresholds met.');
      process.exit(0);
    } catch (e) {
      logger.error('CI failed due to error:', e);
      process.exit(1);
    }
  });

program
  .command('baseline')
  .description('Manage performance baselines')
  .argument('<action>', 'save | show | diff')
  .action(async (action) => {
    const { projectRoot, config } = await setup(program.opts());
    const baseline = new BaselineManager(projectRoot);

    if (action === 'save') {
      const result = await runAnalysis(projectRoot, config);
      await baseline.save(result);
    } else if (action === 'show') {
      const saved = await baseline.load();
      if (!saved) {
        logger.warn('No baseline found. Run "next-optimize baseline save" first.');
        return;
      }
      logger.box(JSON.stringify({ score: saved.score.overall, issues: saved.issues.length, timestamp: saved.timestamp }, null, 2));
    } else if (action === 'diff') {
      const saved = await baseline.load();
      if (!saved) {
        logger.warn('No baseline found.');
        return;
      }
      const current = await runAnalysis(projectRoot, config);
      const diff = baseline.diff(current, saved);

      logger.header('Regression Diff');
      logger.info(`Score: ${saved.score.overall} → ${current.score.overall} (${diff.scoreDelta >= 0 ? '+' : ''}${diff.scoreDelta})`);
      logger.info(`New issues: ${diff.newIssues.length}`);
      logger.info(`Resolved: ${diff.resolvedIssues.length}`);

      if (diff.regressedCategories.length > 0) {
        logger.warn(`Regressed categories: ${diff.regressedCategories.join(', ')}`);
      }

      diff.newIssues.forEach((i) => logger.warn(`  + ${i.title} [${i.severity}]`));
      diff.resolvedIssues.forEach((i) => logger.success(`  - ${i.title} (resolved)`));
    } else {
      logger.error(`Unknown action: ${action}. Use save, show, or diff.`);
    }
  });

program
  .command('suggest')
  .description('Generate AI-assisted fix suggestions for detected issues')
  .option('-o, --output <path>', 'Write suggestions to a markdown file')
  .action(async (cmdOptions) => {
    const { projectRoot, config } = await setup(program.opts());
    logger.header('Fix Suggestions');

    const result = await runAnalysis(projectRoot, config);
    const suggestions = FixSuggester.suggest(result.issues);

    if (suggestions.length === 0) {
      logger.info('No fix suggestions available for current issues.');
      return;
    }

    const md = FixSuggester.formatAsMarkdown(suggestions);

    if (cmdOptions.output) {
      await fs.writeFile(cmdOptions.output, md);
      logger.success(`Suggestions written to ${cmdOptions.output}`);
    } else {
      console.log(md);
    }

    logger.info(`${suggestions.length} fix suggestion(s) generated.`);
  });

program
  .command('report')
  .description('Generate performance report')
  .option('-f, --format <type>', 'Report format (json, html, markdown, sarif)', 'html')
  .option('-o, --output <path>', 'Custom report output path')
  .action(async (cmdOptions) => {
    const { projectRoot, config } = await setup(program.opts());
    const result = await runAnalysis(projectRoot, config);

    switch (cmdOptions.format) {
      case 'json':
        await JsonReporter.report(result, cmdOptions.output);
        break;
      case 'markdown':
        await MarkdownReporter.report(result, cmdOptions.output);
        break;
      case 'sarif':
        await SarifReporter.report(result, cmdOptions.output);
        break;
      default:
        await HtmlReporter.report(result, cmdOptions.output);
    }
  });

program
  .command('optimize')
  .description('Apply automatic performance optimizations')
  .option('--dry-run', 'Preview changes without writing files')
  .action(async (cmdOptions) => {
    const { projectRoot, config } = await setup(program.opts());
    logger.header('Optimizing Project');
    logger.info('Applying safe codemods...');

    const optimizer = new Optimizer(config);
    const result = await optimizer.apply(projectRoot, { dryRun: cmdOptions.dryRun });

    logger.info(`Files modified: ${result.filesModified}`);
    logger.info(`Fixes applied: ${result.fixesApplied}`);

    if (result.skipped.length > 0) {
      logger.warn(`${result.skipped.length} item(s) skipped:`);
      result.skipped.slice(0, 10).forEach((s) => logger.warn(`  - ${s}`));
    }

    if (result.fixesApplied === 0) {
      logger.info('No automatic fixes were applied. Run "next-optimize suggest" for manual fix guidance.');
    }
  });

program
  .command('config')
  .description('Manage configuration')
  .action(async () => {
    const { config } = await setup(program.opts());
    logger.header('Current Configuration');
    logger.box(JSON.stringify(config, null, 2));
  });

program
  .command('plugins')
  .description('Manage plugins')
  .action(async () => {
    const { config } = await setup(program.opts());
    const manager = new PluginManager(config);
    await manager.loadPlugins();

    const plugins = manager.getPlugins();
    if (plugins.length === 0) {
      logger.info('No plugins installed. Add them to next-optimize.config.ts');
    } else {
      logger.success(`${plugins.length} plugins active:`);
      plugins.forEach((p) => console.log(` - ${p.name} v${p.version}`));
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
