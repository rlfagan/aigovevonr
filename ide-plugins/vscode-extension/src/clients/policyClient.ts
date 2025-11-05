/**
 * Policy Client
 * Communicates with the AI Governance Decision API
 */

import axios, { AxiosInstance } from 'axios';
import { ConfigManager } from '../config/configManager';

export interface PolicyDecision {
    decision_id: string;
    decision: 'ALLOW' | 'DENY' | 'REVIEW';
    reason: string;
    risk_score: number;
    cached: boolean;
}

export interface EvaluateRequest {
    resource_url: string;
    action: string;
    resource_type: string;
    service?: string;
    content?: string;
}

export interface ActivePolicy {
    policy_name: string;
    policy_file: string;
    activated_at: string;
    activated_by: string;
}

export interface OverrideRequest {
    userEmail: string;
    service: string;
    reason: string;
    timestamp: string;
}

export interface ViolationLog {
    type: string;
    service?: string;
    toolName?: string;
    extensionId?: string;
    severity?: string;
    fileName?: string;
    details?: any;
    timestamp: string;
}

export class PolicyClient {
    private client: AxiosInstance;
    private cachedPolicy: ActivePolicy | null = null;
    private cacheExpiry: number = 0;
    private readonly CACHE_DURATION = 300000; // 5 minutes

    constructor(private config: ConfigManager) {
        const apiUrl = config.getApiUrl();

        this.client = axios.create({
            baseURL: apiUrl,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Add request interceptor for auth (if needed)
        this.client.interceptors.request.use((config) => {
            // Add auth token if available
            const token = this.config.getAuthToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });

        // Add response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                console.error('API Error:', error);

                if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                    // API is offline - handle offline mode
                    if (!this.config.isOfflineMode()) {
                        console.warn('Decision API unavailable - enabling offline mode');
                    }
                }

                throw error;
            }
        );
    }

    /**
     * Evaluate access to an AI service
     */
    public async evaluateAccess(request: EvaluateRequest): Promise<PolicyDecision> {
        try {
            const userEmail = this.config.getUserEmail();
            const department = this.config.getDepartment();

            const evaluatePayload = {
                user: {
                    email: userEmail,
                    department: department,
                    training_completed: true
                },
                action: request.action,
                resource: {
                    type: request.resource_type,
                    url: request.resource_url,
                    service: request.service
                },
                content: request.content,
                context: {
                    source: 'vscode_extension',
                    editor: 'vscode',
                    timestamp: new Date().toISOString()
                }
            };

            const response = await this.client.post('/evaluate', evaluatePayload);

            return response.data as PolicyDecision;
        } catch (error) {
            console.error('Error evaluating policy:', error);

            // Offline mode - use cached policy or default deny
            if (this.config.isOfflineMode() || this.isOfflineError(error)) {
                return this.getOfflineDecision(request);
            }

            // Default deny on error
            return {
                decision_id: 'error',
                decision: 'DENY',
                reason: 'Policy check failed - default deny',
                risk_score: 100,
                cached: false
            };
        }
    }

    /**
     * Get currently active policy
     */
    public async getActivePolicy(): Promise<ActivePolicy | null> {
        try {
            // Return cached policy if still valid
            if (this.cachedPolicy && Date.now() < this.cacheExpiry) {
                return this.cachedPolicy;
            }

            const response = await this.client.get('/api/policy/active');

            if (response.data && response.data.config) {
                this.cachedPolicy = response.data.config;
                this.cacheExpiry = Date.now() + this.CACHE_DURATION;
                return this.cachedPolicy;
            }

            return null;
        } catch (error) {
            console.error('Error fetching active policy:', error);
            // Return cached policy if available
            return this.cachedPolicy;
        }
    }

    /**
     * Log a violation to the Decision API
     */
    public async logViolation(violation: ViolationLog): Promise<void> {
        try {
            const userEmail = this.config.getUserEmail();
            const department = this.config.getDepartment();

            const logPayload = {
                user_email: userEmail,
                department: department,
                violation_type: violation.type,
                service: violation.service,
                severity: violation.severity || 'MEDIUM',
                details: {
                    ...violation,
                    source: 'vscode_extension'
                },
                timestamp: violation.timestamp
            };

            await this.client.post('/api/violations/log', logPayload);
        } catch (error) {
            console.error('Error logging violation:', error);
            // Store locally if API is unavailable
            this.storeViolationLocally(violation);
        }
    }

    /**
     * Request admin override for a blocked service
     */
    public async requestOverride(request: OverrideRequest): Promise<void> {
        try {
            const overridePayload = {
                domain: request.service,
                service: request.service,
                reason: request.reason,
                created_by: request.userEmail,
                requested_at: request.timestamp,
                status: 'PENDING'
            };

            await this.client.post('/api/overrides/request', overridePayload);
        } catch (error) {
            console.error('Error requesting override:', error);
            throw error;
        }
    }

    /**
     * Check API health
     */
    public async checkHealth(): Promise<boolean> {
        try {
            const response = await this.client.get('/health');
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    // Private helper methods

    private isOfflineError(error: any): boolean {
        return (
            error.code === 'ECONNREFUSED' ||
            error.code === 'ETIMEDOUT' ||
            error.code === 'ENETUNREACH' ||
            !error.response
        );
    }

    private getOfflineDecision(request: EvaluateRequest): PolicyDecision {
        // In offline mode, use a conservative approach
        // Block known high-risk services, allow others with warning

        const highRiskServices = [
            'character.ai',
            'replika.com',
            'unknown-ai-service'
        ];

        const isHighRisk = highRiskServices.some(service =>
            request.resource_url.includes(service)
        );

        if (isHighRisk) {
            return {
                decision_id: 'offline-deny',
                decision: 'DENY',
                reason: 'Offline mode - high-risk service blocked',
                risk_score: 90,
                cached: true
            };
        }

        return {
            decision_id: 'offline-review',
            decision: 'REVIEW',
            reason: 'Offline mode - manual review required',
            risk_score: 50,
            cached: true
        };
    }

    private storeViolationLocally(violation: ViolationLog): void {
        try {
            // Store in local storage for later sync
            const violations = this.getLocalViolations();
            violations.push(violation);

            // Keep only last 100 violations
            if (violations.length > 100) {
                violations.shift();
            }

            // Store in VS Code global storage (would need context)
            console.log('Violation stored locally:', violation);
        } catch (error) {
            console.error('Error storing violation locally:', error);
        }
    }

    private getLocalViolations(): ViolationLog[] {
        try {
            // In a real implementation, this would read from VS Code storage
            return [];
        } catch (error) {
            return [];
        }
    }

    /**
     * Sync local violations when API comes back online
     */
    public async syncLocalViolations(): Promise<void> {
        const violations = this.getLocalViolations();

        if (violations.length === 0) {
            return;
        }

        try {
            const isHealthy = await this.checkHealth();

            if (isHealthy) {
                for (const violation of violations) {
                    await this.logViolation(violation);
                }

                // Clear local violations after successful sync
                console.log('Synced local violations to API');
            }
        } catch (error) {
            console.error('Error syncing violations:', error);
        }
    }

    /**
     * Clear cached policy
     */
    public clearCache(): void {
        this.cachedPolicy = null;
        this.cacheExpiry = 0;
    }
}
