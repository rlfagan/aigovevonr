/**
 * AI Assistant Detector
 * Detects and monitors AI coding assistants like GitHub Copilot, Cursor, etc.
 */

import * as vscode from 'vscode';
import { PolicyClient } from '../clients/policyClient';
import { ContentScanner } from '../scanners/contentScanner';

export interface DetectedAITool {
    name: string;
    extensionId: string;
    active: boolean;
    lastSeen: string;
    decision?: 'ALLOW' | 'DENY' | 'REVIEW';
}

export class AIAssistantDetector {
    private detectedTools: Map<string, DetectedAITool> = new Map();
    private monitoring = false;
    private disposables: vscode.Disposable[] = [];

    // Known AI coding assistant extensions
    private readonly AI_EXTENSIONS = [
        {
            id: 'github.copilot',
            name: 'GitHub Copilot',
            service: 'copilot.github.com'
        },
        {
            id: 'github.copilot-chat',
            name: 'GitHub Copilot Chat',
            service: 'copilot.github.com'
        },
        {
            id: 'cursor.cursor',
            name: 'Cursor AI',
            service: 'cursor.sh'
        },
        {
            id: 'continue.continue',
            name: 'Continue.dev',
            service: 'continue.dev'
        },
        {
            id: 'tabnine.tabnine-vscode',
            name: 'TabNine',
            service: 'tabnine.com'
        },
        {
            id: 'codeium.codeium',
            name: 'Codeium',
            service: 'codeium.com'
        },
        {
            id: 'amazonwebservices.aws-toolkit-vscode',
            name: 'Amazon CodeWhisperer',
            service: 'aws.amazon.com'
        },
        {
            id: 'visualstudioexptteam.vscodeintellicode',
            name: 'IntelliCode',
            service: 'visualstudio.microsoft.com'
        },
        {
            id: 'sourcegraph.cody-ai',
            name: 'Cody AI',
            service: 'sourcegraph.com'
        },
        {
            id: 'replit.replit',
            name: 'Replit AI',
            service: 'replit.com'
        },
        {
            id: 'openai.openai-api',
            name: 'OpenAI API',
            service: 'openai.com'
        }
    ];

    constructor(
        private context: vscode.ExtensionContext,
        private policyClient: PolicyClient,
        private contentScanner: ContentScanner
    ) {}

    public startMonitoring() {
        if (this.monitoring) {
            return;
        }

        console.log('Starting AI assistant detection...');
        this.monitoring = true;

        // Initial scan
        this.scanInstalledExtensions();

        // Monitor extension installations/uninstallations
        this.disposables.push(
            vscode.extensions.onDidChange(() => {
                this.scanInstalledExtensions();
            })
        );

        // Monitor for Copilot suggestions (InlineCompletionItemProvider)
        this.monitorCopilotSuggestions();

        // Monitor commands that might trigger AI tools
        this.monitorAICommands();
    }

    public stopMonitoring() {
        this.monitoring = false;
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        console.log('AI assistant monitoring stopped');
    }

    public getDetectedTools(): DetectedAITool[] {
        return Array.from(this.detectedTools.values());
    }

    private async scanInstalledExtensions() {
        console.log('Scanning for AI extensions...');

        for (const aiExt of this.AI_EXTENSIONS) {
            const extension = vscode.extensions.getExtension(aiExt.id);

            if (extension) {
                const isActive = extension.isActive;

                // Check policy for this service
                const decision = await this.checkServicePolicy(aiExt.service, aiExt.name);

                const tool: DetectedAITool = {
                    name: aiExt.name,
                    extensionId: aiExt.id,
                    active: isActive,
                    lastSeen: new Date().toISOString(),
                    decision: decision
                };

                this.detectedTools.set(aiExt.id, tool);

                // If denied and active, warn user
                if (decision === 'DENY' && isActive) {
                    await this.handleDeniedTool(tool, aiExt.service);
                } else if (decision === 'ALLOW') {
                    console.log(`✅ AI tool allowed: ${aiExt.name}`);
                }
            }
        }

        // Update context for detected tools
        await vscode.commands.executeCommand(
            'setContext',
            'ai-governance.hasDetectedTools',
            this.detectedTools.size > 0
        );
    }

