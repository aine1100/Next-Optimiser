/**
 * Generates structured code fix suggestions from detected issues.
 * Designed to be consumed by IDEs, AI assistants, or the optimize command.
 */
export class FixSuggester {
    static FIX_TEMPLATES = {
        'inline-function': (issue) => ({
            issueId: issue.id,
            title: 'Wrap with useCallback',
            description: 'Memoize the inline function to prevent child re-renders.',
            before: `onClick={() => handleClick()}`,
            after: `const onClick = useCallback(() => handleClick(), [handleClick]);\n// ...\nonClick={onClick}`,
            confidence: 'high',
        }),
        'inline-object': (issue) => ({
            issueId: issue.id,
            title: 'Wrap with useMemo',
            description: 'Memoize the inline object to prevent child re-renders.',
            before: `style={{ color: 'red' }}`,
            after: `const style = useMemo(() => ({ color: 'red' }), []);\n// ...\nstyle={style}`,
            confidence: 'high',
        }),
        'missing-memo': (issue) => ({
            issueId: issue.id,
            title: 'Wrap component with React.memo',
            description: 'Prevent unnecessary re-renders in list items.',
            before: `export function MyComponent(props) { ... }`,
            after: `export const MyComponent = React.memo(function MyComponent(props) { ... });`,
            confidence: 'high',
        }),
        'missing-cleanup': (issue) => ({
            issueId: issue.id,
            title: 'Add useEffect cleanup',
            description: 'Return a cleanup function to prevent memory leaks.',
            before: `useEffect(() => {\n  const id = setInterval(fn, 1000);\n}, []);`,
            after: `useEffect(() => {\n  const id = setInterval(fn, 1000);\n  return () => clearInterval(id);\n}, []);`,
            confidence: 'high',
        }),
        'legacy-img-tag': (issue) => ({
            issueId: issue.id,
            title: 'Replace with next/image',
            description: 'Use the optimized Image component.',
            before: `<img src="/logo.png" alt="Logo" width="100" height="50" />`,
            after: `import Image from 'next/image';\n// ...\n<Image src="/logo.png" alt="Logo" width={100} height={50} />`,
            confidence: 'high',
        }),
        'missing-use-client': (issue) => ({
            issueId: issue.id,
            title: 'Add "use client" directive',
            description: 'Mark this file as a Client Component.',
            before: `import { useState } from 'react';`,
            after: `"use client";\n\nimport { useState } from 'react';`,
            confidence: 'high',
        }),
        'raw-fetch-in-hook': (issue) => ({
            issueId: issue.id,
            title: 'Use TanStack Query',
            description: 'Replace raw fetch in useEffect with a data-fetching library.',
            before: `useEffect(() => {\n  fetch('/api/data').then(r => r.json()).then(setData);\n}, []);`,
            after: `const { data } = useQuery({\n  queryKey: ['data'],\n  queryFn: () => fetch('/api/data').then(r => r.json()),\n});`,
            confidence: 'medium',
        }),
        'index-key': (issue) => ({
            issueId: issue.id,
            title: 'Use stable key',
            description: 'Replace array index with a unique identifier.',
            before: `{items.map((item, index) => <Item key={index} />)}`,
            after: `{items.map((item) => <Item key={item.id} />)}`,
            confidence: 'medium',
        }),
        'heavy-moment': () => ({
            issueId: 'heavy-moment',
            title: 'Replace moment with date-fns',
            description: 'moment.js is ~290KB. date-fns is tree-shakeable.',
            before: `import moment from 'moment';\nmoment().format('YYYY-MM-DD');`,
            after: `import { format } from 'date-fns';\nformat(new Date(), 'yyyy-MM-dd');`,
            confidence: 'high',
        }),
        'heavy-lodash': () => ({
            issueId: 'heavy-lodash',
            title: 'Replace lodash with lodash-es',
            description: 'lodash-es supports tree-shaking for smaller bundles.',
            before: `import _ from 'lodash';\n_.debounce(fn, 300);`,
            after: `import debounce from 'lodash-es/debounce';\ndebounce(fn, 300);`,
            confidence: 'high',
        }),
    };
    static suggest(issues) {
        const suggestions = [];
        const seen = new Set();
        for (const issue of issues) {
            const ruleKey = Object.keys(this.FIX_TEMPLATES).find((key) => issue.id.includes(key));
            if (!ruleKey || seen.has(ruleKey))
                continue;
            const template = this.FIX_TEMPLATES[ruleKey](issue);
            if (template) {
                suggestions.push(template);
                seen.add(ruleKey);
            }
        }
        return suggestions.sort((a, b) => {
            const order = { high: 3, medium: 2, low: 1 };
            return order[b.confidence] - order[a.confidence];
        });
    }
    static formatAsMarkdown(suggestions) {
        if (suggestions.length === 0)
            return 'No fix suggestions available.';
        let md = `# Suggested Fixes\n\n`;
        for (const fix of suggestions) {
            md += `## ${fix.title} (${fix.confidence} confidence)\n\n`;
            md += `${fix.description}\n\n`;
            md += `**Before:**\n\`\`\`tsx\n${fix.before}\n\`\`\`\n\n`;
            md += `**After:**\n\`\`\`tsx\n${fix.after}\n\`\`\`\n\n`;
        }
        return md;
    }
}
