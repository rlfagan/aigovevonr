# 📦 Extension Versioning System

The AI Governance Shield browser extension now has a complete versioning system to track changes and releases.

---

## 🎯 Current Version

**v0.2.0** - PII Protection Release

---

## 📁 Versioning Files

### 1. **VERSION** File
```
browser-extension/VERSION
```
Contains the current version number (e.g., `0.2.0`)

### 2. **manifest.json**
```json
{
  "version": "0.2.0",
  ...
}
```
Chrome extension manifest with version number

### 3. **CHANGELOG.md**
```
browser-extension/CHANGELOG.md
```
Complete history of all changes, following [Keep a Changelog](https://keepachangelog.com/) format

---

## 🔢 Version Numbering (Semantic Versioning)

We follow [Semantic Versioning](https://semver.org/):

### Format: **MAJOR.MINOR.PATCH**

- **MAJOR** (x.0.0): Breaking changes, major feature overhauls
  - Example: Complete rewrite, API breaking changes

- **MINOR** (0.x.0): New features, enhancements (backwards compatible)
  - Example: Adding PII protection feature (0.1.0 → 0.2.0)

- **PATCH** (0.0.x): Bug fixes, minor improvements
  - Example: Fixing CSP errors, typos, small bugs

---

## 🚀 How to Bump Version

### Option 1: Using the Script (Recommended)

```bash
cd browser-extension

# For a new feature
./bump-version.sh minor "Added PII detection feature"

# For a bug fix
./bump-version.sh patch "Fixed banner injection issue"

# For breaking changes
./bump-version.sh major "Complete rewrite with new API"
```

The script automatically:
- ✅ Updates VERSION file
- ✅ Updates manifest.json
- ✅ Adds entry to CHANGELOG.md
- ✅ Shows next steps

---

### Option 2: Manual Update

1. **Update VERSION file**
   ```bash
   echo "0.3.0" > VERSION
   ```

2. **Update manifest.json**
   ```json
   {
     "version": "0.3.0",
     ...
   }
   ```

3. **Update CHANGELOG.md**
   ```markdown
   ## [0.3.0] - 2025-10-30

   ### Added
   - New feature description

   ### Changed
   - What changed

   ### Fixed
   - What was fixed
   ```

---

## 📋 Release Checklist

When releasing a new version:

- [ ] Update version in all 3 locations (VERSION, manifest.json, CHANGELOG.md)
- [ ] Document changes in CHANGELOG.md
- [ ] Test the extension thoroughly
- [ ] Reload extension in browser to verify
- [ ] Test all affected features
- [ ] Commit changes:
  ```bash
  git add browser-extension/
  git commit -m "Release v0.2.0: PII Protection"
  git tag v0.2.0
  ```
- [ ] (Optional) Create GitHub release with notes

---

## 📝 Changelog Categories

Use these categories in CHANGELOG.md:

- **Added**: New features
- **Changed**: Changes to existing features
- **Deprecated**: Features that will be removed
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security fixes

### Example Entry
```markdown
## [0.2.0] - 2025-10-30

### Added
- PII Protection: Real-time detection of SSN, credit cards, API keys
- Content script for monitoring paste events
- Test page for validating PII protection

### Changed
- Updated manifest to v0.2.0
- Added scripting and notifications permissions

### Fixed
- Fixed CSP issues with inline scripts in blocked.html
```

---

## 🔍 Version History

| Version | Date | Description |
|---------|------|-------------|
| 0.2.0 | 2025-10-30 | Added PII protection feature |
| 0.1.0 | 2025-10-29 | Initial release with policy enforcement |

See `browser-extension/CHANGELOG.md` for complete history.

---

## 🎨 Version Display

The version is displayed in:
1. **Extension popup**: Shows in footer (if implemented)
2. **manifest.json**: Visible in chrome://extensions/
3. **About page**: Can add version info to blocked page

### Example: Add to popup.html
```html
<footer>
  AI Governance Shield v0.2.0
</footer>
```

---

## 🔄 Automation Ideas

Future improvements:

1. **Git Hook**: Automatically bump version on commit
2. **CI/CD**: Automated version checking and tagging
3. **Release Script**: Package extension ZIP with version number
4. **Update Notifications**: Notify users of new versions

---

## 📦 Packaging Releases

To package a release:

```bash
cd /Users/ronanfagan/Downloads/AIPOLICY
zip -r "ai-governance-shield-v0.2.0.zip" browser-extension/ \
  -x "*.DS_Store" -x "*node_modules*" -x "*.git*"
```

---

## 📊 Current Status

✅ **v0.2.0** - PII Protection Release

**Next Planned Release**: v0.3.0
- Custom policy configuration UI
- Enhanced statistics dashboard
- Export compliance reports

---

**Quick Commands**:

```bash
# Check current version
cat browser-extension/VERSION

# View changelog
cat browser-extension/CHANGELOG.md

# Bump to next patch
./browser-extension/bump-version.sh patch "Bug fixes"

# Bump to next minor
./browser-extension/bump-version.sh minor "New feature"
```

Happy versioning! 🚀
