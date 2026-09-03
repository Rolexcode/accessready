# AccessReady

**One-line pitch:** AccessReady catches the moment an event listing says “accessible” but the venue notes say “three steps”—before an attendee reaches the door.

AccessReady is an evidence-first accessibility readiness checker for small public events. An organizer pastes the public event listing and the venue or organizer notes. AccessReady extracts access claims, compares the two sources, surfaces missing or contradictory details with short source quotes, prioritizes the questions that need an answer, and drafts a public attendee guide. It is a communication aid, not a legal compliance audit or certification.

Built for the HyperBloom September 2026 AI/ML hackathon.

## The 30-second demo

1. Select **Run the 30-second demo** on the home screen.
2. Watch AccessReady surface the contradiction: the listing promises wheelchair access, while the venue email says the main entrance has three steps and the step-free route opens later.
3. Point to the exact quotes, the “why it matters” action, and the prioritized questions.
4. Scroll to the publish-ready guide. It says what is confirmed and what attendees still need to ask about—without filling gaps with guesses.

The **Use your own sources** path remains available for a real listing and venue reply. The seeded case is fictional and exists only to make the product behavior reproducible during a demo.

## Hackathon description

Event accessibility information is often split across a polished public listing and an informal venue email. Those sources can disagree in ways that matter at the door: a listing may promise wheelchair access while the venue describes steps, a lift outage, or an entrance that opens after doors. AccessReady gives small-event organizers a fast pre-publish check for that information mess.

The workflow is deliberately evidence-first. It identifies semantic accessibility claims, keeps the source attached to each finding, distinguishes a missing answer from a contradiction, and turns unresolved items into prioritized clarification questions. It then drafts an attendee-facing guide whose wording is constrained by the supplied evidence. The result helps an organizer decide what to verify before publishing, while helping attendees see the limits of what is known.

The app is designed for a reliable live demo: a one-click seeded case produces a concrete contradiction, and the same endpoint works without an API key through a deterministic local verifier. With a Gemini Developer API key, Gemini performs the semantic review through a server-only REST call; the key is never bundled into the browser. The local rules remain a safety boundary and fallback, not a claim of model accuracy. AccessReady does not certify legal compliance, infer venue features, or replace conversations with venues and attendees.

## AI tools disclosure

- **Gemini API (optional):** Gemini 3.8 Flash receives the two pasted sources on the server and returns a structured review: extracted claims, conflict/missing classifications, follow-up questions, and a guide draft. The prompt explicitly requires source quotes and forbids invented facts.
- **Deterministic verifier and fallback:** Every Gemini citation must match the supplied source text before the AI result is accepted. Local parsing and rules also provide a reproducible no-key fallback; they are not presented as machine-learning intelligence or a guarantee of correctness.
- **Other development tools:** The interface was developed with Next.js, React, TypeScript, and standard coding assistants. No attendee data, user research, impact metrics, or model-performance claims are fabricated here.

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
- `gemini-3.8-flash` by default, configurable with `GEMINI_MODEL`
- Exact-citation validation plus deterministic evidence and conflict rules as the safety boundary and fallback
- Responsive, keyboard-accessible interface with light/dark themes and reduced-motion support
- No database, vector store, GPU, or paid hosting dependency

## Commands

```bash
npm run lint
npm run build
npm start
```

## Safety boundary

AccessReady is a communication aid, not an accessibility audit, legal opinion, or compliance certificate. Organizers remain responsible for verifying venue conditions and accommodations with the people and providers involved.
