/**
 * Violation Logger
 * Logs policy violations to the Decision API
 */

import { PolicyClient } from '../clients/policyClient';

export interface Violation {
    type: string;
    severity?: string;
    fileName?: string;
    service?: string;
    toolName?: string;
    extensionId?: string;
    details?: any;
    timestamp: string;
}

export class ViolationLogger {
    private pendingViolations: Violation[] = [];
    private isSyncing = false;

    constructor(private policyClient: PolicyClient) {
        // Attempt to sync every 30 seconds
        setInterval(() => this.syncViolations(), 30000);
    }

    public async logViolation(violation: Violation): Promise<void> {
        try {
            await this.policyClient.logViolation({
                type: violation.type,
                service: violation.service,
                toolName: violation.toolName,
                extensionId: violation.extensionId,
                severity: violation.severity,
                fileName: violation.fileName,
                details: violation.details,
                timestamp: violation.timestamp
            });

            console.log('Violation logged:', violation.type);
        } catch (error) {
            console.error('Error logging violation:', error);
            // Store for later sync
            this.pendingViolations.push(violation);
        }
    }

    private async syncViolations(): Promise<void> {
        if (this.isSyncing || this.pendingViolations.length === 0) {
            return;
        }

        this.isSyncing = true;

        try {
            const violations = [...this.pendingViolations];
            this.pendingViolations = [];

            for (const violation of violations) {
                await this.policyClient.logViolation({
                    type: violation.type,
                    service: violation.service,
                    toolName: violation.toolName,
                    extensionId: violation.extensionId,
                    severity: violation.severity,
                    fileName: violation.fileName,
                    details: violation.details,
                    timestamp: violation.timestamp
                });
            }

            console.log(`Synced ${violations.length} pending violations`);
        } catch (error) {
            console.error('Error syncing violations:', error);
            // Re-add violations if sync failed
            // this.pendingViolations.push(...violations);
        } finally {
            this.isSyncing = false;
        }
    }

    public getPendingCount(): number {
        return this.pendingViolations.length;
    }
}
