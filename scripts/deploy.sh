#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# EcoMeter AI — First-time GitHub deploy script
# Run this ONCE from the root of this folder to push everything to GitHub.
#
# Prerequisites:
#   - Git installed  (https://git-scm.com)
#   - GitHub CLI installed and authenticated  (https://cli.github.com)
#     OR just have your GitHub credentials ready for the push prompt
#
# Usage:
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e  # exit on any error

REPO_URL="https://github.com/roryweston26-source/ecometer-ai.git"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║  EcoMeter AI — First-time Deploy     ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── 1. Check we're in the right place ────────────────────────────────────────
if [ ! -f "extension/manifest.json" ]; then
  echo "✗ Run this script from the repo root (the folder containing extension/)"
  exit 1
fi

VERSION=$(node -e "console.log(require('./extension/manifest.json').version)" 2>/dev/null || echo "unknown")
echo "Extension version: $VERSION"
echo ""

# ── 2. Initialise git if needed ───────────────────────────────────────────────
if [ ! -d ".git" ]; then
  echo "→ Initialising git repository..."
  git init
  git branch -M main
else
  echo "→ Git already initialised"
fi

# ── 3. Set remote ─────────────────────────────────────────────────────────────
if git remote get-url origin &>/dev/null; then
  echo "→ Remote 'origin' already set: $(git remote get-url origin)"
else
  echo "→ Adding remote origin: $REPO_URL"
  git remote add origin "$REPO_URL"
fi

# ── 4. Stage everything ───────────────────────────────────────────────────────
echo ""
echo "→ Staging files..."
git add .

# Show what's being committed
echo ""
echo "Files to commit:"
git diff --cached --name-only | sed 's/^/   /'
echo ""

# ── 5. Commit ─────────────────────────────────────────────────────────────────
COMMIT_MSG="feat: rebrand to EcoMeter AI by Legerly (v$VERSION)

- Renamed from AI Token Tracker to EcoMeter AI
- Updated branding, color scheme, and icons
- Added Gemini 3.x model support (3.5 Flash, 3.1 Pro, 3.1 Flash-Lite)
- Removed deprecated Gemini 2.0 Flash (shut down June 2026)
- Added GitHub Actions for weekly price updates and auto-releases
- Cleaned up repo structure"

git commit -m "$COMMIT_MSG"

# ── 6. Push ───────────────────────────────────────────────────────────────────
echo ""
echo "→ Pushing to GitHub..."
echo "   (You may be prompted for your GitHub credentials)"
echo ""

git push -u origin main

echo ""
echo "╔══════════════════════════════════════╗"
echo "║  ✓ Deploy complete!                  ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Your repo: $REPO_URL"
echo ""
echo "Next steps:"
echo "  1. Go to GitHub → Actions tab — the release workflow will run automatically"
echo "  2. Check Settings → Actions → General → ensure 'Allow GitHub Actions' is on"
echo "  3. The weekly price updater runs every Monday — first run will open a PR"
echo ""
