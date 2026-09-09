import * as vscode from 'vscode';

// vscode.executeDocumentSymbolProvider delegates to whatever language server
// is already active for the file (e.g. Pylance for Python) — so this needs
// no custom parsing, and stays correct even as your code changes.
const FUNCTION_KINDS = [
  vscode.SymbolKind.Function,
  vscode.SymbolKind.Method,
  vscode.SymbolKind.Constructor,
];

export async function findEnclosingFunctionSymbol(
  document: vscode.TextDocument,
  position: vscode.Position
): Promise<vscode.DocumentSymbol | undefined> {
  const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
    'vscode.executeDocumentSymbolProvider',
    document.uri
  );
  if (!symbols || symbols.length === 0) return undefined;

  function search(list: vscode.DocumentSymbol[]): vscode.DocumentSymbol | undefined {
    let found: vscode.DocumentSymbol | undefined;
    for (const sym of list) {
      if (sym.range.contains(position)) {
        // Descend first — for a nested function/method we want the
        // innermost match, not the outer class/function.
        const child = sym.children?.length ? search(sym.children) : undefined;
        if (child) found = child;
        else if (FUNCTION_KINDS.includes(sym.kind)) found = sym;
      }
    }
    return found;
  }

  return search(symbols);
}

async function getFunctionRangeAtCursor(
  editor: vscode.TextEditor
): Promise<vscode.Range | undefined> {
  const symbol = await findEnclosingFunctionSymbol(editor.document, editor.selection.active);
  return symbol?.range;
}

const NO_FUNCTION_MSG =
  'VSC Toolkit: no enclosing function found here (the language server for this file may not report symbols yet — for Python, make sure Pylance has finished loading).';

export function registerSelectFunctionCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'vscToolkit.selectFunction',
      async (_cell?: unknown) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        const range = await getFunctionRangeAtCursor(editor);
        if (!range) {
          vscode.window.showInformationMessage(NO_FUNCTION_MSG);
          return;
        }
        editor.selection = new vscode.Selection(range.start, range.end);
        editor.revealRange(range);
      }
    ),

    vscode.commands.registerCommand('vscToolkit.copyFunction', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const range = await getFunctionRangeAtCursor(editor);
      if (!range) {
        vscode.window.showInformationMessage(NO_FUNCTION_MSG);
        return;
      }
      const text = editor.document.getText(range);
      await vscode.env.clipboard.writeText(text);
      editor.selection = new vscode.Selection(range.start, range.end);
      vscode.window.setStatusBarMessage('VSC Toolkit: function copied to clipboard.', 2000);
    }),

    vscode.commands.registerCommand('vscToolkit.cutFunction', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const document = editor.document;
      const range = await getFunctionRangeAtCursor(editor);
      if (!range) {
        vscode.window.showInformationMessage(NO_FUNCTION_MSG);
        return;
      }
      const text = document.getText(range);
      await vscode.env.clipboard.writeText(text);

      // Swallow one trailing blank line too, so cutting doesn't leave a
      // double gap where the function used to be.
      let end = range.end;
      const nextLine = end.line + 1;
      if (nextLine < document.lineCount && document.lineAt(nextLine).isEmptyOrWhitespace) {
        end = new vscode.Position(nextLine + 1, 0);
      }
      const deleteRange = new vscode.Range(range.start, end);

      await editor.edit(editBuilder => editBuilder.delete(deleteRange));
      vscode.window.setStatusBarMessage('VSC Toolkit: function cut to clipboard.', 2000);
    })
  );
}
