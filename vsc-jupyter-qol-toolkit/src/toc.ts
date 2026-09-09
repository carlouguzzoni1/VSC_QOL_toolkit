import * as vscode from 'vscode';

interface HeadingEntry {
  cell: vscode.NotebookCell;
  level: number;
  text: string;
}

function headingLevel(cell: vscode.NotebookCell): number | undefined {
  if (cell.kind !== vscode.NotebookCellKind.Markup) return undefined;
  const text = cell.document.getText();
  const firstLine = text.split('\n').find(l => l.trim().length > 0);
  if (!firstLine) return undefined;
  const match = /^(#{1,6})\s+(.*)$/.exec(firstLine.trim());
  return match ? match[1].length : undefined;
}

function headingText(cell: vscode.NotebookCell): string {
  const firstLine = cell.document.getText().split('\n').find(l => l.trim().length > 0) ?? '';
  return firstLine.replace(/^#{1,6}\s+/, '').trim();
}

function collectHeadings(notebook: vscode.NotebookDocument): HeadingEntry[] {
  const entries: HeadingEntry[] = [];
  for (const cell of notebook.getCells()) {
    const level = headingLevel(cell);
    if (level === undefined) continue;
    entries.push({ cell, level, text: headingText(cell) });
  }
  return entries;
}

export function registerTocCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('jupyterQol.showToc', async () => {
      const editor = vscode.window.activeNotebookEditor;
      if (!editor) {
        vscode.window.showInformationMessage('Jupyter QOL: open a notebook first.');
        return;
      }

      const headings = collectHeadings(editor.notebook);
      if (headings.length === 0) {
        vscode.window.showInformationMessage('Jupyter QOL: no markdown headings found in this notebook.');
        return;
      }

      const items = headings.map(h => ({
        label: '#'.repeat(h.level) + ' ' + (h.text || '(untitled heading)'),
        description: '  '.repeat(h.level - 1) + `cell ${h.cell.index + 1}`,
        entry: h,
      }));

      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: 'Jump to a section…',
        matchOnDescription: false,
      });
      if (!picked) return;

      const range = new vscode.NotebookRange(picked.entry.cell.index, picked.entry.cell.index + 1);
      editor.selections = [range];
      editor.revealRange(range, vscode.NotebookEditorRevealType.AtTop);
    })
  );
}
