import { Detector } from './detector.js';
import { Scorer } from './scorer.js';
import { Recommender } from './recommender.js';
import { logger } from '../utils/logger.js';
export class Scanner {
    engines = [];
    config;
    constructor(config) {
        this.config = config;
    }
    registerEngine(engine) {
        this.engines.push(engine);
    }
    async scan(projectRoot) {
        const spinner = logger.spinner('Detecting project environment...');
        const project = await Detector.detect(projectRoot);
        spinner.succeed(`Project Detected: ${project.framework} ${project.version || ''} (${project.buildTool})`);
        const allIssues = [];
        for (const engine of this.engines) {
            if (engine.isApplicable(project)) {
                const engineSpinner = logger.spinner(`Running ${engine.name} analysis...`);
                try {
                    const issues = await engine.analyze(project);
                    allIssues.push(...issues);
                    engineSpinner.succeed(`${engine.name} analysis complete: ${issues.length} issues found`);
                }
                catch (error) {
                    engineSpinner.fail(`${engine.name} analysis failed`);
                    logger.error(`Error in ${engine.name}:`, error);
                }
            }
            else {
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
