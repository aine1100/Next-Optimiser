# Next Optimize Platform

A production-grade, enterprise-ready developer CLI tool for analyzing, monitoring, and optimizing React and Next.js applications for performance, stability, and scalability.

## 🚀 Features

- **Static Code Analysis**: Detects anti-patterns using deep AST parsing (via ts-morph).
- **Bundle Analysis**: Monitors build output sizes and chunk distributions.
- **Real-time Monitoring**: Injected browser agent for live telemetry (API, Rerenders, Memory).
- **Dependency Audit**: Identifies heavy, duplicated, or legacy dependencies.
- **Performance Scoring**: Weighted 0–100 score across 8 critical categories.
- **Actionable Recommendations**: Prioritized suggestions sorted by impact and effort.
- **CI/CD Integration**: Fail builds on performance regressions with customized thresholds.
- **Rich Reporting**: Beautiful Console, JSON, and high-fidelity HTML reports.
- **Plugin System**: Extensible architecture for custom rules and scanners.

## 📦 Installation

```bash
npm install -g next-optimize
# OR
npx next-optimize analyze
```

## 🛠 Usage

### Analyze a project
Runs a comprehensive suite of static and build analysis.
```bash
npx next-optimize analyze
```

### Start Real-time Monitoring
Starts a local WebSocket server to receive metrics from the browser agent.
```bash
npx next-optimize monitor
```

### Run in CI Mode
Exit with code 1 if the performance score falls below the threshold.
```bash
npx next-optimize ci --threshold 80
```

### Check Project Health
```bash
npx next-optimize doctor
```

## ⚙️ Configuration

Create a `next-optimize.config.ts` in your project root:

```typescript
export default {
  bundleSizeWarning: 500000,
  componentLocLimit: 500,
  outputFormats: ['console', 'html']
};
```

## 🕵️ Real-time Agent Injection

For real-time monitoring, include the agent in your application's entry point (e.g., `_app.tsx` or `index.tsx`):

```typescript
import '@next-optimize/agent'; // If installed as package
// OR inject the script via CDN/CLI
```

## 🏗 System Architecture

The **Next Optimize Platform** is architected for maximum modularity, enabling seamless integration of static and dynamic analysis.

### 1. Environment Detection (`Detector`)
The platform first fingerprints your project's technology stack:
- **Frameworks**: Next.js, React, Vite, Remix.
- **Build Tools**: Webpack, Turbopack, Rollup.
- **Runtimes**: Node.js version and environment variables.

### 2. Analysis Lifecycle (`Scanner`)
Once detected, the scanner orchestrates a suite of specialized engines:
- **Core Orchestrator**: Manages engine registration and parallel execution.
- **Plugin Manager**: Dynamically loads external rules from `next-optimize.config.ts`.
- **Global Scorer**: Computes a category-weighted performance index based on issue severity.

### 3. Real-time Telemetry (`Agent` + `Server`)
Bridge the gap between code and reality:
- **Instrumentation**: The `@next-optimize/agent` hooks into `window.fetch` and `PerformanceObserver`.
- **Ingestion**: A local WebSocket server receives live metrics for immediate CLI visualization.
- **Tracing**: Native support for React Component render tracing via a specialized helper.

---

## 🛠 Features Breakdown

### 📊 Performance Analytics
- **Dynamic Scoring**: Categorized results for Bundle, Dependency, Component, Render, Memory, Image, API, and Build.
- **Prioritization Engine**: Recommendations are automatically sorted by **Impact** (High/Medium/Low) and **Effort** (High/Medium/Low).

### 🔍 Deep Static Inspection
- **AST Pattern Discovery**: Uses `ts-morph` to identify missing `memo()`, prop-drilling, and improper `useEffect` cleanups.
- **Dependency Audit**: Flags heavy libraries (e.g., `moment`) and suggests modern alternatives (`date-fns`).

### 🤖 CI/CD Guardrails
- **Automated Gates**: Fail builds based on precise performance thresholds.
- **Multi-format Reporting**: Generate artifacts for reviewers in HTML, JSON, or standard Markdown.

---

## 📚 Documentation Hub

For detailed technical guides, please refer to:
- [**Architecture Overview**](./docs/ARCHITECTURE.md): Internals, lifecycle, and data flow.
- [**Plugin Development**](./docs/PLUGINS.md): Extending the platform with custom rules.
- [**CI/CD Integration**](./docs/CI_CD.md): Automated performance audits in pipelines.
- [**Contributing Guidelines**](./CONTRIBUTING.md): How to get involved.

## 🤝 Contributing

We welcome contributions from the community! Please see our [**Contributing Guide**](./CONTRIBUTING.md) for more details.

## 📄 License
MIT
