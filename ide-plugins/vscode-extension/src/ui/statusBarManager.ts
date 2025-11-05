/**
 * Status Bar Manager
 * Manages the status bar indicator for AI Governance Shield
 */

import * as vscode from 'vscode';

export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'ai-governance.checkPolicy';
        this.statusBarItem.show();
    }

    public update(isEnabled: boolean, status: string) {
        if (isEnabled) {
            if (status.includes('Warning') || status.includes('Denied')) {
                this.statusBarItem.text = '$(shield) ⚠️ AI Gov';
                this.statusBarItem.backgroundColor = new vscode.ThemeColor(
                    'statusBarItem.warningBackground'
                );
                this.statusBarItem.tooltip = `AI Governance Shield: ${status}`;
            } else if (status.includes('Active') || status.includes('Protected')) {
                this.statusBarItem.text = '$(shield) AI Gov';
                this.statusBarItem.backgroundColor = undefined;
                this.statusBarItem.tooltip = `AI Governance Shield: ${status}`;
            } else {
                this.statusBarItem.text = '$(shield) AI Gov';
                this.statusBarItem.backgroundColor = undefined;
                this.statusBarItem.tooltip = `AI Governance Shield: ${status}`;
            }
        } else {
            this.statusBarItem.text = '$(shield) $(x) AI Gov';
            this.statusBarItem.backgroundColor = new vscode.ThemeColor(
                'statusBarItem.errorBackground'
            );
            this.statusBarItem.tooltip = 'AI Governance Shield: Disabled';
        }
    }

    public dispose() {
        this.statusBarItem.dispose();
    }
}
