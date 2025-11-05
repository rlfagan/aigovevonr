"use strict";
/**
 * AI Governance Shield - VS Code Extension
 * Main entry point for the extension
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const aiAssistantDetector_1 = require("./detectors/aiAssistantDetector");
const contentScanner_1 = require("./scanners/contentScanner");
const policyClient_1 = require("./clients/policyClient");
const statusBarManager_1 = require("./ui/statusBarManager");
const violationLogger_1 = require("./logging/violationLogger");
const configManager_1 = require("./config/configManager");
let aiDetector;
let contentScanner;
let policyClient;
let statusBar;
let violationLogger;
let configManager;
let isProtectionEnabled = true;
function activate(context) {
    console.log('AI Governance Shield is now active');
    // Initialize components
    configManager = new configManager_1.ConfigManager();
    policyClient = new policyClient_1.PolicyClient(configManager);
    contentScanner = new contentScanner_1.ContentScanner();
    aiDetector = new aiAssistantDetector_1.AIAssistantDetector(context, policyClient, contentScanner);
    statusBar = new statusBarManager_1.StatusBarManager();
    violationLogger = new violationLogger_1.ViolationLogger(policyClient);
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
function startMonitoring(context) {
    console.log('Starting AI assistant monitoring...');
    // Start AI assistant detection
    aiDetector.startMonitoring();
    // Monitor text document changes
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(async (event) => {
        if (isProtectionEnabled && configManager.shouldScanContent()) {
            await handleTextChange(event);
        }
    }));
    // Monitor clipboard operations
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(async (event) => {
        if (isProtectionEnabled) {
            await checkClipboardForSensitiveData();
        }
    }));
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
function registerCommands(context) {
    // Enable protection
    context.subscriptions.push(vscode.commands.registerCommand('ai-governance.enableProtection', () => {
        isProtectionEnabled = true;
        configManager.setEnabled(true);
        startMonitoring(context);
        statusBar.update(true, 'Active');
        vscode.window.showInformationMessage('AI Governance Shield enabled');
    }));
    // Disable protection
    context.subscriptions.push(vscode.commands.registerCommand('ai-governance.disableProtection', () => {
        isProtectionEnabled = false;
        configManager.setEnabled(false);
        aiDetector.stopMonitoring();
        statusBar.update(false, 'Disabled');
        vscode.window.showWarningMessage('AI Governance Shield disabled');
    }));
    // Check policy
    context.subscriptions.push(vscode.commands.registerCommand('ai-governance.checkPolicy', async () => {
        await checkCurrentPolicy();
    }));
    // Show settings
    context.subscriptions.push(vscode.commands.registerCommand('ai-governance.showSettings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'aiGovernance');
    }));
    // Request override
    context.subscriptions.push(vscode.commands.registerCommand('ai-governance.requestOverride', async () => {
        await requestAdminOverride();
    }));
    // Scan current file
    context.subscriptions.push(vscode.commands.registerCommand('ai-governance.scanCurrentFile', async () => {
        await scanCurrentFile();
    }));
}
async function handleTextChange(event) {
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
                const action = await vscode.window.showWarningMessage(`Sensitive content detected in ${document.fileName}`, 'View Details', 'Dismiss');
                if (action === 'View Details') {
                    showScanDetails(scanResult);
                }
            }
            statusBar.update(isProtectionEnabled, 'Warning - Sensitive Content');
        }
    }
    catch (error) {
        console.error('Error handling text change:', error);
    }
}
async function checkClipboardForSensitiveData() {
    try {
        const clipboardContent = await vscode.env.clipboard.readText();
        if (clipboardContent && clipboardContent.length > 0) {
            const scanResult = contentScanner.scanContent(clipboardContent);
            if (scanResult.hasPII || scanResult.hasSecrets) {
                vscode.window.showWarningMessage('Sensitive data detected in clipboard - be careful when pasting into AI tools');
            }
        }
    }
    catch (error) {
        console.error('Error checking clipboard:', error);
    }
}
async function checkCurrentPolicy() {
    try {
        statusBar.update(isProtectionEnabled, 'Checking policy...');
        const policy = await policyClient.getActivePolicy();
        if (policy) {
            vscode.window.showInformationMessage(`Active Policy: ${policy.policy_name}`);
            statusBar.update(isProtectionEnabled, 'Active');
        }
        else {
            statusBar.update(isProtectionEnabled, 'No policy configured');
        }
    }
    catch (error) {
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
    }
    catch (error) {
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
            vscode.window.showInformationMessage('Override request submitted - waiting for admin approval');
        }
        catch (error) {
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
function showScanDetails(scanResult) {
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
        vscode.window.showWarningMessage(`Scan Results:\n${details.join('\n')}`, 'OK');
    }
    else {
        vscode.window.showInformationMessage('No sensitive content detected');
    }
}
function showWelcomeMessage(context) {
    const hasShownWelcome = context.globalState.get('hasShownWelcome', false);
    if (!hasShownWelcome) {
        vscode.window.showInformationMessage('🛡️ AI Governance Shield is protecting your workspace', 'Learn More', 'Settings').then(selection => {
            if (selection === 'Learn More') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/rlfagan/aigovevonr'));
            }
            else if (selection === 'Settings') {
                vscode.commands.executeCommand('ai-governance.showSettings');
            }
        });
        context.globalState.update('hasShownWelcome', true);
    }
}
function deactivate() {
    if (aiDetector) {
        aiDetector.stopMonitoring();
    }
    if (statusBar) {
        statusBar.dispose();
    }
    console.log('AI Governance Shield deactivated');
}
//# sourceMappingURL=extension.js.map