import { NextResponse } from "next/server";
import type { AuditInput } from "@/lib/audit-types";
import { runGeminiAudit } from "@/lib/gemini-audit";

const MAX_SOURCE_LENGTH = 12_000;

function isAuditInput(value: unknown): value is AuditInput {
  if (!value || typeof value !== "object") return false;
  const input = value as Partial<AuditInput>;
  return (
    typeof input.eventListing === "string" &&
    typeof input.venueNotes === "string"
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The audit request was not valid JSON." },
      { status: 400 },
    );
  }

  if (!isAuditInput(body)) {
    return NextResponse.json(
      { error: "Add both the event listing and venue notes." },
      { status: 400 },
    );
  }

  const input = {
    eventListing: body.eventListing.trim(),
    venueNotes: body.venueNotes.trim(),
  };

  if (input.eventListing.length < 40 || input.venueNotes.length < 40) {
    return NextResponse.json(
      { error: "Add enough source detail to run a useful evidence check." },
      { status: 422 },
    );
  }

  if (
    input.eventListing.length > MAX_SOURCE_LENGTH ||
    input.venueNotes.length > MAX_SOURCE_LENGTH
  ) {
    return NextResponse.json(
      { error: "Keep each source under 12,000 characters." },
      { status: 413 },
    );
  }

  const result = await runGeminiAudit(input);
  return NextResponse.json(result);
}
