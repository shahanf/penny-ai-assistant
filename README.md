# Penny AI Assistant

Penny is an AI-powered assistant for an **EWA (Earned Wage Access) admin portal**. She helps HR administrators and managers get information about employees' use of the EWA program via natural language (e.g., balances, adoption, transfers, savings, reports).

## Tech stack

- **React 18** + **Vite 7** + **React Router 7**
- **Tailwind CSS** for styling
- **No backend required for default mode**: pattern-based responses driven by CSV data
- **Optional**: Claude API integration when `VITE_PENNY_AI_MODE=claude` (see [Deployment](#deployment))

## Quick start

```bash
npm install
npm run dev
```

Open the app (e.g. http://localhost:5173). The main UI is Penny’s chat interface.

- **Build**: `npm run build` → output in `dist/`
- **Preview**: `npm run preview`
- **Lint**: `npm run lint`

## Project structure

| Path | Purpose |
|------|--------|
| `src/App.jsx` | Main app; hosts **Penny chat UI** (PennyInterface), routing, PennyChatProvider |
| `src/components/penny/` | Penny UI: `PennyMessage`, `PennySearchBar`, `PennyTypingIndicator`, `PennyListExpandedPanel`, etc. |
| `src/components/PennyAvatar.jsx` | Penny avatar (waving, happy, dancing states) |
| `src/context/PennyChatContext.jsx` | Shared chat context if needed across components |
| `src/services/pennyAIService.js` | **AI entry point**: `processQueryWithAI()`. Builds system prompt from live data, calls Claude API or pattern processor |
| `src/services/pennyDataService.js` | **Data layer**: loads CSVs via `csvDataLoader`, exposes adoption/transfers/savings/balances/employees/companies |
| `src/services/csvDataLoader.js` | Loads and caches CSV files from `public/data/` and `data/` |
| `src/utils/pennyQueryProcessor.js` | **Pattern-based logic**: intent matching, response generation when not using Claude |
| `src/constants/pennyExampleQuestions.js` | Rotating example prompts shown in the chat UI |
| `data/` | CSV data (Client Summary, Employee Summary, Admin Summary, Test) |
| `public/data/` | Additional CSV data served statically (e.g. Test) |
| `penny-ai-studio/` | **Content for tuning Penny**: `SYSTEM_PROMPT.txt`, `DATA_CONTEXT.json`, `SAMPLE_CONVERSATIONS.jsonl`, `TEST_QUERIES.txt`, and a [README](penny-ai-studio/README.md) for Google AI Studio |

## How Penny responds

1. **Pattern mode (default)**  
   `pennyAIService` calls `pennyQueryProcessor`: synonym/keyword matching and handlers produce a structured response (text, `richContent`, actions, suggestions).

2. **Claude mode**  
   Set `VITE_PENNY_AI_MODE=claude` and configure `VITE_CLAUDE_API_ENDPOINT` (and optionally `VITE_CLAUDE_API_KEY`). `pennyAIService.buildSystemPrompt()` builds context from `pennyDataService` (CSV-backed); the same response shape is expected from the API.

Response shape (both modes):

- `text`: markdown string
- `type`: e.g. `response`, `greeting`, `error`, `not-found`, `acknowledgment`
- `richContent`: optional `{ type, data }` (e.g. data-card, table, employee-card, report-list); may include `expandList` to open the side panel
- `actions`: optional list of `{ label, type, target }` (e.g. navigate, download, show-table)
- `suggestions` / `followUp`: optional

## Data sources

- **Client Summary** (`data/Client Summary/data.csv` etc.): company-level adoption, transfers.
- **Employee Summary** (`data/Employee Summary/data.csv`): per-employee state (enrolled, paused, location, paytype, savings, outstanding).
- **Admin Summary**: admin-level aggregates.
- **Outstanding balances / Save accounts**: can be in CSVs or derived from summaries (see `csvDataLoader` and `pennyDataService`).

Data is loaded at runtime; no database. To change what Penny “knows”, update the CSVs and/or `pennyDataService` / `buildSystemPrompt()`.

## Deployment

- **Netlify**: see [DEPLOYMENT.md](DEPLOYMENT.md). Build command: `npm run build`; publish directory: `dist`.
- Optional env vars for Claude: `VITE_PENNY_AI_MODE=claude`, `VITE_CLAUDE_API_ENDPOINT`, `VITE_CLAUDE_API_KEY` (prefer proxying through a backend in production).

## Working on Penny in an AI IDE (e.g. Claude)

- **Behavior and personality**: see `penny-ai-studio/SYSTEM_PROMPT.txt` and `penny-ai-studio/README.md`.
- **Adding or changing query patterns**: edit `src/utils/pennyQueryProcessor.js` (synonyms, handlers, response builders).
- **System prompt used by Claude**: `src/services/pennyAIService.js` → `buildSystemPrompt()` (driven by `pennyDataService`).
- **Data shape and APIs**: `src/services/pennyDataService.js` and `src/services/csvDataLoader.js`.
- **UI and example prompts**: `src/App.jsx`, `src/components/penny/*`, `src/constants/pennyExampleQuestions.js`.

For a short “project context” summary when opening in Claude, see [.claude/PROJECT_README.md](.claude/PROJECT_README.md).
