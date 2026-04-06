import { Issue, ProjectInfo, Config } from '../types/index.js';

export abstract class AnalysisEngine {
  public abstract name: string;
  protected config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Check if this engine is applicable to the current project.
   */
  public abstract isApplicable(project: ProjectInfo): boolean;

  /**
   * Run the analysis and return a list of issues.
   */
  public abstract analyze(project: ProjectInfo): Promise<Issue[]>;

  /**
   * Helper to create a standardized issue object.
   */
  protected createIssue(
    id: string,
    title: string,
    description: string,
    severity: Issue['severity'],
    category: Issue['category'],
    file?: string,
    line?: number,
    suggestion?: string
  ): Issue {
    return {
      id: `${this.name}-${id}`,
      title,
      description,
      severity,
      category,
      file,
      line,
      suggestion,
    };
  }
}
