#!/usr/bin/env node
import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import { resolveProjectRoot } from '../utils/fileUtils.js';
import { configLoader } from '../config/configLoader.js';
import fs from 'fs-extra';
import path from 'path';
const program = new Command();
// Read package.json version
const packageJson = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
program
    .name('next-optimize')
    .description('Enterprise-ready performance optimization engine for React and Next.js')
    .version(packageJson.version);
program
    .option('-v, --verbose', 'Verbose output')
    .option('-d, --debug', 'Debug mode')
    .option('-c, --config <path>', 'Custom config file path');
// Common setup for commands
async function setup(options) {
    if (options.verbose)
        logger.setVerbose(true);
    if (options.debug)
        logger.setDebug(true);
    const projectRoot = await resolveProjectRoot(process.cwd());
    const config = await configLoader.load(projectRoot);
    return { projectRoot, config };
}
import { Scanner } from '../core/scanner.js';
import { BundleAnalyzer } from '../engines/bundle/bundleAnalyzer.js';
import { DependencyAnalyzer } from '../engines/dependency/dependencyAnalyzer.js';
import { ComponentAnalyzer } from '../engines/component/componentAnalyzer.js';
import { RenderAnalyzer } from '../engines/render/renderAnalyzer.js';
import { MemoryAnalyzer } from '../engines/memory/memoryAnalyzer.js';
import { ImageAnalyzer } from '../engines/image/imageAnalyzer.js';
import { ApiAnalyzer } from '../engines/api/apiAnalyzer.js';
import { BuildAnalyzer } from '../engines/build/buildAnalyzer.js';
import { ConsoleReporter } from '../reporting/consoleReporter.js';
import { JsonReporter } from '../reporting/jsonReporter.js';
import { HtmlReporter } from '../reporting/htmlReporter.js';
// ... (previous setup code)
program
    .command('analyze')
    .description('Run a full performance analysis')
    .option('-o, --output <path>', 'Custom report output path')
    .action(async (cmdOptions) => {
    const { projectRoot, config } = await setup(program.opts());
    const scanner = new Scanner(config);
    // Register all engines
    scanner.registerEngine(new BundleAnalyzer(config));
    scanner.registerEngine(new DependencyAnalyzer(config));
    scanner.registerEngine(new ComponentAnalyzer(config));
    scanner.registerEngine(new RenderAnalyzer(config));
    scanner.registerEngine(new MemoryAnalyzer(config));
    scanner.registerEngine(new ImageAnalyzer(config));
    scanner.registerEngine(new ApiAnalyzer(config));
    scanner.registerEngine(new BuildAnalyzer(config));
    logger.header('Performance Analysis Started');
    logger.info(`Analyzing project at: ${projectRoot}`);
    try {
        const result = await scanner.scan(projectRoot);
        // Reporters
        ConsoleReporter.report(result);
        if (config.outputFormats.includes('json')) {
            await JsonReporter.report(result, cmdOptions.output ? `${cmdOptions.output}.json` : undefined);
        }
        if (config.outputFormats.includes('html')) {
            await HtmlReporter.report(result, cmdOptions.output ? `${cmdOptions.output}.html` : undefined);
        }
        if (result.score.overall < 50) {
            logger.error('Performance score is critical! Significant optimizations needed.');
        }
    }
    catch (error) {
        logger.error('Analysis failed:', error);
        process.exit(1);
    }
});
import { MetricsServer } from '../server/metricsServer.js';
program
    .command('monitor')
    .description('Start real-time monitoring agent')
    .option('-p, --port <number>', 'WebSocket server port', '3005')
    .action(async (cmdOptions) => {
    const { projectRoot, config } = await setup(program.opts());
    logger.header('Real-time Monitoring Started');
    logger.info(`Monitoring project at: ${projectRoot}`);
    const server = new MetricsServer(parseInt(cmdOptions.port));
    server.start();
    logger.info('Press Ctrl+C to stop monitoring');
});
program
    .command('doctor')
    .description('Check project health and configuration')
    .action(async (options) => {
    const { projectRoot, config } = await setup(program.opts());
    logger.header('Project Health Check');
    const checks = [
        { name: 'Node Version', status: !!process.version, detail: process.version },
        { name: 'Package JSON', status: await fs.pathExists(path.join(projectRoot, 'package.json')) },
        { name: 'Next Config', status: await fs.pathExists(path.join(projectRoot, 'next.config.js')) || await fs.pathExists(path.join(projectRoot, 'next.config.mjs')) },
        { name: 'Build Directory', status: await fs.pathExists(path.join(projectRoot, '.next')) || await fs.pathExists(path.join(projectRoot, 'dist')) },
    ];
    checks.forEach(c => {
        if (c.status)
            logger.success(`${c.name}: Found (${c.detail || ''})`);
        else
            logger.warn(`${c.name}: Not Found`);
    });
});
program
    .command('ci')
    .description('Run in CI mode')
    .option('--threshold <score>', 'Minimum performance score to pass', '70')
    .action(async (cmdOptions) => {
    const { projectRoot, config } = await setup(program.opts());
    logger.info('Running in CI mode');
    const scanner = new Scanner(config);
    scanner.registerEngine(new BundleAnalyzer(config));
    scanner.registerEngine(new DependencyAnalyzer(config));
    scanner.registerEngine(new ComponentAnalyzer(config));
    scanner.registerEngine(new RenderAnalyzer(config));
    scanner.registerEngine(new MemoryAnalyzer(config));
    scanner.registerEngine(new ApiAnalyzer(config));
    scanner.registerEngine(new BuildAnalyzer(config));
    try {
        const result = await scanner.scan(projectRoot);
        const minScore = parseInt(cmdOptions.threshold);
        ConsoleReporter.report(result);
        if (result.score.overall < minScore) {
            logger.error(`CI FAILED: Performance score ${result.score.overall} is below threshold ${minScore}`);
            process.exit(1);
        }
        else {
            logger.success('CI PASSED: Performance thresholds met.');
            process.exit(0);
        }
    }
    catch (e) {
        logger.error('CI failed due to error:', e);
        process.exit(1);
    }
});
program
    .command('report')
    .description('Generate performance report from last analysis')
    .option('-f, --format <type>', 'Report format (json, html)', 'html')
    .option('-o, --output <path>', 'Custom report output path')
    .action(async (cmdOptions) => {
    const { projectRoot, config } = await setup(program.opts());
    // Re-run scanner to get fresh results
    const scanner = new Scanner(config);
    scanner.registerEngine(new BundleAnalyzer(config));
    scanner.registerEngine(new DependencyAnalyzer(config));
    scanner.registerEngine(new ComponentAnalyzer(config));
    scanner.registerEngine(new RenderAnalyzer(config));
    scanner.registerEngine(new MemoryAnalyzer(config));
    scanner.registerEngine(new ImageAnalyzer(config));
    scanner.registerEngine(new ApiAnalyzer(config));
    scanner.registerEngine(new BuildAnalyzer(config));
    const result = await scanner.scan(projectRoot);
    if (cmdOptions.format === 'json') {
        await JsonReporter.report(result, cmdOptions.output);
    }
    else {
        await HtmlReporter.report(result, cmdOptions.output);
    }
});
program
    .command('optimize')
    .description('Apply automatic performance optimizations')
    .action(async (options) => {
    const { projectRoot, config } = await setup(program.opts());
    logger.header('Optimizing Project');
    logger.info('Auto-fix is currently in beta. Analyzing first...');
    // In V1, we just advise. Future V2 could implement codemods.
    logger.warn('Auto-fix is not yet available for the current project type.');
});
program
    .command('config')
    .description('Manage configuration')
    .action(async (options) => {
    const { projectRoot, config } = await setup(program.opts());
    logger.header('Current Configuration');
    logger.box(JSON.stringify(config, null, 2));
});
import { PluginManager } from '../plugins/pluginManager.js';
program
    .command('plugins')
    .description('Manage plugins')
    .action(async (options) => {
    const { projectRoot, config } = await setup(program.opts());
    const manager = new PluginManager(config);
    await manager.loadPlugins();
    const plugins = manager.getPlugins();
    if (plugins.length === 0) {
        logger.info('No plugins installed. Add them to next-optimize.config.ts');
    }
    else {
        logger.success(`${plugins.length} plugins active:`);
        plugins.forEach(p => console.log(` - ${p.name} v${p.version}`));
    }
});
program.parse(process.argv);
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
