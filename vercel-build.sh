#!/bin/bash
set -e

echo "=== Starting Next.js App Build for Vercel ==="
cd next-app
npm install
npm run build