    private async checkServicePolicy(service: string, serviceName: string): Promise<'ALLOW' | 'DENY' | 'REVIEW'> {
        try {
            const decision = await this.policyClient.evaluateAccess({
                resource_url: `https://${service}`,
                action: 'use_ai_assistant',
                resource_type: 'ai_coding_assistant',
                service: serviceName
            });

            return decision.decision;
        } catch (error) {
            console.error(`Error checking policy for ${service}:`, error);
            // Default deny on error
            return 'DENY';
        }
    }

    private async handleDeniedTool(tool: DetectedAITool, service: string) {
        console.warn(`🚫 AI tool blocked by policy: ${tool.name}`);

        // Log violation
        await this.policyClient.logViolation({
            type: 'BLOCKED_AI_TOOL',
            service: service,
            toolName: tool.name,
            extensionId: tool.extensionId,
            timestamp: new Date().toISOString()
        });

        // Show warning to user
        const action = await vscode.window.showWarningMessage(
            `🚫 ${tool.name} is blocked by your organization's AI policy`,
            'View Policy',
            'Request Override',
            'Disable Extension'
        );

        if (action === 'View Policy') {
            vscode.commands.executeCommand('ai-governance.checkPolicy');
        } else if (action === 'Request Override') {
            vscode.commands.executeCommand('ai-governance.requestOverride');
        } else if (action === 'Disable Extension') {
            await this.disableExtension(tool.extensionId);
        }
    }

    private async disableExtension(extensionId: string) {
        try {
            // VS Code doesn't have a direct API to disable extensions programmatically
            // We'll guide the user to do it manually
            const action = await vscode.window.showInformationMessage(
                'To disable this extension, go to Extensions view',
                'Open Extensions'
            );

            if (action === 'Open Extensions') {
                vscode.commands.executeCommand('workbench.extensions.search', extensionId);
            }
        } catch (error) {
            console.error('Error disabling extension:', error);
        }
    }

    private monitorCopilotSuggestions() {
        // Monitor when Copilot provides suggestions
        // This hooks into the inline completion provider

        const monitorCompletions = vscode.languages.registerInlineCompletionItemProvider(
            { pattern: '**' },
            {
                provideInlineCompletionItems: async (document, position, context, token) => {
                    // Check if any AI tool is providing completions
                    const copilotTool = this.detectedTools.get('github.copilot');

                    if (copilotTool && copilotTool.decision === 'DENY') {
                        // Block the completion
                        return { items: [] };
                    }

                    // Allow other providers to handle
                    return undefined;
                }
            }
        );

        this.disposables.push(monitorCompletions);
    }

    private monitorAICommands() {
        // List of known AI-related commands to monitor
        const aiCommands = [
            'github.copilot.generate',
            'github.copilot.toggleCopilot',
            'github.copilot.chat.open',
            'continue.continueGUIView.focus',
            'codeium.toggleEnabled',
            'tabnine.enable',
            'aws.codeWhisperer.enable'
        ];

        // Intercept command execution (if possible)
        // Note: VS Code doesn't allow direct command interception
        // We'll listen for known AI commands via extension activation

        for (const aiExt of this.AI_EXTENSIONS) {
            const extension = vscode.extensions.getExtension(aiExt.id);

            if (extension && !extension.isActive) {
                // Monitor for activation
                extension.activate().then(() => {
                    console.log(`AI extension activated: ${aiExt.name}`);
                    this.scanInstalledExtensions();
                }, (err: any) => {
                    console.error(`Error activating ${aiExt.name}:`, err);
                });
            }
        }
    }

    // Check if the current workspace should be monitored
    private shouldMonitorWorkspace(): boolean {
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders || workspaceFolders.length === 0) {
            return false;
        }

        // Check for .aigovernance file or similar
        // This allows workspaces to opt-in/opt-out
        return true;
    }
}
