import * as vscode from 'vscode';
import { registerNotifyFeature } from './notify';
import { registerTocCommand } from './toc';

export function activate(context: vscode.ExtensionContext) {
  registerNotifyFeature(context);
  registerTocCommand(context);
}

export function deactivate() {}
