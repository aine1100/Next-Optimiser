import { AnalysisResult, ProjectInfo, Config, Issue, PerformanceScore, Recommendation } from '../types/index.js';
import { AnalysisEngine } from './analyzer.js';
import { Detector } from './detector.js';
import { Scorer } from './scorer.js';
import { Recommender } from './recommender.js';
import { logger } from '../utils/logger.js';

/**
 * Orchestrates the full analysis lifecycle, including environment detection,
 * engine execution, scoring, and recommendation generation.
 */
export class Scanner {
  private engines: AnalysisEngine[] = [];
  private config: Config;

  /**
   * Initializes a new Scanner instance with the provided configuration.
   * @param config The application configuration settings.
   */
  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Registers a new analysis engine to the scanner's execution pipeline.
   * @param engine The analysis engine instance to register.
   */
  public registerEngine(engine: AnalysisEngine) {
    this.engines.push(engine);
  }

  public async scan(projectRoot: string): Promise<AnalysisResult> {
    const spinner = logger.spinner('Detecting project environment...');
    const project = await Detector.detect(projectRoot);
    spinner.succeed(`Project Detected: ${project.framework} ${project.version || ''} (${project.buildTool})`);

    const allIssues: Issue[] = [];
    
    for (const engine of this.engines) {
      if (engine.isApplicable(project)) {
        const engineSpinner = logger.spinner(`Running ${engine.name} analysis...`);
        try {
          const issues = await engine.analyze(project);
          allIssues.push(...issues);
          engineSpinner.succeed(`${engine.name} analysis complete: ${issues.length} issues found`);
        } catch (error) {
          engineSpinner.fail(`${engine.name} analysis failed`);
          logger.error(`Error in ${engine.name}:`, error);
        }
      } else {
        logger.debug(`Skipping ${engine.name} (not applicable)`);
      }
    }

    const score = Scorer.calculate(allIssues);
    const recommendations = Recommender.generate(allIssues);

    return {
      timestamp: new Date().toISOString(),
      project,
      issues: allIssues,
      score,
      recommendations,
    };
  }
}
