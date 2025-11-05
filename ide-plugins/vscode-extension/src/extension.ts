/**
 * AI Governance Shield - VS Code Extension
 * Main entry point for the extension
 */

import * as vscode from 'vscode';
import { AIAssistantDetector } from './detectors/aiAssistantDetector';
import { ContentScanner } from './scanners/contentScanner';
import { PolicyClient } from './clients/policyClient';
import { StatusBarManager } from './ui/statusBarManager';
import { ViolationLogger } from './logging/violationLogger';
import { ConfigManager } from './config/configManager';

let aiDetector: AIAssistantDetector;
let contentScanner: ContentScanner;
let policyClient: PolicyClient;
let statusBar: StatusBarManager;
let violationLogger: ViolationLogger;
let configManager: ConfigManager;
let isProtectionEnabled = true;

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Governance Shield is now active');

    // Initialize components
    configManager = new ConfigManager();
    policyClient = new PolicyClient(configManager);
    contentScanner = new ContentScanner();
    aiDetector = new AIAssistantDetector(context, policyClient, contentScanner);
    statusBar = new StatusBarManager();
    violationLogger = new ViolationLogger(policyClient);

    // Check if protection is enabled
    isProtectionEnabled = configManager.isEnabled();

    // Start monitoring if enabled
    if (isProtectionEnabled) {
        startMonitoring(context);
    }

    // Register commands
    registerCommands(context);

    // Check policy on startup
    checkPolicyOnStartup();

    // Show welcome message
    showWelcomeMessage(context);

    // Update status bar
    statusBar.update(isProtectionEnabled, 'Active');
}

function startMonitoring(context: vscode.ExtensionContext) {
    console.log('Starting AI assistant monitoring...');

    // Start AI assistant detection
    aiDetector.startMonitoring();

    // Monitor text document changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(async (event) => {
            if (isProtectionEnabled && configManager.shouldScanContent()) {
                await handleTextChange(event);
            }
        })
    );

    // Monitor clipboard operations
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(async (event) => {
            if (isProtectionEnabled) {
                await checkClipboardForSensitiveData();
            }
        })
    );

    // Periodic policy check
    const checkInterval = configManager.getCheckInterval() * 1000;
    const intervalId = setInterval(() => {
        if (isProtectionEnabled) {
            checkCurrentPolicy();
        }
    }, checkInterval);

    context.subscriptions.push({
        dispose: () => clearInterval(intervalId)
    });

    console.log('AI Governance Shield monitoring started');
}

function registerCommands(context: vscode.ExtensionContext) {
    // Enable protection
    context.subscriptions.push(
        vscode.commands.registerCommand('ai-governance.enableProtection', () => {
            isProtectionEnabled = true;
            configManager.setEnabled(true);
            startMonitoring(context);
            statusBar.update(true, 'Active');
            vscode.window.showInformationMessage('AI Governance Shield enabled');
        })
    );

    // Disable protection
    context.subscriptions.push(
        vscode.commands.registerCommand('ai-governance.disableProtection', () => {
            isProtectionEnabled = false;
            configManager.setEnabled(false);
            aiDetector.stopMonitoring();
            statusBar.update(false, 'Disabled');
            vscode.window.showWarningMessage('AI Governance Shield disabled');
        })
    );

    // Check policy
    context.subscriptions.push(
        vscode.commands.registerCommand('ai-governance.checkPolicy', async () => {
            await checkCurrentPolicy();
        })
    );

    // Show settings
    context.subscriptions.push(
        vscode.commands.registerCommand('ai-governance.showSettings', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'aiGovernance');
        })
    );

    // Request override
    context.subscriptions.push(
        vscode.commands.registerCommand('ai-governance.requestOverride', async () => {
            await requestAdminOverride();
        })
    );

    // Scan current file
    context.subscriptions.push(
        vscode.commands.registerCommand('ai-governance.scanCurrentFile', async () => {
            await scanCurrentFile();
        })
    );
}

async function handleTextChange(event: vscode.TextDocumentChangeEvent) {
    try {
        const document = event.document;
        const content = document.getText();

        // Scan for sensitive content
        const scanResult = contentScanner.scanContent(content);

        if (scanResult.hasPII || scanResult.hasSecrets || scanResult.hasProprietary) {
            // Log violation
            await violationLogger.logViolation({
                type: 'SENSITIVE_CONTENT_DETECTED',
                severity: 'HIGH',
                fileName: document.fileName,
                details: scanResult,
                timestamp: new Date().toISOString()
            });

            // Show warning
            if (configManager.shouldNotifyOnViolation()) {
                const action = await vscode.window.showWarningMessage(
                    `Sensitive content detected in ${document.fileName}`,
                    'View Details',
                    'Dismiss'
                );

                if (action === 'View Details') {
                    showScanDetails(scanResult);
                }
            }

            statusBar.update(isProtectionEnabled, 'Warning - Sensitive Content');
        }
    } catch (error) {
        console.error('Error handling text change:', error);
    }
}

