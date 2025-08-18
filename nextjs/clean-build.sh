#!/bin/bash
# Clean and rebuild script for Windows Next.js build issues

echo "🧹 Cleaning Next.js build cache..."
echo "================================"

# Remove .next folder completely
if [ -d ".next" ]; then
    echo "Removing .next folder..."
    rm -rf .next
    echo "✅ .next folder removed"
fi

# Remove node_modules/.cache if it exists
if [ -d "node_modules/.cache" ]; then
    echo "Removing node_modules cache..."
    rm -rf node_modules/.cache
    echo "✅ node_modules cache removed"
fi

# Clear npm cache
echo "Clearing npm cache..."
npm cache clean --force

echo ""
echo "🔨 Rebuilding project..."
echo "================================"

# Run fresh build
npm run build

echo ""
echo "================================"
echo "✅ Build process complete!"
