import * as vscode from 'vscode';
import { findBracketPairs, findInnermostEnclosing } from './bracketUtils';

const NO_BRACKETS_MSG = 'VSC Toolkit: no enclosing (), [] or {} found at the cursor.';

function getInnerRange(editor: vscode.TextEditor): vscode.Range | undefined {
  const document = editor.document;
  const offset = document.offsetAt(editor.selection.active);
  const pairs = findBracketPairs(document.getText());
  const pair = findInnermostEnclosing(pairs, offset);
  if (!pair) return undefined;
  return new vscode.Range(document.positionAt(pair.openOffset + 1), document.positionAt(pair.closeOffset));
}

export function registerInsideBracketsCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('vscToolkit.selectInsideBrackets', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const range = getInnerRange(editor);
      if (!range) {
        vscode.window.showInformationMessage(NO_BRACKETS_MSG);
        return;
      }
      editor.selection = new vscode.Selection(range.start, range.end);
      editor.revealRange(range);
    }),

    vscode.commands.registerCommand('vscToolkit.copyInsideBrackets', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const range = getInnerRange(editor);
      if (!range) {
        vscode.window.showInformationMessage(NO_BRACKETS_MSG);
        return;
      }
      await vscode.env.clipboard.writeText(editor.document.getText(range));
      editor.selection = new vscode.Selection(range.start, range.end);
      vscode.window.setStatusBarMessage('VSC Toolkit: bracket contents copied.', 2000);
    }),

    vscode.commands.registerCommand('vscToolkit.cutInsideBrackets', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const range = getInnerRange(editor);
      if (!range) {
        vscode.window.showInformationMessage(NO_BRACKETS_MSG);
        return;
      }
      await vscode.env.clipboard.writeText(editor.document.getText(range));
      await editor.edit(editBuilder => editBuilder.delete(range));
      vscode.window.setStatusBarMessage('VSC Toolkit: bracket contents cut.', 2000);
    })
  );
}
