import * as vscode from 'vscode';

// v1 scope: single-line calls only. A call whose arguments span multiple
// lines (already-expanded via bracketCollapse.toggle, for instance) isn't
// detected — collapse it to one line first, time it, then re-expand if
// you want.
const START_MARKER = '# pyQol-timing-start';
const END_MARKER = '# pyQol-timing-end';
const TIMER_VAR = '__pyqol_t0';

function hasTimeImport(document: vscode.TextDocument): boolean {
  const scanLines = Math.min(document.lineCount, 50);
  for (let i = 0; i < scanLines; i++) {
    if (/^\s*import\s+time\b/.test(document.lineAt(i).text)) return true;
  }
  return false;
}

export function registerTimingWrapperCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('pyQol.toggleTimingWrapper', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const document = editor.document;
      const lineNum = editor.selection.active.line;
      const line = document.lineAt(lineNum);
      const indent = line.text.slice(0, line.firstNonWhitespaceCharacterIndex);

      // Toggle off: already wrapped by us?
      const prevLineText = lineNum > 0 ? document.lineAt(lineNum - 1).text : '';
      const nextLineText = lineNum + 1 < document.lineCount ? document.lineAt(lineNum + 1).text : '';
      if (prevLineText.includes(START_MARKER) && nextLineText.includes(END_MARKER)) {
        await editor.edit(editBuilder => {
          editBuilder.delete(new vscode.Range(lineNum + 1, 0, lineNum + 2, 0));
          editBuilder.delete(new vscode.Range(lineNum - 1, 0, lineNum, 0));
        });
        return;
      }

      const callMatch = /([A-Za-z_][A-Za-z0-9_.]*)\s*\(/.exec(line.text);
      if (!callMatch) {
        vscode.window.showInformationMessage(
          'VSC Toolkit: no function call recognized on this line.'
        );
        return;
      }
      const label = callMatch[1];

      const startLine = `${indent}${TIMER_VAR} = time.perf_counter()  ${START_MARKER}\n`;
      const endLine = `${indent}print(f"${label} took {time.perf_counter() - ${TIMER_VAR}:.4f}s")  ${END_MARKER}\n`;

      await editor.edit(editBuilder => {
        editBuilder.insert(new vscode.Position(lineNum + 1, 0), endLine);
        editBuilder.insert(new vscode.Position(lineNum, 0), startLine);
      });

      if (!hasTimeImport(document)) {
        await editor.edit(editBuilder => {
          editBuilder.insert(new vscode.Position(0, 0), 'import time\n');
        });
        vscode.window.setStatusBarMessage('VSC Toolkit: added "import time" at the top of the file.', 3000);
      }
    })
  );
}
