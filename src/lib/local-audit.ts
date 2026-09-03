import type {
  AuditFinding,
  AuditInput,
  AuditResult,
  Evidence,
  FindingStatus,
} from "./audit-types";

type SourceName = Evidence["source"];

type SourceSentence = {
  source: SourceName;
  text: string;
};

type Rule = {
  id: string;
  category: string;
  question: string;
  positive: RegExp;
  negative?: RegExp;
  conflict?: RegExp;
  confirmedSummary: string;
  missingSummary: string;
  conflictSummary?: string;
  confirmedAction: string;
  missingAction: string;
  conflictAction?: string;
};

const rules: Rule[] = [
  {
    id: "step-free-arrival",
    category: "Arrival & mobility",
    question: "Can an attendee enter step-free from the advertised opening time?",
    positive: /wheelchair accessible|step[- ]free|accessible entrance|ramp/i,
    conflict: /\bsteps?\b|stairs?|loading[- ]bay|only opens? (?:it )?(?:from|after)|lift (?:is )?(?:currently )?(?:unavailable|out of service)/i,
    confirmedSummary: "A step-free or wheelchair-accessible route is described.",
    missingSummary: "The evidence does not describe a step-free arrival route.",
    conflictSummary: "The accessibility claim conflicts with the stated entrance or timing details.",
    confirmedAction: "Publish the exact entrance, route, opening time, and who can assist.",
    missingAction: "Confirm the route from street or parking area to the event space.",
    conflictAction: "Resolve whether the step-free entrance is usable when doors open before publishing the event as wheelchair accessible.",
  },
  {
    id: "accessible-toilet",
    category: "Facilities",
    question: "Is an accessible toilet reachable throughout the event?",
    positive: /accessible (?:toilet|restroom|bathroom)/i,
    conflict: /first floor|upstairs|lift (?:is )?(?:currently )?(?:unavailable|out of service)|stairs? only/i,
    confirmedSummary: "An accessible toilet is identified.",
    missingSummary: "Accessible toilet information is missing.",
    conflictSummary: "An accessible toilet is mentioned, but the stated route may make it unreachable.",
    confirmedAction: "Add its location and route to the attendee guide.",
    missingAction: "Ask the venue whether an accessible toilet is available and where it is.",
    conflictAction: "Confirm a reachable alternative or state clearly that an accessible toilet is not available.",
  },
  {
    id: "captions-and-materials",
    category: "Hearing & communication",
    question: "Will talks be captioned or supported with accessible materials?",
    positive: /live captions?|captioner|sign language|interpreter|hearing loop|slides? (?:will be|are) (?:shared|available)/i,
    negative: /no captioner|not captioned|captions? (?:are )?not available|have not collected slides/i,
    confirmedSummary: "Communication access support is described.",
    missingSummary: "Captions, interpretation, hearing support, and accessible slides are not confirmed.",
    confirmedAction: "Publish which sessions are supported and how attendees access the service.",
    missingAction: "Confirm captions or an alternative, and collect accessible speaker materials in advance.",
  },
  {
    id: "quiet-space",
    category: "Sensory comfort",
    question: "Is there a defined quiet or low-sensory space?",
    positive: /quiet (?:room|space|corner|area)|low[- ]sensory|sensory room/i,
    conflict: /if (?:somebody|someone|an attendee) asks|if requested|may be available/i,
    confirmedSummary: "A quiet or low-sensory space is described.",
    missingSummary: "No quiet or low-sensory space is described.",
    conflictSummary: "A quiet area is possible, but its location and availability are not yet confirmed.",
    confirmedAction: "Publish its location, hours, and whether an attendee needs to ask first.",
    missingAction: "Identify a lower-stimulation area or state that none is available.",
    conflictAction: "Assign a real space and include clear instructions before promising it publicly.",
  },
  {
    id: "seating",
    category: "Seating & participation",
    question: "Can attendees request suitable seating or remain with a companion?",
    positive: /reserved seating|accessible seating|companion seating|seating request|chairs? (?:with|without) arms/i,
    conflict: /first come,? first served/i,
    confirmedSummary: "Accessible or companion seating is described.",
    missingSummary: "The seating policy does not explain access requests or companion seating.",
    conflictSummary: "First-come seating may not preserve suitable or companion spaces.",
    confirmedAction: "State how to request a seat and whether companions can remain together.",
    missingAction: "Reserve suitable spaces and give attendees a request route.",
    conflictAction: "Protect accessible and companion seating from the general first-come allocation.",
  },
  {
    id: "access-contact",
    category: "Support & contact",
    question: "Is there a named route for access questions and accommodation requests?",
    positive: /access(?:ibility)? (?:questions?|requests?)|accommodations?[^.\n]{0,50}(?:email|contact)|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i,
    confirmedSummary: "A contact route for access questions is present.",
    missingSummary: "No access contact or request deadline is provided.",
    confirmedAction: "Publish the contact prominently and state when requests should arrive.",
    missingAction: "Assign an access contact and add a realistic response window.",
  },
  {
    id: "service-animals",
    category: "Support needs",
    question: "Are service animals and personal assistants addressed?",
    positive: /service animals?|guide dogs?|personal assistants?|support persons?|carers?|caregivers?/i,
    confirmedSummary: "Support-person or service-animal information is present.",
    missingSummary: "Service-animal and support-person information is not addressed.",
    confirmedAction: "Keep the policy concise and include any venue-specific route or relief-area detail.",
    missingAction: "Confirm the venue policy and whether assistants require a separate ticket.",
  },
];

