import * as vscode from 'vscode';
import { findEnclosingFunctionSymbol } from './selectFunction';
import { findTopLevelColon } from './bracketUtils';

const NO_SIGNATURE_MSG =
  'VSC Toolkit: no enclosing function found here (make sure the language server has finished loading).';

async function getSignatureRange(editor: vscode.TextEditor): Promise<vscode.Range | undefined> {
  const document = editor.document;
  const symbol = await findEnclosingFunctionSymbol(document, editor.selection.active);
  if (!symbol) return undefined;

  const startOffset = document.offsetAt(symbol.range.start);
  const colonOffset = findTopLevelColon(document.getText(), startOffset);
  if (colonOffset === undefined) return undefined;

  return new vscode.Range(document.positionAt(startOffset), document.positionAt(colonOffset + 1));
}

export function registerSignatureCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('pyQol.selectSignature', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const range = await getSignatureRange(editor);
      if (!range) {
        vscode.window.showInformationMessage(NO_SIGNATURE_MSG);
        return;
      }
      editor.selection = new vscode.Selection(range.start, range.end);
      editor.revealRange(range);
    }),

    vscode.commands.registerCommand('pyQol.copySignature', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const range = await getSignatureRange(editor);
      if (!range) {
        vscode.window.showInformationMessage(NO_SIGNATURE_MSG);
        return;
      }
      await vscode.env.clipboard.writeText(editor.document.getText(range));
      editor.selection = new vscode.Selection(range.start, range.end);
      vscode.window.setStatusBarMessage('VSC Toolkit: signature copied.', 2000);
    })
  );
}
