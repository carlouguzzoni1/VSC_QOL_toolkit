# VSC Python QOL Toolkit

Quality-of-life commands for Python / shell-script editing. Scoped to those
two languages on purpose, per your call to keep this simple rather than
generalizing to everything up front.

## Commands & default shortcuts

| Command | Win/Linux | Mac | Right-click menu? |
|---|---|---|---|
| Toggle Expand/Collapse (args / data structure) | `Ctrl+Alt+9` | `Cmd+Alt+9` | ✅ |
| Select Inside Brackets | `Ctrl+Alt+B` | `Cmd+Alt+B` | ✅ (no selection) |
| Copy Inside Brackets | `Ctrl+Alt+Shift+B` | `Cmd+Alt+Shift+B` | ✅ (no selection) |
| Cut Inside Brackets | `Ctrl+Alt+Shift+X` | `Cmd+Alt+Shift+X` | ✅ (no selection) |
| Select Enclosing Function | `Ctrl+Alt+F` | `Cmd+Alt+F` | ✅ (no selection) |
| Copy Enclosing Function | `Ctrl+Alt+C` | `Cmd+Alt+C` | ✅ (no selection) |
| Cut Enclosing Function | `Ctrl+Alt+X` | `Cmd+Alt+X` | ✅ (no selection) |
| Select Function Signature | `Ctrl+Alt+Shift+F` | `Cmd+Alt+Shift+F` | ✅ (no selection, Python only) |
| Copy Function Signature | `Ctrl+Alt+Shift+C` | `Cmd+Alt+Shift+C` | ✅ (no selection, Python only) |
| Toggle Debug Print for Variable | `Ctrl+Alt+D` | `Cmd+Alt+D` | ✅ (no selection, Python only) |
| Toggle Timing Wrapper for Call | `Ctrl+Alt+T` | `Cmd+Alt+T` | ✅ (no selection, Python only) |
| Jump to Next Function/Class | `Ctrl+Alt+Down` | `Cmd+Alt+Down` | — |
| Jump to Previous Function/Class | `Ctrl+Alt+Up` | `Cmd+Alt+Up` | — |

All the "no selection" ones only show up in the right-click menu when you
have no text selected, so they don't clutter the menu on top of an
ordinary copy/cut of a manual selection.

## What each new one does

- **Select/Copy/Cut Inside Brackets** — put your cursor inside any `()`,
  `[]`, or `{}` and grab just the contents, not the brackets themselves.
  Same nesting-aware matcher as bracket collapse (innermost pair wins).
- **Select/Copy Function Signature** — grabs from `def` through the closing
  `:`, including a multi-line parameter list and a `-> ReturnType` if
  present, but stops before the body/docstring. Python-specific by nature.
- **Toggle Debug Print for Variable** — cursor on a variable, run the
  command: inserts `print(f"DEBUG: x = {x!r}")` right below, tagged with a
  marker comment. Running it again *on the same variable* removes that
  exact line. It only recognizes its own tagged lines, so hand-written
  prints are left alone.
- **Toggle Timing Wrapper for Call** — cursor on a line with a function
  call, run the command: wraps it with a `time.perf_counter()` start/print,
  adding `import time` at the top of the file if it's missing. Toggling
  again removes the wrapper. **Scoped to single-line calls** — if the call's
  arguments are already spread across multiple lines (e.g. via bracket
  collapse), collapse it first, time it, then re-expand if you want.
- **Jump to Next/Previous Function/Class** — cursor jumps straight to the
  next/previous definition in the file, wrapping around at the top/bottom.
  Same symbol data as the function-select commands, so it respects nesting.

## Setup

```bash
cd vsc-python-qol-toolkit
npm install
npm run compile
```

This time the whole thing was actually compiled (`tsc`, no errors) before
being handed to you — not just written and assumed correct, unlike the
first pass. Press **F5** for an Extension Development Host, or `vsce
package` + `code --install-extension *.vsix` to install it for real —
same process as before, nothing changed there.

## Known rough edges

- Debug-print and timing-wrapper toggling only recognize lines *they*
  inserted (matched by an internal marker comment) — they won't detect or
  remove a print/timer you wrote by hand.
- Timing wrapper only handles calls that fit on one line.
- Bracket/signature scanning now correctly skips over Python triple-quoted
  strings (`"""..."""`/`'''...'''`), so a stray `#`, quote, or bracket
  inside a docstring won't desync the matcher — this was a latent gap in
  the very first version of bracket-collapse that got fixed along the way.
