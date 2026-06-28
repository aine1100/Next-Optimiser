# Next Optimize Platform

A production-grade, enterprise-ready developer CLI tool for analyzing, monitoring, and optimizing React and Next.js applications for performance, stability, and scalability.

## 🚀 Features

- **14 Analysis Engines**: Bundle, Component, Render, RSC, Web Vitals, Memory, Image, API, Build, Dependency, Monorepo, Framework
- **Static Code Analysis**: Deep AST parsing via ts-morph for anti-patterns
- **Real-time Monitoring**: Browser agent + live HTTP dashboard at `localhost:3006`
- **Performance Scoring**: Weighted 0–100 score across 8 categories
- **CI/CD Integration**: Threshold gates, baseline regression diffing, SARIF output
- **Rich Reporting**: Console, HTML, JSON, Markdown, and SARIF
- **Auto-Optimize**: Safe codemods (`<img>` → `next/image`)
- **AI Fix Suggestions**: Before/after code snippets for detected issues
- **Monorepo Support**: Scan all workspace packages with `--workspace`
- **VS Code Extension**: Inline diagnostics and one-click analysis
- **Plugin System**: Extensible custom rules

## 📦 Installation

```bash
npm install -g next-optimize
# OR
npx next-optimize analyze
```

## 🛠 Commands

```bash
npx next-optimize analyze              # Full analysis
npx next-optimize analyze --workspace  # Monorepo scan
npx next-optimize analyze --runtime    # Correlate with live metrics
npx next-optimize monitor              # WebSocket + live dashboard
npx next-optimize ci --threshold 80 --baseline  # CI with regression check
npx next-optimize baseline save        # Save performance baseline
npx next-optimize suggest -o FIXES.md    # AI-assisted fix suggestions
npx next-optimize optimize --dry-run   # Preview auto-fixes
npx next-optimize doctor               # Health check
```

## ⚙️ Configuration

```typescript
// next-optimize.config.ts
export default {
  bundleSizeWarning: 500000,
  componentLocLimit: 500,
  propDrillLimit: 4,
  outputFormats: ['console', 'html', 'json', 'markdown', 'sarif'],
  plugins: ['./plugins/my-plugin.js'],
};
```

## 📚 Documentation

Full documentation powered by [Mintlify](https://mintlify.com):

```bash
npm run docs   # Local docs at http://localhost:3000
```

- [**Mintlify Docs**](./docs/mintlify/introduction.mdx) — Full platform documentation
- [**Architecture**](./docs/ARCHITECTURE.md) — Internals and data flow
- [**Plugins**](./docs/PLUGINS.md) — Custom rule development
- [**CI/CD**](./docs/CI_CD.md) — Pipeline integration

## 📄 License

MIT
