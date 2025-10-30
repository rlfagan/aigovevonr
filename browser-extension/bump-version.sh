#!/bin/bash
# Version Bump Helper Script for AI Governance Shield Extension
# Usage: ./bump-version.sh [major|minor|patch] "Description of changes"

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if jq is available (for JSON manipulation)
if ! command -v jq &> /dev/null; then
    echo "⚠️  Warning: jq not found. Using sed for JSON manipulation."
    USE_SED=true
else
    USE_SED=false
fi

# Function to bump version
bump_version() {
    local version=$1
    local bump_type=$2

    IFS='.' read -ra VERSION_PARTS <<< "$version"
    local major="${VERSION_PARTS[0]}"
    local minor="${VERSION_PARTS[1]}"
    local patch="${VERSION_PARTS[2]}"

    case $bump_type in
        major)
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        minor)
            minor=$((minor + 1))
            patch=0
            ;;
        patch)
            patch=$((patch + 1))
            ;;
        *)
            echo "❌ Invalid bump type: $bump_type"
            echo "Usage: $0 [major|minor|patch] \"Description\""
            exit 1
            ;;
    esac

    echo "${major}.${minor}.${patch}"
}

# Get current version
CURRENT_VERSION=$(cat VERSION | tr -d '\n')
echo "📦 Current version: $CURRENT_VERSION"

# Get bump type
BUMP_TYPE=${1:-patch}
DESCRIPTION=${2:-"Bug fixes and improvements"}

# Calculate new version
NEW_VERSION=$(bump_version "$CURRENT_VERSION" "$BUMP_TYPE")
echo "✨ New version: $NEW_VERSION"

# Update VERSION file
echo "$NEW_VERSION" > VERSION
echo "✅ Updated VERSION file"

# Update manifest.json
if [ "$USE_SED" = true ]; then
    # macOS sed syntax
    sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" manifest.json
else
    # Using jq
    jq ".version = \"$NEW_VERSION\"" manifest.json > manifest.json.tmp && mv manifest.json.tmp manifest.json
fi
echo "✅ Updated manifest.json"

# Update CHANGELOG.md
TODAY=$(date +%Y-%m-%d)
CHANGELOG_ENTRY="## [$NEW_VERSION] - $TODAY

### Changed
- $DESCRIPTION

---

"

# Insert after the first "---" line
awk -v entry="$CHANGELOG_ENTRY" '
    !inserted && /^---$/ && NR > 10 {
        print entry;
        inserted=1
    }
    { print }
' CHANGELOG.md > CHANGELOG.md.tmp && mv CHANGELOG.md.tmp CHANGELOG.md

echo "✅ Updated CHANGELOG.md"

echo ""
echo "🎉 Version bumped from $CURRENT_VERSION to $NEW_VERSION"
echo ""
echo "📝 Next steps:"
echo "   1. Review changes: git diff"
echo "   2. Update CHANGELOG.md with detailed changes"
echo "   3. Test the extension"
echo "   4. Commit: git add . && git commit -m \"Bump version to $NEW_VERSION\""
echo ""
