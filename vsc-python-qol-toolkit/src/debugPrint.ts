import * as vscode from 'vscode';

// Tag every line this command inserts, so toggling off means "find and
// remove the line with this exact tag" rather than guessing.
const MARKER = '# pyQol-debug';

export function registerDebugPrintCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('pyQol.toggleDebugPrint', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const document = editor.document;
      const position = editor.selection.active;

      const wordRange = document.getWordRangeAtPosition(position);
      if (!wordRange) {
        vscode.window.showInformationMessage('VSC Toolkit: no variable under the cursor.');
        return;
      }
      const varName = document.getText(wordRange);
      const line = document.lineAt(position.line);
      const indent = line.text.slice(0, line.firstNonWhitespaceCharacterIndex);
      const nextLineNum = position.line + 1;

      // Toggle off: the line right below is a debug print we previously
      // inserted for this same variable.
      if (nextLineNum < document.lineCount) {
        const nextLineText = document.lineAt(nextLineNum).text;
        if (nextLineText.includes(MARKER) && nextLineText.includes(`{${varName}!r}`)) {
          await editor.edit(editBuilder => {
            editBuilder.delete(new vscode.Range(nextLineNum, 0, nextLineNum + 1, 0));
          });
          return;
        }
      }

      const printStatement = `${indent}print(f"DEBUG: ${varName} = {${varName}!r}")  ${MARKER}`;

      await editor.edit(editBuilder => {
        if (nextLineNum < document.lineCount) {
          editBuilder.insert(new vscode.Position(nextLineNum, 0), printStatement + '\n');
        } else {
          // Cursor was on the last line — there's no line below to insert
          // at, so append after the end of the current one instead.
          editBuilder.insert(line.range.end, '\n' + printStatement);
        }
      });
    })
  );
}
