# Penny AI – Theme & Module Description for Replication

Use this document to describe the look, feel, and structure of the Penny AI experience when briefing an AI (e.g. Claude Code) to replicate it in a new app.

---

## 1. Theme summary (one paragraph)

**Penny** is a friendly, premium fintech assistant UI. The overall feel is **warm purple–fuchsia–indigo**: full-bleed gradient backgrounds (purple-600 → purple-700 → indigo-800), soft glows and blur behind the main card, and a central **frosted glass card** (white/95 with backdrop blur, subtle purple border and inner gradient). Content uses **slate** for text and **purple** for accents, CTAs, and hovers. The mascot is a **golden coin character** (amber/gold gradient with brown rim). The tone is **approachable and professional**: rounded corners, light shadows, gentle pulse/glow animations, and optional confetti. No dark mode in the reference; it’s a light-content-on-vivid-gradient layout.

---

## 2. Color palette (Tailwind / hex)

| Role | Tailwind | Hex / notes |
|------|----------|-------------|
| **Page background** | `from-purple-600 via-purple-700 to-indigo-800` | Gradient full screen |
| **Card glow (behind main card)** | `from-purple-400/30 via-fuchsia-400/30 to-purple-400/30` | Blurred, ~30% opacity, slow pulse |
| **Main surface (chat card)** | `bg-white/95` + `backdrop-blur-xl` | Frosted glass |
| **Card border** | `border-purple-200/50` | Soft purple |
| **Inner card gradient** | `from-purple-50/50 to-transparent` | Very subtle top tint |
| **Primary accent / CTA** | `from-purple-500 to-fuchsia-500`, hover `purple-600` / `fuchsia-600` | Buttons, send icon |
| **Focus / input glow** | `from-purple-400 via-fuchsia-400 to-purple-400` | Blur, ~50% on focus |
| **Input border (focus)** | `border-purple-400` | |
| **Text primary** | `text-slate-800` | Headings, body |
| **Text secondary** | `text-slate-500`, `text-gray-500` | Labels, hints |
| **Placeholder** | `placeholder:text-slate-400` | |
| **Interactive neutrals** | `bg-gray-50`, `border-gray-200` | Lists, prompts |
| **Hover (purple tint)** | `hover:bg-purple-50`, `hover:border-purple-200`, `hover:text-purple-600/700` | Buttons, list items |
| **Mascot (Penny coin)** | Gold gradient `#fbbf24` → `#b45309`, rim `#92400e`, `#b45309` | Coin body and stroke |
| **Confetti** | `rgba(168,85,247)`, `rgba(139,92,246)`, `rgba(192,132,252)`, `rgba(236,72,153)`, `rgba(99,102,241)` | Purple, violet, pink, indigo |

---

## 3. Typography

- **Font**: System stack (e.g. `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, ...`).
- **Title**: e.g. “Hi, I’m Penny!” — `text-xl` or `text-2xl`, `font-semibold`, `text-slate-800`.
- **Subtitle**: e.g. “Your AI-powered assistant” — `text-xs` or `text-sm`, `text-slate-500`.
- **Labels (e.g. “Try asking”)**: `text-xs font-medium text-gray-500 uppercase tracking-wide`.
- **Body / messages**: `text-sm`; markdown allowed in assistant messages.
- **Keyboard hint**: `text-[10px] text-slate-400`; kbd: `bg-slate-100 rounded text-slate-500 font-mono`.

---

## 4. Layout & components

- **Page**: Full viewport, centered content, gradient background, optional confetti layer (fixed, pointer-events-none).
- **Main card**: Max width ~`max-w-3xl`, rounded (`rounded-xl` or `rounded-2xl`), `shadow-xl`/`shadow-2xl`, overflow hidden. Optional side panel for “expanded list” (same height, `rounded-r-xl`, `border-l-0 border-purple-200/50`).
- **Card structure**: Header (avatar + title + subtitle) → scrollable message area → fixed input + sample prompts + keyboard hint.
- **Input**: White background, `rounded-lg`/`rounded-xl`, `border-2 border-slate-200`, focus `border-purple-400` and glow; send button with purple–fuchsia gradient, white icon.
- **Sample prompts**: Grid or flex of pill buttons: `bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-200 rounded-lg text-gray-700 hover:text-purple-700`, small text.
- **User message bubbles**: Align right; assistant (Penny) left. Bubbles: rounded (e.g. `rounded-2xl`), assistant `rounded-bl-none`, neutral gray for assistant (`bg-gray-100`), user can be purple-tinted or white with border.
- **Data cards / tables**: Inside messages: `border border-purple-100`, `from-purple-50/90 to-indigo-50/90` for gradient cards; adoption/status can use green/orange/red for ranges.
- **Buttons (secondary)**: e.g. “New Chat”, “History” — `text-xs`/`text-sm`, `text-slate-500 hover:text-purple-600`, `rounded-lg`, `hover:bg-purple-50`.