async function checkClipboardForSensitiveData() {
    try {
        const clipboardContent = await vscode.env.clipboard.readText();

        if (clipboardContent && clipboardContent.length > 0) {
            const scanResult = contentScanner.scanContent(clipboardContent);

            if (scanResult.hasPII || scanResult.hasSecrets) {
                vscode.window.showWarningMessage(
                    'Sensitive data detected in clipboard - be careful when pasting into AI tools'
                );
            }
        }
    } catch (error) {
        console.error('Error checking clipboard:', error);
    }
}

async function checkCurrentPolicy() {
    try {
        statusBar.update(isProtectionEnabled, 'Checking policy...');

        const policy = await policyClient.getActivePolicy();

        if (policy) {
            vscode.window.showInformationMessage(
                `Active Policy: ${policy.policy_name}`
            );
            statusBar.update(isProtectionEnabled, 'Active');
        } else {
            statusBar.update(isProtectionEnabled, 'No policy configured');
        }
    } catch (error) {
        console.error('Error checking policy:', error);
        statusBar.update(isProtectionEnabled, 'Policy check failed');
    }
}

async function checkPolicyOnStartup() {
    try {
        const userEmail = configManager.getUserEmail();

        if (!userEmail) {
            const email = await vscode.window.showInputBox({
                prompt: 'Enter your email for AI Governance policy enforcement',
                placeHolder: 'user@company.com',
                ignoreFocusOut: true
            });

            if (email) {
                configManager.setUserEmail(email);
            }
        }

        await checkCurrentPolicy();
    } catch (error) {
        console.error('Error on startup policy check:', error);
    }
}

async function requestAdminOverride() {
    const reason = await vscode.window.showInputBox({
        prompt: 'Why do you need access to this AI service?',
        placeHolder: 'Business justification...',
        ignoreFocusOut: true
    });

    if (reason) {
        try {
            await policyClient.requestOverride({
                userEmail: configManager.getUserEmail(),
                service: 'AI Coding Assistant',
                reason: reason,
                timestamp: new Date().toISOString()
            });

            vscode.window.showInformationMessage(
                'Override request submitted - waiting for admin approval'
            );
        } catch (error) {
            vscode.window.showErrorMessage('Failed to submit override request');
        }
    }
}

async function scanCurrentFile() {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showWarningMessage('No file is currently open');
        return;
    }

    const document = editor.document;
    const content = document.getText();

    vscode.window.showInformationMessage('Scanning file for sensitive content...');

    const scanResult = contentScanner.scanContent(content);

    showScanDetails(scanResult);
}

function showScanDetails(scanResult: any) {
    const details = [];

    if (scanResult.hasPII) {
        details.push(`PII Detected: ${scanResult.piiPatterns.join(', ')}`);
    }
    if (scanResult.hasSecrets) {
        details.push(`Secrets Detected: ${scanResult.secretPatterns.join(', ')}`);
    }
    if (scanResult.hasProprietary) {
        details.push('Proprietary markers detected');
    }

    if (details.length > 0) {
        vscode.window.showWarningMessage(
            `Scan Results:\n${details.join('\n')}`,
            'OK'
        );
    } else {
        vscode.window.showInformationMessage('No sensitive content detected');
    }
}

function showWelcomeMessage(context: vscode.ExtensionContext) {
    const hasShownWelcome = context.globalState.get('hasShownWelcome', false);

    if (!hasShownWelcome) {
        vscode.window.showInformationMessage(
            '🛡️ AI Governance Shield is protecting your workspace',
            'Learn More',
            'Settings'
        ).then(selection => {
            if (selection === 'Learn More') {
                vscode.env.openExternal(
                    vscode.Uri.parse('https://github.com/rlfagan/aigovevonr')
                );
            } else if (selection === 'Settings') {
                vscode.commands.executeCommand('ai-governance.showSettings');
            }
        });

        context.globalState.update('hasShownWelcome', true);
    }
}

export function deactivate() {
    if (aiDetector) {
        aiDetector.stopMonitoring();
    }
    if (statusBar) {
        statusBar.dispose();
    }
    console.log('AI Governance Shield deactivated');
}
