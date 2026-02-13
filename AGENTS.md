# Penny AI – Guidance for AI agents

When opening or modifying this project (e.g. in Cursor or Claude), use this as context.

## Project

**Penny AI Assistant** – React + Vite app. Penny is an AI chat assistant for an EWA (Earned Wage Access) admin portal. She answers questions about employees, adoption, transfers, savings, and outstanding balances. Data comes from CSV files; responses are either pattern-based or from an optional Claude API.

## Entry points

- **Full project overview**: [README.md](README.md)
- **Short context for Claude**: [.claude/PROJECT_README.md](.claude/PROJECT_README.md)
- **Cursor rules**: [.cursor/rules/penny-ai-project.mdc](.cursor/rules/penny-ai-project.mdc) (always-applied project context)
- **Penny content and tuning**: [penny-ai-studio/README.md](penny-ai-studio/README.md)
- **Deployment**: [DEPLOYMENT.md](DEPLOYMENT.md)

## Key paths

- **Query logic (patterns)**: `src/utils/pennyQueryProcessor.js`
- **AI service (system prompt, Claude)**: `src/services/pennyAIService.js`
- **Data**: `src/services/pennyDataService.js`, `src/services/csvDataLoader.js`; CSVs in `data/`, `public/data/`
- **Main UI**: `src/App.jsx`; components in `src/components/penny/`, `PennyAvatar.jsx`

Keep Penny’s response shape consistent: `text`, `type`, optional `richContent`, `actions`, `suggestions`, `followUp`.
