export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface Issue {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  file?: string;
  line?: number;
  column?: number;
  suggestion?: string;
  category: 'bundle' | 'dependency' | 'component' | 'render' | 'memory' | 'image' | 'api' | 'build';
}

export interface PerformanceScore {
  overall: number;
  categories: {
    bundle: number;
    dependency: number;
    component: number;
    render: number;
    memory: number;
    image: number;
    api: number;
    build: number;
  };
}

export interface ProjectInfo {
  framework: 'next' | 'react' | 'vite' | 'remix' | 'express' | 'unknown';
  version?: string;
  buildTool: 'webpack' | 'turbopack' | 'vite' | 'rollup' | 'unknown';
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'unknown';
  nodeVersion: string;
  rootPath: string;
}

export interface Recommendation {
  issueId: string;
  action: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  link?: string;
}

export interface AnalysisResult {
  timestamp: string;
  project: ProjectInfo;
  issues: Issue[];
  score: PerformanceScore;
  recommendations: Recommendation[];
}

export interface Config {
  bundleSizeWarning: number;
  bundleSizeCritical: number;
  componentLocLimit: number;
  hookCountLimit: number;
  imageSizeLimit: number;
  propDrillLimit: number;
  ignoredPaths: string[];
  plugins: string[];
  outputFormats: ('console' | 'json' | 'html' | 'markdown' | 'sarif')[];
}

export interface PluginInterface {
  name: string;
  version: string;
  initialize: (config: Config) => Promise<void>;
  analyze: (project: ProjectInfo) => Promise<Issue[]>;
  report?: (result: AnalysisResult) => Promise<void>;
}
