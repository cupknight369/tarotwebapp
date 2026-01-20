# Tarot Card Application

A TypeScript-based tarot card drawing application using Alpine.js.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the TypeScript code:
```bash
npm run build
```

This will compile `index.ts` to `index.js` in the same directory.

## Development

```bash
npm run dev
```
This will run a python3 http server on port 8000 and watch for file changes.

## Project Structure

- `index.ts` - Main TypeScript source file
- `index.js` - Compiled JavaScript (generated, do not edit)
- `types/alpine.d.ts` - TypeScript type definitions for Alpine.js
- `tsconfig.json` - TypeScript configuration
- `package.json` - Node.js dependencies and scripts

## Notes

- The HTML file uses ES modules (`type="module"`) to load the compiled JavaScript
- Alpine.js functions (`shuffle`, `drawMultipleCards`, etc.) are exposed globally via the `window` object for Alpine.js template access
