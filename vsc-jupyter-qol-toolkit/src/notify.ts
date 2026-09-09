import * as vscode from 'vscode';
import { execFile } from 'child_process';
import * as os from 'os';

// Cell identity: each notebook cell has its own backing TextDocument with a
// stable URI (vscode-notebook-cell:...#<handle>) that survives reordering
// within a session. We key all our session state off that string.
function cellKey(cell: vscode.NotebookCell): string {
  return cell.document.uri.toString();
}

// Session-scoped only (not persisted to the .ipynb) — kept deliberately
// simple for v1. If you want it to survive a reload, the natural extension
// point is writing/reading a custom field in the cell's metadata via
// vscode.NotebookEdit.updateCellMetadata, but metadata round-tripping
// through the Jupyter extension's serializer wasn't verified here, so
// starting with in-memory state avoids silently-broken persistence.
const notifyEnabled = new Set<string>();
// Tracks the last-seen execution end-time per cell, so we can tell "just
// finished" apart from "this event fired for an unrelated reason" (e.g. an
// output being written mid-run also triggers onDidChangeNotebookDocument).
const lastEndTime = new Map<string, number>();

// ---------------------------------------------------------------------------
// Status bar item shown at the bottom of each code cell, reflecting current
// per-cell state and doubling as the toggle control.
// ---------------------------------------------------------------------------
class NotifyStatusBarProvider implements vscode.NotebookCellStatusBarItemProvider {
  provideCellStatusBarItems(
    cell: vscode.NotebookCell
  ): vscode.NotebookCellStatusBarItem | undefined {
    if (cell.kind !== vscode.NotebookCellKind.Code) return undefined;

    const enabled = notifyEnabled.has(cellKey(cell));
    const item = new vscode.NotebookCellStatusBarItem(
      enabled ? '$(bell) Notify: on' : '$(bell-dot) Notify: off',
      vscode.NotebookCellStatusBarAlignment.Right
    );
    item.command = {
      command: 'jupyterQol.toggleCellNotify',
      title: 'Toggle notify on completion',
      arguments: [cell],
    };
    item.tooltip = 'Toggle: play a sound / show a notification when this cell finishes running';
    return item;
  }
}

// ---------------------------------------------------------------------------
// Result classification. "success"/"error" are solid — success comes
// straight from executionSummary.success, an official field. "warning" is
// necessarily a heuristic (Jupyter has no distinct execution state for it):
// this treats "ran without raising, but wrote to stderr" as a warning —
// catches Python's warnings.warn() and most linters/loggers that use
// stderr, but isn't a guarantee it'll catch everything you'd personally
// call a warning.
// ---------------------------------------------------------------------------
export type ResultCategory = 'success' | 'warning' | 'error';

const ERROR_MIME = 'application/vnd.code.notebook.error';
const STDERR_MIME = 'application/vnd.code.notebook.stderr';

function classifyResult(cell: vscode.NotebookCell): ResultCategory {
  if (cell.executionSummary?.success === false) return 'error';

  const outputItems = cell.outputs.flatMap(o => o.items);
  if (outputItems.some(i => i.mime === ERROR_MIME)) return 'error';
  if (outputItems.some(i => i.mime === STDERR_MIME)) return 'warning';
  return 'success';
}

// ---------------------------------------------------------------------------
// OS notification + sound. Implemented via native OS commands rather than an
// npm dependency, so `npm install` stays dependency-free. Not exhaustively
// tested across OSes/distros — if a command below doesn't exist on your
// system, it fails silently (caught) rather than breaking the extension.
// ---------------------------------------------------------------------------
const MAC_SOUND: Record<ResultCategory, string> = {
  success: 'Glass',
  warning: 'Sosumi',
  error: 'Basso',
};
// Common freedesktop sound-theme paths — present on most desktop distros
// (GNOME/KDE default themes), but this varies enough across distros that
// a silent no-op fallback (rather than an error) is the right behavior.
const LINUX_SOUND: Record<ResultCategory, string> = {
  success: '/usr/share/sounds/freedesktop/stereo/complete.oga',
  warning: '/usr/share/sounds/freedesktop/stereo/dialog-warning.oga',
  error: '/usr/share/sounds/freedesktop/stereo/dialog-error.oga',
};
const WIN_SOUND: Record<ResultCategory, string> = {
  success: 'Asterisk',
  warning: 'Exclamation',
  error: 'Hand',
};
const ICON: Record<ResultCategory, string> = { success: '✅', warning: '⚠️', error: '❌' };
const LABEL: Record<ResultCategory, string> = { success: 'finished', warning: 'finished with warnings', error: 'raised an error' };

