"use strict";
/**
 * Content Scanner
 * Scans code for PII, secrets, API keys, and proprietary markers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentScanner = void 0;
class ContentScanner {
    constructor() {
        // PII Patterns
        this.PII_PATTERNS = [
            {
                name: 'SSN',
                pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
                description: 'Social Security Number'
            },
            {
                name: 'Credit Card',
                pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
                description: 'Credit Card Number'
            },
            {
                name: 'Email',
                pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
                description: 'Email Address'
            },
            {
                name: 'Phone',
                pattern: /\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
                description: 'Phone Number'
            },
            {
                name: 'IP Address',
                pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
                description: 'IP Address'
            }
        ];
        // Secret/API Key Patterns
        this.SECRET_PATTERNS = [
            {
                name: 'AWS Access Key',
                pattern: /AKIA[0-9A-Z]{16}/g,
                description: 'AWS Access Key ID'
            },
            {
                name: 'AWS Secret Key',
                pattern: /aws(.{0,20})?['\"][0-9a-zA-Z\/+]{40}['\"]/gi,
                description: 'AWS Secret Access Key'
            },
            {
                name: 'GitHub Token',
                pattern: /gh[pousr]_[A-Za-z0-9_]{36,255}/g,
                description: 'GitHub Personal Access Token'
            },
            {
                name: 'Generic API Key',
                pattern: /(api[_-]?key|apikey|api[_-]?secret)[\s]*[=:]['"]?[a-zA-Z0-9_\-]{20,}['"]?/gi,
                description: 'Generic API Key'
            },
            {
                name: 'OpenAI API Key',
                pattern: /sk-[a-zA-Z0-9]{48}/g,
                description: 'OpenAI API Key'
            },
            {
                name: 'Anthropic API Key',
                pattern: /sk-ant-[a-zA-Z0-9\-_]{95}/g,
                description: 'Anthropic API Key'
            },
            {
                name: 'Private Key',
                pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g,
                description: 'Private Key'
            },
            {
                name: 'Google API Key',
                pattern: /AIza[0-9A-Za-z\-_]{35}/g,
                description: 'Google API Key'
            },
            {
                name: 'Slack Token',
                pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,32}/g,
                description: 'Slack Token'
            },
            {
                name: 'JWT Token',
                pattern: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,
                description: 'JWT Token'
            },
            {
                name: 'Password in Code',
                pattern: /(password|passwd|pwd)[\s]*[=:]['"][^'"]{6,}['"]/gi,
                description: 'Hardcoded Password'
            }
        ];
        // Proprietary markers
        this.PROPRIETARY_MARKERS = [
            '@proprietary',
            '@confidential',
            '@internal',
            '@company-confidential',
            'PROPRIETARY',
            'CONFIDENTIAL',
            'INTERNAL ONLY',
            'DO NOT DISTRIBUTE',
            'TRADE SECRET',
            'COPYRIGHT',
            'All Rights Reserved'
        ];
        // Common safe patterns to ignore (reduce false positives)
        this.SAFE_PATTERNS = [
            /example\.com/gi,
            /test@test\.com/gi,
            /user@example\.com/gi,
            /123-45-6789/g, // Example SSN
            /0\.0\.0\.0/g,
            /127\.0\.0\.1/g,
            /localhost/gi,
            /YOUR_API_KEY/gi,
            /REPLACE_ME/gi,
            /TODO:/gi,
            /FIXME:/gi
        ];
    }
    scanContent(content) {
        // Check if content is mostly safe (comments, examples, etc.)
        const isMostlySafe = this.isMostlySafeContent(content);
        const result = {
            hasPII: false,
            hasSecrets: false,
            hasProprietary: false,
            piiPatterns: [],
            secretPatterns: [],
            proprietaryMarkers: [],
            riskScore: 0
        };
        // Skip scanning if content is too short or mostly safe
        if (content.length < 10 || isMostlySafe) {
            return result;
        }
        // Scan for PII
        for (const pii of this.PII_PATTERNS) {
            const matches = content.match(pii.pattern);
            if (matches && matches.length > 0) {
                // Filter out safe patterns
                const realMatches = matches.filter(match => !this.isSafePattern(match));
                if (realMatches.length > 0) {
                    result.hasPII = true;
                    result.piiPatterns.push(pii.description);
                    result.riskScore += 30;
                }
            }
        }
        // Scan for secrets
        for (const secret of this.SECRET_PATTERNS) {
            const matches = content.match(secret.pattern);
            if (matches && matches.length > 0) {
                // Filter out safe patterns
                const realMatches = matches.filter(match => !this.isSafePattern(match));
                if (realMatches.length > 0) {
                    result.hasSecrets = true;
                    result.secretPatterns.push(secret.description);
                    result.riskScore += 40;
                }
            }
        }
        // Scan for proprietary markers
        for (const marker of this.PROPRIETARY_MARKERS) {
            if (content.includes(marker)) {
                result.hasProprietary = true;
                result.proprietaryMarkers.push(marker);
                result.riskScore += 20;
            }
        }
        return result;
    }
    scanFile(filePath, content) {
        // Add file-specific scanning logic
        const result = this.scanContent(content);
        // Check file path for sensitive patterns
        const sensitivePathPatterns = [
            /\.env/i,
            /\.secret/i,
            /password/i,
            /credential/i,
            /key/i
        ];
        for (const pattern of sensitivePathPatterns) {
            if (pattern.test(filePath)) {
                result.riskScore += 10;
                result.hasProprietary = true;
                result.proprietaryMarkers.push('Sensitive file path');
                break;
            }
        }
        return result;
    }
    isSafePattern(text) {
        for (const safePattern of this.SAFE_PATTERNS) {
            if (safePattern.test(text)) {
                return true;
            }
        }
        return false;
    }
    isMostlySafeContent(content) {
        // Check if content is mostly comments or examples
        const lines = content.split('\n');
        let commentLines = 0;
        let exampleLines = 0;
        for (const line of lines) {
            const trimmed = line.trim();
            // Comment lines
            if (trimmed.startsWith('//') ||
                trimmed.startsWith('#') ||
                trimmed.startsWith('/*') ||
                trimmed.startsWith('*') ||
                trimmed.startsWith('<!--')) {
                commentLines++;
            }
            // Example/placeholder lines
            if (trimmed.includes('example') ||
                trimmed.includes('TODO') ||
                trimmed.includes('FIXME') ||
                trimmed.includes('placeholder') ||
                trimmed.includes('REPLACE')) {
                exampleLines++;
            }
        }
        // If more than 50% are comments or examples, consider it safe
        const totalLines = lines.length;
        return (commentLines + exampleLines) / totalLines > 0.5;
    }
    // Specific scanners for different types of sensitive data
    scanForCredentials(content) {
        for (const secret of this.SECRET_PATTERNS) {
            if (secret.pattern.test(content)) {
                return true;
            }
        }
        return false;
    }
    scanForPII(content) {
        for (const pii of this.PII_PATTERNS) {
            const matches = content.match(pii.pattern);
            if (matches) {
                // Filter false positives
                const realMatches = matches.filter(m => !this.isSafePattern(m));
                if (realMatches.length > 0) {
                    return true;
                }
            }
        }
        return false;
    }
    scanForProprietaryMarkers(content) {
        return this.PROPRIETARY_MARKERS.some(marker => content.toUpperCase().includes(marker.toUpperCase()));
    }
}
exports.ContentScanner = ContentScanner;
//# sourceMappingURL=contentScanner.js.map