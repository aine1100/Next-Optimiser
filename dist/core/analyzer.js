export class AnalysisEngine {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Helper to create a standardized issue object.
     */
    createIssue(id, title, description, severity, category, file, line, suggestion) {
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
