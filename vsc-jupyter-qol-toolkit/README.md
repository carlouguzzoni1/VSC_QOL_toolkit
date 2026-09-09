# Jupyter QOL Toolkit

**Note:** the previous version's "collapse/expand all markdown sections"
feature has been removed, per your call that it wasn't achieving the effect
you actually wanted. The table-of-contents pop-up below is the replacement
approach for navigating long notebooks.

## 1. Notify on cell completion (now with result-aware sounds)

A bell icon in each code cell's toolbar + a matching status item at the
bottom of the cell — click either to toggle. Off by default. When a
notify-enabled cell finishes, you get a sound, an OS notification, and a
VS Code status-bar message, and now the sound/notification differ by
outcome:

- ✅ **success** — cell finished with no error and nothing on stderr
- ⚠️ **warning** — cell finished without raising, but wrote to stderr
  (catches `warnings.warn()`, most loggers) — this one's a heuristic;
  Jupyter has no distinct "warning" execution state, so this is an
  approximation, not a guarantee
- ❌ **error** — cell raised an exception

Toggle each independently: `jupyterQol.playSound` /
`jupyterQol.systemNotification` in settings.

**Same caveats as before:** toggle state is session-only (not saved into
the `.ipynb`), and the OS-level sound/notification calls (`osascript` /
`notify-send` + `paplay` / PowerShell) are implemented via shelling out to
native tools, so reliability depends on what's actually present on your
system — Linux sound-theme paths especially vary by distro.

## 2. Table of contents pop-up

`Ctrl+Alt+T` (`Cmd+Alt+T` on Mac) with a notebook focused, or
`Jupyter QOL: Show Table of Contents` from the Command Palette. Shows every
markdown heading in the notebook, indented by nesting level, in a
searchable quick-pick list — pick one and it jumps straight there.

## Setup

```bash
cd vsc-jupyter-qol-toolkit
npm install
npm run compile
```

This version was actually compiled end-to-end before being handed to you.
Press **F5** for an Extension Development Host with a notebook open, or
package with `vsce package` + `code --install-extension *.vsix`.

## Note on the shortcut overlap with the Python toolkit

`Ctrl+Alt+T` here (table of contents) and `Ctrl+Alt+T` in the Python
toolkit (timing wrapper) use the same keys, but their `when` clauses are
mutually exclusive — `notebookEditorFocused` here vs. `editorTextFocus`
there — so they can't actually fire against each other. Flagging it so
it's not a surprise if you look at the keybindings list, not because it's
actually broken.
