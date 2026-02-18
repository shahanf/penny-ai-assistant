# Penny AI – Project context for Claude

Use this when opening or working on this repo in Claude. For full details see the root [README.md](../README.md).

## One-line summary

**Penny** is an AI assistant for an EWA admin portal (React + Vite). She answers questions about employees, adoption, transfers, savings, and balances using CSV-backed data, either via pattern matching or an optional Claude API.

## Where to change what

| Goal | File(s) |
|------|--------|
| Change what Penny says or how she answers (pattern mode) | `src/utils/pennyQueryProcessor.js` |
| Change system prompt / context for Claude API | `src/services/pennyAIService.js` → `buildSystemPrompt()` |
| Add or change data Penny can use | `src/services/pennyDataService.js`, `src/services/csvDataLoader.js`; CSV files in `data/`, `public/data/` |
| Edit Penny’s personality / examples for tuning | `penny-ai-studio/SYSTEM_PROMPT.txt`, `penny-ai-studio/SAMPLE_CONVERSATIONS.jsonl` |
| Change chat UI or example prompts | `src/App.jsx`, `src/components/penny/*`, `src/constants/pennyExampleQuestions.js` |

## Response shape (keep consistent)

All Penny responses (pattern or API) use:

- `text` (string, markdown)
- `type` (e.g. `response`, `greeting`, `error`, `not-found`)
- `richContent` (optional): `{ type, data }`; may include `expandList` for the side panel
- `actions`, `suggestions`, `followUp` (optional)

## Commands

- `npm run dev` — start dev server  
- `npm run build` — build for production (`dist/`)  
- `npm run lint` — run ESLint  

## Data

- No database. Data is loaded from CSV (Client Summary, Employee Summary, etc.) via `csvDataLoader` and exposed by `pennyDataService`.  
- To add new facts or entities, update the CSVs and/or the data service and system prompt.
