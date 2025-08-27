#!/bin/bash

echo "========================================"
echo "SmartCallMate Team Deployment Builder"
echo "========================================"
echo

echo "[1/4] Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi

echo
echo "[2/4] Building React application..."
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to build React app"
    exit 1
fi

echo
echo "[3/4] Creating distribution packages..."
echo "Building for macOS (Intel and Apple Silicon)..."
npm run dist:mac
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to build macOS packages"
    exit 1
fi

echo
echo "[4/4] Build complete!"
echo
echo "Distribution packages created in 'dist' folder:"
echo "- SmartCallMate-1.0.0.dmg (macOS Installer)"
echo "- SmartCallMate-1.0.0-mac-x64.zip (Portable macOS Intel)"
echo "- SmartCallMate-1.0.0-mac-arm64.zip (Portable macOS Apple Silicon)"
echo
echo "Instructions for team members:"
echo "1. Download the .dmg file"
echo "2. Double-click to mount"
echo "3. Drag SmartCallMate to Applications folder"
echo "4. Right-click and select 'Open' (first time only)"
echo "5. Get API keys from Deepgram and OpenAI"
echo "6. Configure keys in Settings panel"
echo
echo "Opening dist folder..."
open dist