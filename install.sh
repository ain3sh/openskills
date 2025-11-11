#!/usr/bin/env bash
set -euo pipefail

# OpenSkills installer script
# Usage: curl -fsSL https://github.com/ain3sh/openskills/releases/latest/download/install.sh | bash

REPO="ain3sh/openskills"
INSTALL_DIR="${HOME}/.local/bin"
BINARY_NAME="openskills"

# Detect OS and architecture
OS="$(uname -s)"
ARCH="$(uname -m)"

# Map to release binary names
case "$OS" in
    Linux*)
        PLATFORM="linux"
        ;;
    Darwin*)
        PLATFORM="darwin"
        ;;
    *)
        echo "Error: Unsupported OS: $OS"
        exit 1
        ;;
esac

case "$ARCH" in
    x86_64)
        ARCH="x64"
        ;;
    aarch64|arm64)
        ARCH="arm64"
        ;;
    *)
        echo "Error: Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

BINARY_FILE="${BINARY_NAME}-${PLATFORM}-${ARCH}"

echo "Installing OpenSkills for ${PLATFORM}-${ARCH}..."

# Create install directory if it doesn't exist
mkdir -p "$INSTALL_DIR"

# Get latest release URL
DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/${BINARY_FILE}"

# Download binary
echo "Downloading from ${DOWNLOAD_URL}..."
if command -v curl > /dev/null; then
    curl -fsSL "$DOWNLOAD_URL" -o "${INSTALL_DIR}/${BINARY_NAME}"
elif command -v wget > /dev/null; then
    wget -q "$DOWNLOAD_URL" -O "${INSTALL_DIR}/${BINARY_NAME}"
else
    echo "Error: Neither curl nor wget found. Please install one of them."
    exit 1
fi

# Make executable
chmod +x "${INSTALL_DIR}/${BINARY_NAME}"

# Add to PATH if not already there
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    echo ""
    echo "Add the following to your shell configuration file (.bashrc, .zshrc, etc.):"
    echo "  export PATH=\"\$PATH:${INSTALL_DIR}\""
    echo ""
    echo "Or run this command to add it now:"
    echo "  echo 'export PATH=\"\$PATH:${INSTALL_DIR}\"' >> ~/.bashrc"
fi

echo ""
echo "✅ OpenSkills installed successfully to ${INSTALL_DIR}/${BINARY_NAME}"
echo ""
echo "Run 'openskills --help' to get started (you may need to restart your shell or source your config file)"
