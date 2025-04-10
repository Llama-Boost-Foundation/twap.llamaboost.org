# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- Install: `npm install`
- Start server: `npm start`
- Development mode: `npm run dev`
- Setup CLI: `npm link`
- Run CLI: `coingecko-twap --id <coin-id> --days <number>`
- Lint: Use StandardJS style (implicit)

## Code Style
- JavaScript with Node.js and Express
- Format: 4-space indentation
- Imports: Group dependencies at top (express, path, axios, lodash)
- Naming: camelCase for variables, descriptive names
- Async/Await: Use for API calls and asynchronous operations
- Error Handling: Add try/catch blocks for API calls
- Comments: Include descriptive comments for complex logic
- Web Front-end: HTML, CSS, browser-based JavaScript
- API Usage: Direct CoinGecko API calls from browser
- UI Components: Form inputs, chart visualization, data table
- Function Patterns: Use arrow functions for callbacks and async operations