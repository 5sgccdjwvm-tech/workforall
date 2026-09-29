#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
npx prisma generate
npx prisma db push
node -e "require('typescript')" >/dev/null 2>&1 || true
npx tsx prisma/seed.ts 2>/dev/null || npx ts-node --transpile-only prisma/seed.ts 2>/dev/null || true
npm run dev
