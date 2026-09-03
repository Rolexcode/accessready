import type { AuditInput, AuditResult } from "./audit-types";
import { runLocalAudit } from "./local-audit";

const SYSTEM_PROMPT = `You are an evidence-bound accessibility readiness reviewer for small public events.

Your job is not to certify legal compliance and not to infer venue features. Review only the supplied event listing and venue or organizer notes. Separate confirmed facts from missing details and contradictions. Keep exact short evidence quotes and their source. Never invent an accessibility claim, phone number, email, policy, or venue feature.

Use these exact status values: confirmed, needs-answer, conflict. Cover arrival and mobility, accessible facilities, hearing and communication, sensory comfort, seating and participation, access contact, service animals or support people. A public guide may openly say that an item is not yet confirmed.

Return only this JSON shape:
{
  "eventName": "string",
  "score": 0,
  "headline": "string",
  "summary": "string",
  "findings": [{
    "id": "kebab-case-string",
    "category": "string",
    "question": "string",
    "status": "confirmed | needs-answer | conflict",
    "summary": "string",
    "action": "string",
    "evidence": [{ "source": "Event listing | Venue notes", "quote": "exact short quote" }]
  }],
  "priorityQuestions": ["string"],
  "publicGuide": {
    "title": "string",
    "introduction": "string",
    "sections": [{ "heading": "string", "body": "string" }],
    "contactLine": "string"
  }
}`;

function looksLikeAudit(value: unknown): value is AuditResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AuditResult>;
  const findingsAreValid = candidate.findings?.every((finding) => {
    if (!finding || typeof finding !== "object") return false;
    const item = finding as Partial<AuditResult["findings"][number]>;
    return (
      typeof item.id === "string" &&
      typeof item.category === "string" &&
      typeof item.question === "string" &&
      (item.status === "confirmed" ||
        item.status === "needs-answer" ||
        item.status === "conflict") &&
      typeof item.summary === "string" &&
      typeof item.action === "string" &&
      Array.isArray(item.evidence) &&
      item.evidence.every(
        (evidence) =>
          evidence &&
          (evidence.source === "Event listing" ||
            evidence.source === "Venue notes") &&
          typeof evidence.quote === "string",
      )
    );
  });

  const guide = candidate.publicGuide as
    | Partial<AuditResult["publicGuide"]>
    | undefined;

  return (
    typeof candidate.eventName === "string" &&
    typeof candidate.score === "number" &&
    Array.isArray(candidate.findings) &&
    candidate.findings.length >= 4 &&
    findingsAreValid === true &&
    Array.isArray(candidate.priorityQuestions) &&
    candidate.priorityQuestions.every((question) => typeof question === "string") &&
    typeof candidate.headline === "string" &&
    typeof candidate.summary === "string" &&
    typeof guide?.title === "string" &&
    typeof guide.introduction === "string" &&
    Array.isArray(guide.sections) &&
    guide.sections.every(
      (section) =>
        section &&
        typeof section.heading === "string" &&
        typeof section.body === "string",
    ) &&
    typeof guide.contactLine === "string"
  );
}

export async function runGeminiAudit(input: AuditInput): Promise<AuditResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return runLocalAudit(input);

  const model = process.env.GEMINI_MODEL || "gemini-3.7-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const baseline = runLocalAudit(input);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Review these sources.\n\n[Event listing]\n${input.eventListing}\n\n[Venue notes]\n${input.venueNotes}\n\nReturn an AuditResult JSON object.`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) return baseline;

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return baseline;

    const parsed = JSON.parse(text) as unknown;
    if (!looksLikeAudit(parsed)) return baseline;

    return {
      ...parsed,
      score: Math.max(0, Math.min(100, Math.round(parsed.score))),
      mode: "gemini",
    };
  } catch {
    return baseline;
  }
}
