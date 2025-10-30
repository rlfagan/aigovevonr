# Changelog - AI Governance Shield Browser Extension

All notable changes to this extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] - 2025-10-30

### Added
- **PII Protection Feature**: Real-time detection and blocking of sensitive data
  - Monitors paste events and form submissions on AI service websites
  - Detects: SSN, credit cards, API keys, AWS keys, emails, phone numbers, passport numbers, IP addresses
  - Severity-based handling: Critical (blocks), High/Medium (warns)
  - Beautiful modal warnings with user override option
  - Toast notifications for less critical PII
  - Audit trail logging for compliance
- Content script (`content-script.js`) for PII monitoring
- Test page (`test-pii.html`) for validating PII protection
- Updated documentation: `PII_PROTECTION_GUIDE.md`

### Changed
- Updated manifest version to 0.2.0
- Added content_scripts configuration to manifest
- Added `scripting` and `notifications` permissions to support PII features

### Fixed
- Fixed CSP issues with blocked.html by moving inline scripts to `blocked.js`
- Improved error handling in content script injection

---

## [0.1.0] - 2025-10-29

### Added
- Initial release of AI Governance Shield
- **Core Features**:
  - Policy-based blocking of prohibited AI services (Character.ai, Replika, etc.)
  - Warning banners for monitored AI services (ChatGPT, Claude, etc.)
  - Real-time policy decision API integration
  - Statistics tracking (allowed/denied/reviewed requests)
  - Browser notifications for blocked services

- **Files**:
  - `manifest.json`: Extension configuration (Manifest V3)
  - `background.js`: Service worker for request interception
  - `popup.html` & `popup.css`: Extension popup UI
  - `blocked.html` & `blocked.js`: Block page for denied services
  - Extension icons (16px, 48px, 128px)

### Technical Details
- Manifest V3 compatible (non-blocking webRequest)
- Integrates with Decision API at `http://localhost:8002`
- Supports Chrome and Edge browsers
- Monitors 11+ AI service domains

---

## Version Numbering

- **MAJOR** (x.0.0): Breaking changes, major feature overhauls
- **MINOR** (0.x.0): New features, enhancements (backwards compatible)
- **PATCH** (0.0.x): Bug fixes, minor improvements

---

## Upcoming Features (Roadmap)

- [ ] Custom policy configuration UI
- [ ] Multi-tenancy support
- [ ] Encrypted local storage for sensitive stats
- [ ] Advanced content filtering (file upload detection)
- [ ] Team/department-specific policies
- [ ] Offline mode with cached policies
- [ ] Enterprise SSO integration
