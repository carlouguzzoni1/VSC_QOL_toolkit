import * as vscode from 'vscode';

const NAV_KINDS = [
  vscode.SymbolKind.Function,
  vscode.SymbolKind.Method,
  vscode.SymbolKind.Constructor,
  vscode.SymbolKind.Class,
];

async function flattenNavigableSymbols(document: vscode.TextDocument): Promise<vscode.DocumentSymbol[]> {
  const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
    'vscode.executeDocumentSymbolProvider',
    document.uri
  );
  if (!symbols) return [];

  const out: vscode.DocumentSymbol[] = [];
  function walk(list: vscode.DocumentSymbol[]) {
    for (const sym of list) {
      if (NAV_KINDS.includes(sym.kind)) out.push(sym);
      if (sym.children?.length) walk(sym.children);
    }
  }
  walk(symbols);
  out.sort((a, b) => a.selectionRange.start.compareTo(b.selectionRange.start));
  return out;
}

async function jump(direction: 1 | -1) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const symbols = await flattenNavigableSymbols(editor.document);
  if (symbols.length === 0) {
    vscode.window.showInformationMessage('VSC Toolkit: no functions/classes found in this file.');
    return;
  }

  const cursor = editor.selection.active;
  let target: vscode.DocumentSymbol | undefined;

  if (direction === 1) {
    target = symbols.find(s => s.selectionRange.start.isAfter(cursor));
    if (!target) target = symbols[0]; // wrap to the top
  } else {
    const before = symbols.filter(s => s.selectionRange.start.isBefore(cursor));
    target = before.length ? before[before.length - 1] : symbols[symbols.length - 1]; // wrap to the bottom
  }

  const pos = target.selectionRange.start;
  editor.selection = new vscode.Selection(pos, pos);
  editor.revealRange(target.range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
}

export function registerJumpCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('vscToolkit.jumpToNextFunction', () => jump(1)),
    vscode.commands.registerCommand('vscToolkit.jumpToPreviousFunction', () => jump(-1))
  );
}
