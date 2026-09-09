import * as vscode from 'vscode';

// Comment syntax deliberately scoped to Python + shell (both use '#' line
// comments, neither has a standard block-comment syntax).
const LINE_COMMENT = '#';

export const OPENERS: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
export const CLOSERS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

export interface BracketPair {
  openOffset: number;
  closeOffset: number;
  char: string;
}

// Shared scanner state machine used by every function below, so triple-quote
// handling (see note) only has to be gotten right once.
interface ScanState {
  inString: string | null;
  inTriple: boolean;
  tripleChar: string;
  inLineComment: boolean;
}

function newScanState(): ScanState {
  return { inString: null, inTriple: false, tripleChar: '', inLineComment: false };
}

// Advances the state machine by one character. Returns true if this
// character was "consumed" as part of string/comment handling and the
// caller should skip its normal bracket/comma logic for it.
function stepScanState(state: ScanState, text: string, i: number): boolean {
  const ch = text[i];

  if (state.inLineComment) {
    if (ch === '\n') state.inLineComment = false;
    return true;
  }
  if (state.inTriple) {
    if (ch === state.tripleChar && text[i + 1] === state.tripleChar && text[i + 2] === state.tripleChar) {
      state.inTriple = false;
    }
    return true;
  }
  if (state.inString) {
    if (ch === '\\') return true; // caller must additionally skip i+1; see callers
    if (ch === state.inString) state.inString = null;
    return true;
  }
  if (ch === '"' || ch === "'") {
    // Python triple-quoted string (common in docstrings) — without this,
    // a stray '#', bracket, or single quote inside a docstring would
    // desync the whole rest of the scan.
    if (text[i + 1] === ch && text[i + 2] === ch) {
      state.inTriple = true;
      state.tripleChar = ch;
    } else {
      state.inString = ch;
    }
    return true;
  }
  if (ch === LINE_COMMENT) {
    state.inLineComment = true;
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Tokenizer: walks the whole document once, tracking string/comment state,
// and returns every matched bracket pair. Brackets inside strings or
// comments are ignored, so they never confuse the matcher.
// ---------------------------------------------------------------------------
export function findBracketPairs(text: string): BracketPair[] {
  const pairs: BracketPair[] = [];
  const stack: { char: string; offset: number }[] = [];
  const state = newScanState();

  for (let i = 0; i < text.length; i++) {
    const wasEscape = state.inString && text[i] === '\\';
    if (stepScanState(state, text, i)) {
      if (wasEscape) i++; // skip the escaped character too
      continue;
    }

    const ch = text[i];
    if (ch in OPENERS) {
      stack.push({ char: ch, offset: i });
    } else if (ch in CLOSERS) {
      const top = stack[stack.length - 1];
      if (top && OPENERS[top.char] === ch) {
        stack.pop();
        pairs.push({ openOffset: top.offset, closeOffset: i, char: top.char });
      }
      // mismatched closer: ignore (malformed/partial code being edited)
    }
  }
  return pairs;
}

// Innermost bracket pair enclosing `offset`, optionally restricted to a
// specific bracket character (e.g. '(' for parens-only commands).
export function findInnermostEnclosing(
  pairs: BracketPair[],
  offset: number,
  onlyChar?: string
): BracketPair | undefined {
  let best: BracketPair | undefined;
  for (const p of pairs) {
    if (onlyChar && p.char !== onlyChar) continue;
    if (p.openOffset <= offset && offset <= p.closeOffset) {
      if (!best || (p.closeOffset - p.openOffset) < (best.closeOffset - best.openOffset)) {
        best = p;
      }
    }
  }
  return best;
}

// Splits the text *inside* a bracket pair on top-level commas only. Nested
// brackets, strings, and comments are respected and never split on.
export function splitTopLevelItems(text: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let start = 0;
  const state = newScanState();

  for (let i = 0; i < text.length; i++) {
    const wasEscape = state.inString && text[i] === '\\';
    if (stepScanState(state, text, i)) {
      if (wasEscape) i++;
      continue;
    }

    const ch = text[i];
    if (ch in OPENERS) { depth++; continue; }
    if (ch in CLOSERS) { depth--; continue; }
    if (ch === ',' && depth === 0) {
      items.push(text.slice(start, i));
      start = i + 1;
    }
  }
  items.push(text.slice(start));

  return items.map(s => s.trim()).filter(s => s.length > 0);
}

// Does this snippet contain a live (non-string) '#' comment?
export function containsComment(text: string): boolean {
  const state = newScanState();
  for (let i = 0; i < text.length; i++) {
    const wasEscape = state.inString && text[i] === '\\';
    if (stepScanState(state, text, i)) {
      if (state.inLineComment && text[i] === LINE_COMMENT) return true;
      if (wasEscape) i++;
      continue;
    }
  }
  return false;
}

// Scans forward from `startOffset` for the first top-level ':' (depth 0,
// outside strings/comments) — used to find the end of a Python function
// signature, e.g. spanning a multi-line parameter list and a return-type
// annotation, without matching a ':' inside a default value or docstring.
export function findTopLevelColon(text: string, startOffset: number): number | undefined {
  let depth = 0;
  const state = newScanState();

  for (let i = startOffset; i < text.length; i++) {
    const wasEscape = state.inString && text[i] === '\\';
    if (stepScanState(state, text, i)) {
      if (wasEscape) i++;
      continue;
    }

    const ch = text[i];
    if (ch in OPENERS) { depth++; continue; }
    if (ch in CLOSERS) { depth--; continue; }
    if (ch === ':' && depth === 0) return i;
  }
  return undefined;
}

export function getIndentUnit(editor: vscode.TextEditor): string {
  const { tabSize, insertSpaces } = editor.options;
  const size = typeof tabSize === 'number' ? tabSize : 4;
  return insertSpaces ? ' '.repeat(size) : '\t';
}

export function getLineIndent(document: vscode.TextDocument, lineNumber: number): string {
  const line = document.lineAt(lineNumber);
  return line.text.slice(0, line.firstNonWhitespaceCharacterIndex);
}
