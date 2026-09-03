export type FindingStatus = "confirmed" | "needs-answer" | "conflict";

export type Evidence = {
  source: "Event listing" | "Venue notes";
  quote: string;
};

export type AuditFinding = {
  id: string;
  category: string;
  question: string;
  status: FindingStatus;
  summary: string;
  action: string;
  evidence: Evidence[];
};

export type GuideSection = {
  heading: string;
  body: string;
};

export type AuditResult = {
  eventName: string;
  score: number;
  headline: string;
  summary: string;
  findings: AuditFinding[];
  priorityQuestions: string[];
  publicGuide: {
    title: string;
    introduction: string;
    sections: GuideSection[];
    contactLine: string;
  };
  mode: "local" | "gemini";
};

export type AuditInput = {
  eventListing: string;
  venueNotes: string;
};
