#!/bin/bash
# OpenSkills installer - downloads and installs the appropriate binary
# Usage: curl -fsSL https://ain3sh.com/openskills/install.sh | bash

set -euo pipefail

REPO="ain3sh/openskills"
INSTALL_DIR="$HOME/.openskills/bin"
BINARY_NAME="openskills"

echo "🛠️  OpenSkills installer"
echo ""

# Detect OS and architecture
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux*) PLATFORM="linux" ;;
  Darwin*) PLATFORM="darwin" ;;
  MINGW*|MSYS*|CYGWIN*) PLATFORM="win32" ; BINARY_NAME="openskills.exe" ;;
  *) echo "❌ Unsupported OS: $OS"; echo "Supported: Linux, macOS, Windows"; exit 1 ;;
esac

case "$ARCH" in
  x86_64|amd64) ARCH_NAME="x64" ;;
  arm64|aarch64) ARCH_NAME="arm64" ;;
  *) echo "❌ Unsupported architecture: $ARCH"; echo "Supported: x86_64, arm64"; exit 1 ;;
esac

echo "📍 Detected: $PLATFORM-$ARCH_NAME"
echo ""

echo "🔍 Fetching latest release…"
LATEST_URL="https://api.github.com/repos/$REPO/releases/latest"
SUFFIX="openskills-$PLATFORM-$ARCH_NAME"

# Prefer jq for robust JSON parsing; fallback to grep -F (fixed string, no regex)
if command -v jq >/dev/null 2>&1; then
  DOWNLOAD_URL=$(curl -fsSL "$LATEST_URL" | jq -r --arg suffix "$SUFFIX" '.assets[].browser_download_url | select(endswith($suffix))' | head -n1)
else
  # Using grep -F for literal string matching (prevents injection via SUFFIX)
  DOWNLOAD_URL=$(curl -fsSL "$LATEST_URL" | grep -F "browser_download_url" | grep -F -- "$SUFFIX" | head -n1 | cut -d '"' -f 4)
fi

if [ -z "${DOWNLOAD_URL:-}" ]; then
  echo "❌ Could not find a binary for $PLATFORM-$ARCH_NAME"
  echo "   See releases: https://github.com/$REPO/releases"
  echo ""
  echo "Alternative install (requires Node.js):"
  echo "  npm i -g openskills"
  echo "  # or"
  echo "  npx -y openskills@latest --help"
  exit 1
fi

mkdir -p "$INSTALL_DIR"
echo "📥 Downloading: $DOWNLOAD_URL"
curl -fsSL "$DOWNLOAD_URL" -o "$INSTALL_DIR/$BINARY_NAME"
if ! chmod +x "$INSTALL_DIR/$BINARY_NAME"; then
  echo "❌ Failed to mark binary executable: $INSTALL_DIR/$BINARY_NAME"
  exit 1
fi

echo "✅ Installed to: $INSTALL_DIR/$BINARY_NAME"
echo ""

# Add to PATH if needed
if echo ":$PATH:" | grep -q ":$HOME/.openskills/bin:"; then
  echo "✅ OpenSkills is already in your PATH"
else
  UPDATED=false
  for SHELL_RC in "$HOME/.zshrc" "$HOME/.bashrc"; do
    if [ -f "$SHELL_RC" ]; then
      if ! grep -q ".openskills/bin" "$SHELL_RC" 2>/dev/null; then
        echo "" >> "$SHELL_RC"
        echo "# OpenSkills CLI" >> "$SHELL_RC"
        echo "export PATH=\"$HOME/.openskills/bin:$PATH\"" >> "$SHELL_RC"
        echo "✅ Added OpenSkills to PATH in $SHELL_RC"
        UPDATED=true
      fi
    fi
  done

  if [ "$UPDATED" = false ]; then
    SHELL_RC="$HOME/.profile"
    if ! grep -q ".openskills/bin" "$SHELL_RC" 2>/dev/null; then
      echo "" >> "$SHELL_RC"
      echo "# OpenSkills CLI" >> "$SHELL_RC"
      echo "export PATH=\"$HOME/.openskills/bin:$PATH\"" >> "$SHELL_RC"
      echo "✅ Added OpenSkills to PATH in $SHELL_RC"
      UPDATED=true
    fi
  fi

  if [ "$UPDATED" = true ]; then
    echo ""
    echo "⚡ Run this to update your current shell:"
    if [ -f "$HOME/.zshrc" ]; then
      echo "   source ~/.zshrc"
    elif [ -f "$HOME/.bashrc" ]; then
      echo "   source ~/.bashrc"
    else
      echo "   source ~/.profile"
    fi
  else
    echo "⚠️  Could not add to PATH automatically"
    echo "   Add this to your shell config:"
    echo "   export PATH=\"$HOME/.openskills/bin:$PATH\""
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ OpenSkills installed successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Get started:"
echo "  openskills --help"
echo "  openskills tool-description | jq ."
echo "  openskills invoke demo --yes | jq ."
echo ""