function notifyCompletion(cellLabel: string, category: ResultCategory) {
  const config = vscode.workspace.getConfiguration('jupyterQol');
  const wantSound = config.get<boolean>('playSound', true);
  const wantSystemNotification = config.get<boolean>('systemNotification', true);
  const message = `${cellLabel} ${LABEL[category]}`;

  const platform = os.platform();

  if (platform === 'darwin') {
    const script =
      `display notification "${message}" with title "Jupyter ${ICON[category]}"` +
      (wantSound ? ` sound name "${MAC_SOUND[category]}"` : '');
    if (wantSystemNotification || wantSound) {
      execFile('osascript', ['-e', script], () => {});
    }
  } else if (platform === 'linux') {
    if (wantSystemNotification) {
      execFile('notify-send', [`Jupyter ${ICON[category]}`, message], () => {});
    }
    if (wantSound) {
      execFile('paplay', [LINUX_SOUND[category]], () => {});
    }
  } else if (platform === 'win32') {
    if (wantSound) {
      execFile(
        'powershell',
        ['-Command', `[System.Media.SystemSounds]::${WIN_SOUND[category]}.Play()`],
        () => {}
      );
    }
    if (wantSystemNotification) {
      // Balloon tip via a throwaway NotifyIcon — no extra PS modules needed.
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms
        $n = New-Object System.Windows.Forms.NotifyIcon
        $n.Icon = [System.Drawing.SystemIcons]::Information
        $n.Visible = $true
        $n.ShowBalloonTip(4000, 'Jupyter ${ICON[category]}', '${message}', [System.Windows.Forms.ToolTipIcon]::Info)
        Start-Sleep -Seconds 5
        $n.Dispose()
      `;
      execFile('powershell', ['-Command', psScript], () => {});
    }
  }

  // Always also surface it inside VS Code itself, regardless of platform —
  // cheap, reliable fallback if the OS-level call above didn't fire.
  vscode.window.setStatusBarMessage(`${ICON[category]} ${message}`, 4000);
}

function cellLabel(cell: vscode.NotebookCell): string {
  const firstLine = cell.document.lineAt(0).text.trim();
  return firstLine.length > 40 ? firstLine.slice(0, 40) + '…' : firstLine || `cell ${cell.index + 1}`;
}

export function registerNotifyFeature(context: vscode.ExtensionContext) {
  const statusBarProvider = new NotifyStatusBarProvider();
  context.subscriptions.push(
    vscode.notebooks.registerNotebookCellStatusBarItemProvider('jupyter-notebook', statusBarProvider),

    vscode.commands.registerCommand('jupyterQol.toggleCellNotify', (cell?: vscode.NotebookCell) => {
      if (!cell) {
        // Triggered from the command palette with no cell context — no-op,
        // this command is meant to be invoked from the cell toolbar/status
        // bar where VS Code supplies the cell automatically.
        vscode.window.showInformationMessage(
          'Jupyter QOL: click the bell icon on a specific cell to toggle its notification.'
        );
        return;
      }
      const key = cellKey(cell);
      if (notifyEnabled.has(key)) notifyEnabled.delete(key);
      else notifyEnabled.add(key);
    }),

    // Stable API (unlike vscode.notebooks.onDidChangeNotebookCellExecutionState,
    // which is proposed-only and won't compile against @types/vscode).
    vscode.workspace.onDidChangeNotebookDocument(e => {
      for (const change of e.cellChanges) {
        const endTime = change.executionSummary?.timing?.endTime;
        if (endTime === undefined) continue;

        const key = change.cell.document.uri.toString();
        const previous = lastEndTime.get(key);
        if (previous === endTime) continue; // same completion we already handled

        lastEndTime.set(key, endTime);
        if (notifyEnabled.has(key)) {
          notifyCompletion(cellLabel(change.cell), classifyResult(change.cell));
        }
      }
    })
  );
}
