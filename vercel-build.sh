#!/bin/bash
set -e

echo "=== Starting Flutter Web Build for Vercel ==="

# Check if flutter is installed; if not, clone stable branch into _flutter
if ! command -v flutter &> /dev/null; then
  if [ ! -d "_flutter/bin" ]; then
    echo "Cloning Flutter SDK (stable branch)..."
    git clone https://github.com/flutter/flutter.git --depth 1 -b stable _flutter
  fi
  export PATH="$PWD/_flutter/bin:$PATH"
fi

echo "Flutter version:"
flutter --version

echo "Configuring Flutter for Web..."
flutter config --no-analytics
flutter config --enable-web

echo "Resolving dependencies..."
flutter pub get

echo "Building release web bundle..."
flutter build web --release --no-tree-shake-icons

echo "=== Build completed successfully! Output in build/web ==="