function sentencesFor(input: AuditInput): SourceSentence[] {
  const entries: Array<[SourceName, string]> = [
    ["Event listing", input.eventListing],
    ["Venue notes", input.venueNotes],
  ];

  return entries.flatMap(([source, value]) =>
    value
      .split(/(?<=[.!?])\s+|\n+/)
      .map((text) => text.trim())
      .filter(Boolean)
      .map((text) => ({ source, text })),
  );
}

function matchingEvidence(sentences: SourceSentence[], patterns: RegExp[]): Evidence[] {
  const matches = sentences.filter(({ text }) =>
    patterns.some((pattern) => pattern.test(text)),
  );

  return matches.slice(0, 3).map(({ source, text }) => ({
    source,
    quote: text.length > 220 ? `${text.slice(0, 217)}…` : text,
  }));
}

function resultForRule(rule: Rule, sentences: SourceSentence[]): AuditFinding {
  const allText = sentences.map(({ text }) => text).join(" ");
  const hasPositive = rule.positive.test(allText);
  const hasNegative = rule.negative?.test(allText) ?? false;
  const hasConflict = hasPositive && (rule.conflict?.test(allText) ?? false);

  let status: FindingStatus = "needs-answer";
  let summary = rule.missingSummary;
  let action = rule.missingAction;

  if (hasConflict) {
    status = "conflict";
    summary = rule.conflictSummary ?? rule.missingSummary;
    action = rule.conflictAction ?? rule.missingAction;
  } else if (hasPositive && !hasNegative) {
    status = "confirmed";
    summary = rule.confirmedSummary;
    action = rule.confirmedAction;
  }

  const evidencePatterns = [rule.positive];
  if (rule.negative) evidencePatterns.push(rule.negative);
  if (rule.conflict) evidencePatterns.push(rule.conflict);

  return {
    id: rule.id,
    category: rule.category,
    question: rule.question,
    status,
    summary,
    action,
    evidence: matchingEvidence(sentences, evidencePatterns),
  };
}

function extractEventName(eventListing: string): string {
  return (
    eventListing
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean) ?? "Your event"
  ).slice(0, 80);
}

function extractEmail(text: string): string | null {
  return text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0] ?? null;
}

function buildGuide(eventName: string, findings: AuditFinding[], input: AuditInput) {
  const contact = extractEmail(`${input.eventListing}\n${input.venueNotes}`);
  const byId = new Map(findings.map((finding) => [finding.id, finding]));
  const mobility = byId.get("step-free-arrival");
  const toilet = byId.get("accessible-toilet");
  const captions = byId.get("captions-and-materials");
  const quiet = byId.get("quiet-space");

  return {
    title: `Access information for ${eventName}`,
    introduction:
      "This guide separates confirmed arrangements from details that are still being checked. It should be updated whenever the organizer receives new venue information.",
    sections: [
      {
        heading: "Arrival and step-free access",
        body:
          mobility?.status === "confirmed"
            ? "A step-free route is described in the organizer information. The organizer should add the exact entrance and opening time before publishing this guide."
            : "Step-free entry at the advertised opening time is not yet confirmed. Contact the organizer before travelling if you need a step-free route.",
      },
      {
        heading: "Accessible facilities",
        body:
          toilet?.status === "confirmed"
            ? "An accessible toilet is listed. Ask the organizer for its exact location and route."
            : "A continuously reachable accessible toilet is not yet confirmed.",
      },
      {
        heading: "Captions and event materials",
        body:
          captions?.status === "confirmed"
            ? "Communication access support is planned. The organizer should publish which sessions it covers and how to use it."
            : "Live captions and accessible speaker materials are not currently confirmed.",
      },
      {
        heading: "Sensory comfort",
        body:
          quiet?.status === "confirmed"
            ? "A quiet or lower-sensory space is available. Ask the organizer for its location."
            : "A dedicated quiet space is not yet confirmed.",
      },
    ],
    contactLine: contact
      ? `For access questions or requests, contact ${contact}.`
      : "The organizer still needs to publish an access contact.",
  };
}

export function runLocalAudit(input: AuditInput): AuditResult {
  const sentences = sentencesFor(input);
  const findings = rules.map((rule) => resultForRule(rule, sentences));
  const confirmed = findings.filter((item) => item.status === "confirmed").length;
  const conflicts = findings.filter((item) => item.status === "conflict").length;
  const rawScore = Math.round(
    ((confirmed + (findings.length - confirmed - conflicts) * 0.35 + conflicts * 0.1) /
      findings.length) *
      100,
  );
  const score = Math.max(18, Math.min(92, rawScore));
  const eventName = extractEventName(input.eventListing);

  const priorityQuestions = findings
    .filter((item) => item.status !== "confirmed")
    .sort((a, b) => (a.status === "conflict" ? -1 : b.status === "conflict" ? 1 : 0))
    .slice(0, 5)
    .map((item) => item.question);

  return {
    eventName,
    score,
    headline:
      conflicts > 0
        ? `${conflicts} claim${conflicts === 1 ? "" : "s"} need resolving before this is ready to publish.`
        : "The event information is usable, but important access details are still missing.",
    summary: `${confirmed} of ${findings.length} access areas are supported by the supplied evidence. Unknown details stay unknown—AccessReady never fills them in with guesses.`,
    findings,
    priorityQuestions,
    publicGuide: buildGuide(eventName, findings, input),
    mode: "local",
  };
}
