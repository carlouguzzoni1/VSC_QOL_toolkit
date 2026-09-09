import * as vscode from 'vscode';
import {
  BracketPair,
  findBracketPairs,
  findInnermostEnclosing,
  splitTopLevelItems,
  containsComment,
  getIndentUnit,
  getLineIndent,
} from './bracketUtils';
import { registerSelectFunctionCommands } from './selectFunction';
import { registerSignatureCommands } from './signature';
import { registerInsideBracketsCommands } from './insideBrackets';
import { registerDebugPrintCommand } from './debugPrint';
import { registerTimingWrapperCommand } from './timingWrapper';
import { registerJumpCommands } from './jumpFunctions';

// ---------------------------------------------------------------------------
// Toggle expand/collapse of the bracket pair under the cursor.
// ---------------------------------------------------------------------------
async function toggleAtCursor(editor: vscode.TextEditor) {
  const document = editor.document;
  const cursorOffset = document.offsetAt(editor.selection.active);
  const fullText = document.getText();

  const pairs = findBracketPairs(fullText);
  const pair = findInnermostEnclosing(pairs, cursorOffset);

  if (!pair) {
    vscode.window.showInformationMessage('Bracket Collapse: no enclosing (), [] or {} found at the cursor.');
    return;
  }

  const innerText = fullText.slice(pair.openOffset + 1, pair.closeOffset);
  const isMultiline = innerText.includes('\n');

  if (isMultiline) {
    await collapse(editor, pair, innerText);
  } else {
    await expand(editor, pair, innerText);
  }
}

async function expand(editor: vscode.TextEditor, pair: BracketPair, innerText: string) {
  const document = editor.document;
  const items = splitTopLevelItems(innerText);

  if (items.length === 0) {
    vscode.window.showInformationMessage('Bracket Collapse: nothing to expand — brackets are empty.');
    return;
  }

  const config = vscode.workspace.getConfiguration('bracketCollapse');
  const wantTrailingComma = config.get<boolean>('trailingComma', true);

  const openPos = document.positionAt(pair.openOffset);
  const baseIndent = getLineIndent(document, openPos.line);
  const indentUnit = getIndentUnit(editor);
  const itemIndent = baseIndent + indentUnit;

  const body = items
    .map((item, idx) => {
      const isLast = idx === items.length - 1;
      const comma = isLast ? (wantTrailingComma ? ',' : '') : ',';
      return itemIndent + item + comma;
    })
    .join('\n');

  const newInner = '\n' + body + '\n' + baseIndent;

  await editor.edit(editBuilder => {
    const start = document.positionAt(pair.openOffset + 1);
    const end = document.positionAt(pair.closeOffset);
    editBuilder.replace(new vscode.Range(start, end), newInner);
  });
}

async function collapse(editor: vscode.TextEditor, pair: BracketPair, innerText: string) {
  const document = editor.document;
  const items = splitTopLevelItems(innerText);

  for (const item of items) {
    if (item.includes('\n')) {
      vscode.window.showWarningMessage(
        'Bracket Collapse: an item still contains a nested expanded block. Collapse the innermost levels first.'
      );
      return;
    }
    if (containsComment(item)) {
      vscode.window.showWarningMessage(
        'Bracket Collapse: cannot collapse — one or more items contain a comment. Remove or relocate the comment first.'
      );
      return;
    }
  }

  const newInner = items.join(', ');

  await editor.edit(editBuilder => {
    const start = document.positionAt(pair.openOffset + 1);
    const end = document.positionAt(pair.closeOffset);
    editBuilder.replace(new vscode.Range(start, end), newInner);
  });
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('bracketCollapse.toggle', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      toggleAtCursor(editor);
    })
  );

  registerSelectFunctionCommands(context);
  registerSignatureCommands(context);
  registerInsideBracketsCommands(context);
  registerDebugPrintCommand(context);
  registerTimingWrapperCommand(context);
  registerJumpCommands(context);
}

export function deactivate() {}
