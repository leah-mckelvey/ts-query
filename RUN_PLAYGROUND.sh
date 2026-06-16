#!/bin/bash

# Normalized Cache Test Playground Launcher
# This script builds packages and starts the dev server

set -e

echo "🚀 Starting Normalized Cache Test Playground..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the root of the ts-query repo"
    exit 1
fi

# Build packages first
echo "📦 Building packages..."
npm run build --workspaces --if-present

echo ""
echo "✅ Build complete!"
echo ""
echo "🎮 Starting playground dev server..."
echo "   Opening at http://localhost:5173"
echo ""
echo "   Press Ctrl+C to stop"
echo ""

# Start the playground
cd playground/normalized-cache-test
npm run dev
