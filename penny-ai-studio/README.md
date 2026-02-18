# Penny AI - Google AI Studio Files

This folder contains files for editing and improving Penny in Google AI Studio.

## Files Included

### 1. `SYSTEM_PROMPT.txt`
The main system prompt that defines Penny's personality, knowledge, and response format.

**How to use in Google AI Studio:**
1. Open Google AI Studio
2. Create a new prompt or chat
3. Copy the contents of `SYSTEM_PROMPT.txt` into the "System instructions" field

### 2. `SAMPLE_CONVERSATIONS.jsonl`
Example conversations showing how Penny should respond to various queries. Each line is a separate conversation in JSON format.

**How to use:**
- Use these as examples when fine-tuning
- Reference them to understand the expected response format
- Test your changes against these examples

### 3. `DATA_CONTEXT.json`
All the mock data that Penny knows about - employees, transfers, savings, etc.

**How to use:**
- Update this file if you change the underlying data
- Reference it when adding new query types
- Use it to test edge cases

## Response Format

Penny always responds with a JSON object:

```json
{
  "text": "Main response with **markdown** formatting",
  "type": "response|greeting|error|not-found|acknowledgment",
  "richContent": {
    "type": "data-card|table|employee-card|report-list|ticket-card",
    "data": { ... }
  },
  "actions": [
    { "label": "Button Text", "type": "navigate|download|show-table", "target": "/path" }
  ],
  "suggestions": ["Follow-up question 1?", "Follow-up question 2?"],
  "followUp": "Would you like more details?"
}
```

## Testing Queries

Try these queries to test your changes:

**Basic:**
- "Hi" / "Hello"
- "Thanks!"

**Balances:**
- "What's the total outstanding balance?"
- "Who owes money?"
- "Does Sarah Johnson owe anything?"
- "Check Michael Chen's balance"

**Employees:**
- "Is Sarah Johnson enrolled?"
- "Look up Emily Rodriguez"
- "How many employees do we have?"
- "Who has outstanding balances?"

**Transfers:**
- "How many transfers this month?"
- "Show transfer stats"
- "What's the average transfer amount?"

**Savings:**
- "How much have employees saved?"
- "Who are the top savers?"
- "How many savings accounts?"

**Adoption:**
- "What's our adoption rate?"
- "How many people are enrolled?"
- "Show enrollment stats"

**Reports:**
- "I need a transfers report"
- "What reports are available?"
- "Generate a savings report"

**Navigation:**
- "Take me to employees"
- "Go to transfers page"
- "Open settings"

**Support:**
- "Any open tickets?"
- "Is there a ticket about missed salary?"

**Satisfaction:**
- "What's the satisfaction score?"
- "How are employees feeling?"

## Importing Back to Code

After editing in Google AI Studio, update these files in the admin portal:

1. **System prompt changes** → Update `src/services/pennyAIService.js` (the `buildSystemPrompt()` function)

2. **New query patterns** → Update `src/utils/pennyQueryProcessor.js` (add new handlers or patterns)

3. **Data changes** → Update `src/services/pennyDataService.js`

## Tips for Improvement

1. **Add more query variations** - Think of different ways users might ask the same question
2. **Improve error handling** - Better "not found" messages with helpful suggestions
3. **Add context awareness** - Remember previous messages in the conversation
4. **Expand data coverage** - Add new data points Penny can answer about
5. **Better formatting** - Use tables, cards, and actions appropriately
