#!/bin/bash
npx concurrently \
  --names "SERVER,FRONTEND" \
  --prefix-colors "cyan,magenta" \
  "cd server && npm run dev" \
  "cd frontendV2 && npm run dev"