---

## 5. Motion & polish

- **Card entrance**: Slight scale + fade (e.g. `scale(0.95)` → `1`, `translateY(-10px)` → `0`), ~0.3s ease-out.
- **Background glow**: Slow pulse on the blurred gradient behind the card (e.g. 3s ease-in-out, opacity ~0.3–0.5).
- **Input**: Glow opacity 0 → 50% on focus, ~300ms transition.
- **Confetti**: Optional; small circles, fall + rotate, purple/pink/indigo palette.
- **Mascot**: Optional entrance (bounce, parachute, vault, etc.); idle states: wave, happy, thinking (bouncing dots), dancing (translate animation).
- **Thinking cursor**: Optional custom cursor (e.g. small coin/avatar) when “Penny is thinking”.

---

## 6. Penny AI “module” (feature set to replicate)

- **Chat UI**: Single main view with header (mascot + title), message list, input, and rotating sample prompts.
- **Message types**: User (right-aligned), assistant (left-aligned with avatar). Assistant messages can include: plain text (markdown), data cards, tables, employee/company cards, report lists, and actions (e.g. navigate, download, show table).
- **Response contract**: Each assistant turn has: `text`, `type` (e.g. response, greeting, error, not-found), optional `richContent` (type + data; may include `expandList` for a side panel), optional `actions`, `suggestions`, `followUp`.
- **Sample prompts**: Short, rotating “Try asking” / “More questions” prompts; can be dynamic (e.g. inject employee/company names).
- **Side panel**: Optional expandable list (e.g. employees or companies) when `richContent.expandList` is set; same styling as main card, closes by clicking main card or a close control.
- **Conversation**: Session-only (no persistence in reference); “New Chat” and optional “History” for in-session previous conversations.
- **Accessibility**: Focus states (purple), keyboard (Enter to send), aria-labels on icon buttons and expand/collapse.

---

## 7. Copy-paste prompt for Claude Code

You can paste the following into a new app project when using Claude Code:

```
I'm building an app that should match the "Penny AI" theme and module.

Theme:
- Full-page gradient background: purple to indigo (e.g. from-purple-600 via-purple-700 to-indigo-800).
- Main content in a frosted glass card: white/95, backdrop-blur-xl, rounded-xl/2xl, shadow-xl, border border-purple-200/50.
- Soft purple/fuchsia glow behind the card (blurred gradient, slow pulse).
- Accent color: purple-to-fuchsia gradient for primary buttons and focus states.
- Text: slate-800 primary, slate-500 secondary; placeholders slate-400.
- Interactive elements: gray-50 default, hover to purple-50 / purple-200 border / purple-600 text.
- Optional: confetti in purple/pink/indigo; mascot is a golden coin (amber/gold gradient).

Layout:
- Centered card, max-width ~3xl; header (avatar + title + subtitle), scrollable messages, fixed input with send button, sample prompt pills below.
- Optional right-side panel for expanded lists (same height, rounded-r-xl, white, purple border).

Components:
- Rounded input with focus glow and purple–fuchsia send button.
- User messages right; assistant messages left with rounded bubble (e.g. rounded-2xl rounded-bl-none), gray-100 or purple-50.
- Data cards/tables: light purple/indigo gradient (purple-50 to indigo-50), border-purple-100.
- Small utility buttons: text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg.

Motion:
- Card entrance: slight scale + fade up (~0.3s). Background glow: slow pulse. Input: glow on focus. Optional: confetti, mascot entrance/idle animations.

Replicate the "Penny AI module": chat with user/assistant messages, structured responses (text + optional richContent with data cards/tables/expandList), actions and suggestions, rotating sample prompts, optional side panel for lists, New Chat and in-session History. Use the response shape: { text, type, richContent?, actions?, suggestions?, followUp? }.
```

---

## 8. File reference (in this repo)

- **Global styles / animations**: `src/index.css`
- **Main chat layout and gradient/glow/card**: `src/App.jsx`
- **Message bubbles and data cards**: `src/components/penny/PennyMessage.jsx`
- **Mascot (coin avatar)**: `src/components/PennyAvatar.jsx`
- **Input + prompts styling**: `src/App.jsx` (form and sample prompts), `src/components/penny/PennySamplePrompts.jsx`
- **Typing indicator**: `src/components/penny/PennyTypingIndicator.jsx`
- **Tailwind**: `tailwind.config.js` (default theme; no custom tokens in reference)
