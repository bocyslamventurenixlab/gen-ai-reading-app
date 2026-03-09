#!/bin/bash
set -e

echo "🔧 Installing Playwright MCP dependencies..."

# Install Google Chrome
echo "📦 Installing Google Chrome..."
curl -sL https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -o /tmp/chrome.deb
sudo dpkg -i /tmp/chrome.deb || sudo apt-get install -f -y
rm /tmp/chrome.deb

echo "✅ Chrome installed: $(google-chrome --version)"

# Install Playwright browsers (chromium as fallback)
echo "📦 Installing Playwright Chromium..."
npx playwright@latest install chromium
npx playwright@latest install-deps chromium

echo "✅ Playwright MCP setup complete!"
