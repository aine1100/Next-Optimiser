export const DEFAULT_THRESHOLDS = {
  BUNDLE_SIZE_WARNING: 500 * 1024, // 500 KB
  BUNDLE_SIZE_CRITICAL: 1000 * 1024, // 1 MB
  COMPONENT_LOC_LIMIT: 500,
  HOOK_COUNT_LIMIT: 20,
  IMAGE_SIZE_LIMIT: 500 * 1024, // 500 KB
  RE_RENDER_LIMIT: 10,
  GC_FREQ_LIMIT: 1.0, // 1 GC per second
  PROP_DRILL_LIMIT: 4,
};

export const WEIGHTS = {
  bundle: 0.25,
  dependency: 0.15,
  component: 0.1,
  render: 0.2,
  memory: 0.1,
  image: 0.1,
  api: 0.05,
  build: 0.05,
};

export const SUPPORTED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

export const FRAMEWORKS = {
  NEXT: 'next',
  REACT: 'react',
  VITE: 'vite',
  REMIX: 'remix',
  EXPRESS: 'express',
};

export const BUILD_TOOLS = {
  WEBPACK: 'webpack',
  TURBOPACK: 'turbopack',
  VITE: 'vite',
  ROLLUP: 'rollup',
};

export const PACKAGE_MANAGERS = {
  NPM: 'npm',
  YARN: 'yarn',
  PNPM: 'pnpm',
};

export const SCORING_CATEGORIES = {
  EXCELLENT: { min: 90, label: 'Excellent', color: 'green' },
  GOOD: { min: 70, label: 'Good', color: 'blue' },
  NEEDS_OPTIMIZATION: { min: 50, label: 'Needs Optimization', color: 'yellow' },
  CRITICAL: { min: 0, label: 'Critical', color: 'red' },
};
