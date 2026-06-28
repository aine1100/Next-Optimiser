import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const DIAGNOSTIC_SOURCE = 'next-optimize';

export function activate(context: vscode.ExtensionContext) {
  const collection = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE);

  const analyzeCommand = vscode.commands.registerCommand('next-optimize.analyze', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open.');
      return;
    }

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Next Optimize: Analyzing...' },
      async () => {
        try {
          const { stdout } = await execAsync('npx next-optimize analyze --format json', {
            cwd: workspaceFolder.uri.fsPath,
            timeout: 120000,
          });

          vscode.window.showInformationMessage('Next Optimize analysis complete.');
          console.log(stdout);
          await updateDiagnostics(workspaceFolder.uri.fsPath, collection);
        } catch (error: any) {
          vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
        }
      }
    );
  });

  const showScoreCommand = vscode.commands.registerCommand('next-optimize.showScore', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return;

    try {
      const reportPath = `${workspaceFolder.uri.fsPath}/next-optimize-report.json`;
      const fs = await import('fs');
      if (!fs.existsSync(reportPath)) {
        vscode.window.showWarningMessage('No report found. Run analysis first.');
        return;
      }
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      vscode.window.showInformationMessage(
        `Performance Score: ${report.score.overall}/100 — ${report.issues.length} issues found`
      );
    } catch {
      vscode.window.showErrorMessage('Could not read performance report.');
    }
  });

  const config = vscode.workspace.getConfiguration('nextOptimize');
  if (config.get('enableDiagnostics')) {
    const watcher = vscode.workspace.onDidSaveTextDocument(async (doc) => {
      if (doc.languageId === 'typescriptreact' || doc.languageId === 'typescript') {
        const folder = vscode.workspace.getWorkspaceFolder(doc.uri);
        if (folder) await updateDiagnostics(folder.uri.fsPath, collection);
      }
    });
    context.subscriptions.push(watcher);
  }

  context.subscriptions.push(analyzeCommand, showScoreCommand, collection);
}

async function updateDiagnostics(projectRoot: string, collection: vscode.DiagnosticCollection) {
  try {
    const reportPath = `${projectRoot}/next-optimize-report.json`;
    const fs = await import('fs');
    if (!fs.existsSync(reportPath)) return;

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const config = vscode.workspace.getConfiguration('nextOptimize');
    const minSeverity = config.get<string>('severity') || 'medium';
    const severityOrder = ['info', 'low', 'medium', 'high', 'critical'];
    const minIndex = severityOrder.indexOf(minSeverity);

    const diagnosticsByFile = new Map<string, vscode.Diagnostic[]>();

    for (const issue of report.issues) {
      if (!issue.file) continue;
      if (severityOrder.indexOf(issue.severity) < minIndex) continue;

      const fileUri = vscode.Uri.file(`${projectRoot}/${issue.file}`);
      const range = new vscode.Range(
        (issue.line || 1) - 1,
        0,
        (issue.line || 1) - 1,
        200
      );

      const severity =
        issue.severity === 'critical' || issue.severity === 'high'
          ? vscode.DiagnosticSeverity.Warning
          : vscode.DiagnosticSeverity.Information;

      const diagnostic = new vscode.Diagnostic(range, `${issue.title}: ${issue.description}`, severity);
      diagnostic.source = DIAGNOSTIC_SOURCE;
      if (issue.suggestion) {
        diagnostic.code = issue.suggestion;
      }

      const existing = diagnosticsByFile.get(fileUri.fsPath) || [];
      existing.push(diagnostic);
      diagnosticsByFile.set(fileUri.fsPath, existing);
    }

    for (const [filePath, diagnostics] of diagnosticsByFile) {
      collection.set(vscode.Uri.file(filePath), diagnostics);
    }
  } catch {
    // Silently fail — report may not exist yet
  }
}

export function deactivate() {}
