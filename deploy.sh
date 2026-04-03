#!/bin/bash
# Build and deploy Glance to /Applications
# Usage: ./deploy.sh          — quick deploy (patches existing app, keeps permissions)
#        ./deploy.sh --full   — full repackage (requires re-granting screen recording)
set -e

export PATH="/opt/homebrew/bin:$PATH"
cd "$(dirname "$0")"

FULL=false
if [ "$1" = "--full" ]; then FULL=true; fi

echo "→ Building shared…"
npx tsc -p packages/shared/tsconfig.json

echo "→ Building main process…"
npx tsc -p packages/electron/tsconfig.json

echo "→ Building renderer…"
npx vite build --config packages/electron/renderer/vite.config.ts 2>&1 | tail -3

echo "→ Closing running Glance…"
osascript -e 'quit app "Glance"' 2>/dev/null || true
sleep 1

if [ "$FULL" = true ] || [ ! -d "/Applications/Glance.app" ]; then
  echo "→ Full repackage…"
  cd packages/electron
  USE_SYSTEM_7ZA=true npx electron-builder@latest --mac --dir 2>&1 | grep -E '(packaging|skipped|arm64)'
  cd ../..
  codesign --force --deep --sign - packages/electron/release/mac-arm64/Glance.app
  rm -rf /Applications/Glance.app
  cp -R packages/electron/release/mac-arm64/Glance.app /Applications/Glance.app
  echo "⚠  Full repackage — you may need to re-grant Screen Recording permission"
else
  echo "→ Patching existing app (permissions preserved)…"
  APP_RESOURCES="/Applications/Glance.app/Contents/Resources/app"
  # Update compiled main process + preloads
  cp -R packages/electron/dist/* "$APP_RESOURCES/dist/"
  # Update renderer UI
  cp -R packages/electron/ui/* "$APP_RESOURCES/ui/"
  # Update shared lib
  cp -R packages/shared/dist/* "$APP_RESOURCES/node_modules/@glance/shared/dist/"
fi

echo "→ Launching…"
open /Applications/Glance.app

echo "✓ Done!"
