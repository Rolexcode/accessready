# AccessReady

AccessReady is an evidence-first accessibility readiness checker for small public events. It compares public event copy with venue and organizer notes, flags missing or contradictory access information, and drafts an attendee guide without inventing facts.

Built for the HyperBloom September 2026 AI/ML hackathon.

## Why this is different

- It does not certify legal compliance.
- It does not infer that a venue feature exists.
- Every supported claim carries a short source quote.
- Missing information stays explicitly unresolved.
- The product remains demoable without an API key.

## Local development

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Add a free Gemini Developer API key to `.env.local` to enable the model-backed review. Without a key—or if the model is unavailable—the same endpoint falls back to a deterministic local audit. This keeps the demo reliable while preserving the real AI integration.

## Architecture

- Next.js 16 App Router + React 19 + TypeScript
- Server-only Gemini REST integration (`GEMINI_API_KEY` is never bundled)
- Deterministic evidence and conflict rules as the reliability boundary
- Responsive, keyboard-accessible interface with light and dark themes
- No database, vector store, GPU, or paid hosting dependency

## Commands

```bash
npm run lint
npm run build
npm start
```

## Safety boundary

AccessReady is a communication aid, not an accessibility audit, legal opinion, or compliance certificate. Organizers remain responsible for verifying venue conditions and accommodations with the people and providers involved.
