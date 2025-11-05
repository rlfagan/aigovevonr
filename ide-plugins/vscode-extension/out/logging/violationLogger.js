"use strict";
/**
 * Violation Logger
 * Logs policy violations to the Decision API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViolationLogger = void 0;
class ViolationLogger {
    constructor(policyClient) {
        this.policyClient = policyClient;
        this.pendingViolations = [];
        this.isSyncing = false;
        // Attempt to sync every 30 seconds
        setInterval(() => this.syncViolations(), 30000);
    }
    async logViolation(violation) {
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
        }
        catch (error) {
            console.error('Error logging violation:', error);
            // Store for later sync
            this.pendingViolations.push(violation);
        }
    }
    async syncViolations() {
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
        }
        catch (error) {
            console.error('Error syncing violations:', error);
            // Re-add violations if sync failed
            // this.pendingViolations.push(...violations);
        }
        finally {
            this.isSyncing = false;
        }
    }
    getPendingCount() {
        return this.pendingViolations.length;
    }
}
exports.ViolationLogger = ViolationLogger;
//# sourceMappingURL=violationLogger.js.map