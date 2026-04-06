# CI/CD Integration Guide

The **Next Optimize Platform** is designed to be a core part of your CI/CD pipeline, enabling automated performance audits and preventing regressions before code is merged.

## Fast Fails with CI Command

Use the `ci` command to run analysis and fail the build if the performance score falls below your defined threshold.

```bash
npx next-optimize ci --threshold 80
```

### Response Codes
- `0`: Success. Threshold met.
- `1`: Failure. Performance score below threshold OR analysis error.

## GitHub Actions Example

Create a file at `.github/workflows/perf-check.yml`:

```yaml
name: Performance Audit
on: [pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - name: Next Optimize Audit
        run: npx next-optimize ci --threshold 85
```

## Advanced CI Configuration

You can customize the CI behavior via the CLI flags or the `next-optimize.config.ts`.

### Threshold Strategies
- **Incremental**: Start with a low threshold (e.g., 50) and gradually increase it as you optimize your legacy application.
- **Strict**: Use a high threshold (e.g., 90) for new projects to maintain a high performance standard from the start.

### Artifact Storage
In pull requests, it is helpful to upload the HTML report as an artifact for reviewers:

```yaml
      - name: Upload Report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: performance-report
          path: next-optimize-report.html
```
