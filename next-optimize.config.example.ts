import { Config } from './src/types/index.js';

const config: Partial<Config> = {
  // Threshold for bundle size warnings (default: 500KB)
  bundleSizeWarning: 500 * 1024,
  
  // Threshold for critical bundle size (default: 1MB) 
  bundleSizeCritical: 1000 * 1024,
  
  // Max lines of code before a component is flagged (default: 500)
  componentLocLimit: 500,
  
  // Max hooks used in a single component (default: 20)
  hookCountLimit: 20,
  
  // Image size limit (default: 500KB)
  imageSizeLimit: 500 * 1024,

  // Prop forwarding count before flagging prop drilling (default: 4)
  propDrillLimit: 4,
  
  // Paths to ignore during scanning
  ignoredPaths: [
    'node_modules',
    '.next',
    'dist',
    'build',
    '.git',
    'public/static'
  ],
  
  // External plugins to load
  plugins: [
    // './plugins/my-custom-plugin.js'
  ],
  
  // Output formats for analysis reports
  outputFormats: ['console', 'html', 'json', 'markdown', 'sarif']
};

export default config;
