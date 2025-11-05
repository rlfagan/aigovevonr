/**
 * Configuration Manager
 * Manages extension settings and configuration
 */

import * as vscode from 'vscode';

export class ConfigManager {
    private readonly CONFIG_SECTION = 'aiGovernance';

    public isEnabled(): boolean {
        return this.getConfig<boolean>('enabled', true);
    }

    public setEnabled(enabled: boolean): void {
        this.setConfig('enabled', enabled);
    }

    public getApiUrl(): string {
        return this.getConfig<string>('apiUrl', 'http://localhost:8002');
    }

    public getUserEmail(): string {
        return this.getConfig<string>('userEmail', '');
    }

    public setUserEmail(email: string): void {
        this.setConfig('userEmail', email);
    }

    public getDepartment(): string {
        return this.getConfig<string>('department', '');
    }

    public shouldBlockOnDeny(): boolean {
        return this.getConfig<boolean>('blockOnDeny', true);
    }

    public shouldScanContent(): boolean {
        return this.getConfig<boolean>('scanContent', true);
    }

    public shouldNotifyOnViolation(): boolean {
        return this.getConfig<boolean>('notifyOnViolation', true);
    }

    public shouldLogViolations(): boolean {
        return this.getConfig<boolean>('logViolations', true);
    }

    public getCheckInterval(): number {
        return this.getConfig<number>('checkInterval', 60);
    }

    public isOfflineMode(): boolean {
        return this.getConfig<boolean>('offlineMode', false);
    }

    public getAuthToken(): string | undefined {
        // In production, this would read from secure storage
        return undefined;
    }

    private getConfig<T>(key: string, defaultValue: T): T {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get<T>(key, defaultValue);
    }

    private setConfig(key: string, value: any): void {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        config.update(key, value, vscode.ConfigurationTarget.Global);
    }
}
