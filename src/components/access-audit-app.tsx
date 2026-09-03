"use client";

import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clipboard,
  FileCheck2,
  Info,
  LoaderCircle,
  RotateCcw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type {
  AuditFinding,
  AuditInput,
  AuditResult,
  FindingStatus,
} from "@/lib/audit-types";
import { sampleInput } from "@/lib/sample-audit";

type ViewState = "idle" | "loading" | "success" | "error";

const statusMeta: Record<
  FindingStatus,
  { label: string; icon: typeof CheckCircle2 }
> = {
  confirmed: { label: "Supported", icon: CheckCircle2 },
  "needs-answer": { label: "Needs an answer", icon: Info },
  conflict: { label: "Conflict", icon: TriangleAlert },
};

function guideToText(result: AuditResult): string {
  return [
    result.publicGuide.title,
    "",
    result.publicGuide.introduction,
    "",
    ...result.publicGuide.sections.flatMap((section) => [
      section.heading,
      section.body,
      "",
    ]),
    result.publicGuide.contactLine,
  ].join("\n");
}

function StatusPill({ status }: { status: FindingStatus }) {
  const meta = statusMeta[status];
  const Icon = meta.icon;
  return (
    <span className={`status-pill status-${status}`}>
      <Icon aria-hidden="true" size={15} strokeWidth={2.2} />
      {meta.label}
    </span>
  );
}

function FindingCard({ finding }: { finding: AuditFinding }) {
  return (
    <article className="finding-card">
      <div className="finding-heading">
        <div>
          <p className="eyebrow">{finding.category}</p>
          <h3>{finding.question}</h3>
        </div>
        <StatusPill status={finding.status} />
      </div>
      <p className="finding-summary">{finding.summary}</p>
      {finding.evidence.length > 0 ? (
        <div className="evidence-list" aria-label="Supporting evidence">
          {finding.evidence.map((evidence, index) => (
            <blockquote key={`${evidence.source}-${index}`}>
              <span>{evidence.source}</span>“{evidence.quote}”
            </blockquote>
          ))}
        </div>
      ) : (
        <div className="no-evidence">
          <ScanSearch aria-hidden="true" size={17} />
          No supporting statement found in either source.
        </div>
      )}
      <div className="next-action">
        <ArrowRight aria-hidden="true" size={16} />
        <p>
          <strong>Next:</strong> {finding.action}
        </p>
      </div>
    </article>
  );
}

function ContradictionLead({ finding }: { finding: AuditFinding | undefined }) {
  if (!finding) {
    return (
      <section className="contradiction-lead contradiction-clear" aria-labelledby="contradiction-title">
        <div className="contradiction-icon">
          <CheckCircle2 aria-hidden="true" />
        </div>
        <div>
          <p className="eyebrow">Cross-source check</p>
          <h2 id="contradiction-title">No direct contradiction found.</h2>
          <p>Review the unanswered items below before you publish.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="contradiction-lead" aria-labelledby="contradiction-title">
      <div className="contradiction-icon">
        <TriangleAlert aria-hidden="true" />
      </div>
      <div className="contradiction-copy">
        <p className="eyebrow">The first thing to fix</p>
        <h2 id="contradiction-title">The public promise and the venue detail disagree.</h2>
        <p className="contradiction-why">
          <strong>Why it matters:</strong> {finding.action}
        </p>
        <div className="contradiction-evidence" aria-label="Contradicting evidence">
          {finding.evidence.slice(0, 2).map((evidence, index) => (
            <blockquote key={`${evidence.source}-${index}`}>
              <span>{evidence.source}</span>
              “{evidence.quote}”
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

function IdlePanel() {
  return (
    <section className="idle-panel" aria-labelledby="idle-title">
      <div className="idle-icon">
        <FileCheck2 aria-hidden="true" />
      </div>
      <p className="eyebrow">What the audit does</p>
      <h2 id="idle-title">Unknown stays unknown.</h2>
      <p>
        An event page can say “accessible” while the venue email says “three
        steps.” AccessReady checks the claim against the details organizers
        actually have, then keeps every unresolved point visible.
      </p>
      <ol className="audit-steps">
        <li>
          <span>1</span>
          <div>
            <strong>Extract</strong>
            <p>Find access claims and exact source lines.</p>
          </div>
        </li>
        <li>
          <span>2</span>
          <div>
            <strong>Challenge</strong>
            <p>Flag gaps, vague wording, and contradictions.</p>
          </div>
        </li>
        <li>
          <span>3</span>
          <div>
            <strong>Publish</strong>
            <p>Draft an honest attendee access guide.</p>
          </div>
        </li>
      </ol>
      <div className="ai-boundary">
        <Sparkles aria-hidden="true" size={17} />
        <p><strong>AI review, evidence boundary.</strong> It extracts claims, compares sources, prioritizes questions, and drafts from supplied facts. A citation verifier checks every quoted line against the source before accepting the AI result.</p>
      </div>
    </section>
  );
}

function LoadingPanel() {
  return (
    <section className="loading-panel" aria-live="polite" aria-busy="true">
      <div className="loading-title">
        <LoaderCircle className="spin" aria-hidden="true" />
        <div>
          <p className="eyebrow">Running evidence check</p>
          <h2>Comparing claims with details…</h2>
        </div>
      </div>
      <div className="skeleton-score" />
      {Array.from({ length: 3 }).map((_, index) => (
        <div className="skeleton-card" key={index}>
          <span />
          <span />
          <span />
        </div>
      ))}
    </section>
  );
}

export default function AccessAuditApp() {
  const [input, setInput] = useState<AuditInput>({
    eventListing: "",
    venueNotes: "",
  });
  const [state, setState] = useState<ViewState>("idle");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const eventRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const lastSubmittedRef = useRef<AuditInput | null>(null);

  const counts = useMemo(() => {
    if (!result) return null;
    return {
      confirmed: result.findings.filter((item) => item.status === "confirmed")
        .length,
      unanswered: result.findings.filter(
        (item) => item.status === "needs-answer",
      ).length,
      conflicts: result.findings.filter((item) => item.status === "conflict")
        .length,
    };
  }, [result]);

  useEffect(() => {
    if (state === "success") {
      resultsRef.current?.focus({ preventScroll: true });
      resultsRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    }
  }, [state]);

  function loadSample() {
    setInput(sampleInput);
    setResult(null);
    setState("idle");
    setError("");
    setCopied(false);
  }

  async function runAudit(auditInput: AuditInput) {
    setError("");
    setState("loading");
    setCopied(false);
    lastSubmittedRef.current = auditInput;

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(auditInput),
      });
      const payload = (await response.json()) as
        | AuditResult
        | { error?: string };
      if (!response.ok || !("findings" in payload)) {
        throw new Error(
          "error" in payload
            ? payload.error
            : "The audit could not run. Try again.",
        );
      }
      setResult(payload);
      setState("success");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The audit could not run. Try again.",
      );
      setState("error");
    }
  }

  function runSampleDemo() {
    setInput(sampleInput);
    void runAudit(sampleInput);
  }

  function clearAll() {
    setInput({ eventListing: "", venueNotes: "" });
    setResult(null);
    setState("idle");
    setError("");
    setCopied(false);
    requestAnimationFrame(() => eventRef.current?.focus());
  }

  async function submitAudit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAudit(input);
  }

  function retryAudit() {
    void runAudit(lastSubmittedRef.current ?? input);
  }

  async function copyGuide() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(guideToText(result));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setError(
        "Your browser blocked clipboard access. Select the guide text and copy it manually.",
      );
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="AccessReady home">
          <span className="brand-mark">
            <Check aria-hidden="true" size={18} strokeWidth={2.5} />
          </span>
          <span>AccessReady</span>
        </a>
        <div className="header-note">
          <ShieldCheck aria-hidden="true" size={16} />
          Evidence-first · not certification
        </div>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="hero-kicker">
              <span />Pre-event accessibility review
            </div>
            <h1 id="hero-title">
              “Wheelchair accessible.”
              <em>“Three steps at the main entrance.”</em>
            </h1>
            <p>
              AccessReady compares the public promise with the venue reality,
              so organizers can resolve the contradiction before an attendee
              reaches the door.
            </p>
            <div className="hero-actions">
              <button className="demo-button" type="button" onClick={runSampleDemo} disabled={state === "loading"} aria-busy={state === "loading"}>
                <Sparkles aria-hidden="true" size={18} />
                {state === "loading" ? "Running judge demo…" : "Run the 30-second demo"}
                <ArrowRight aria-hidden="true" size={17} />
              </button>
              <span>Seeded case: one claim, one venue email, one publish decision.</span>
            </div>
          </div>
          <aside className="hero-principle" aria-label="AccessReady principle">
            <Sparkles aria-hidden="true" size={20} />
            <div>
              <strong>No guessed claims.</strong>
              <p>
                Every answer is tied to supplied evidence—or marked unresolved.
              </p>
            </div>
          </aside>
        </section>

        <section className="workspace" aria-label="Accessibility audit workspace">
          <form className="source-panel" onSubmit={submitAudit}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Source material</p>
                <h2>Use your own sources.</h2>
              </div>
              <button className="text-button" type="button" onClick={loadSample}>
                Use sample sources
              </button>
            </div>

            <div className="field-group">
              <label htmlFor="event-listing">
                Event listing <span>(required)</span>
              </label>
              <textarea
                ref={eventRef}
                id="event-listing"
                value={input.eventListing}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    eventListing: event.target.value,
                  }))
                }
                placeholder="Example: event name, date, venue, public accessibility claims…"
                rows={8}
                maxLength={12000}
                required
                aria-describedby="event-listing-hint"
              />
              <div className="field-meta" id="event-listing-hint">
                <span>Public page, invitation, or registration copy</span>
                <span>{input.eventListing.length.toLocaleString()} / 12,000</span>
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="venue-notes">
                Venue and organizer notes <span>(required)</span>
              </label>
              <textarea
                id="venue-notes"
                value={input.venueNotes}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    venueNotes: event.target.value,
                  }))
                }
                placeholder="Example: venue email, entrance details, facilities, services booked…"
                rows={9}
                maxLength={12000}
                required
                aria-describedby="venue-notes-hint"
              />
              <div className="field-meta" id="venue-notes-hint">
                <span>Internal notes, venue replies, or confirmed arrangements</span>
                <span>{input.venueNotes.length.toLocaleString()} / 12,000</span>
              </div>
            </div>

            {error && state !== "error" ? (
              <div className="inline-error" role="alert">
                <AlertCircle aria-hidden="true" size={17} />
                {error}
              </div>
            ) : null}

            <div className="form-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={state === "loading"}
                aria-busy={state === "loading"}
              >
                {state === "loading" ? (
                  <>
                    <LoaderCircle className="spin" aria-hidden="true" size={18} />
                    Running audit
                  </>
                ) : (
                  <>
                    <ScanSearch aria-hidden="true" size={18} />
                    Run evidence check
                  </>
                )}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={clearAll}
                disabled={!input.eventListing && !input.venueNotes}
              >
                <RotateCcw aria-hidden="true" size={17} />
                Clear
              </button>
            </div>
            <p className="privacy-note">
              <ShieldCheck aria-hidden="true" size={15} />
              Demo inputs are processed only to return this audit. Do not paste
              private attendee information.
            </p>
          </form>

          <div className="result-panel">
            {state === "idle" ? <IdlePanel /> : null}
            {state === "loading" ? <LoadingPanel /> : null}
            {state === "error" ? (
              <section className="error-panel" role="alert">
                <div className="error-icon">
                  <AlertCircle aria-hidden="true" />
                </div>
                <p className="eyebrow">Audit interrupted</p>
                <h2>We couldn’t check these sources.</h2>
                <p>{error || "This is usually a temporary network issue."}</p>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setState("idle")}
                >
                  Review sources
                </button>
                <button className="primary-button error-retry" type="button" onClick={retryAudit}>
                  <RotateCcw aria-hidden="true" size={17} />
                  Try the audit again
                </button>
              </section>
            ) : null}
            {state === "success" && result && counts ? (
              <div className="results" ref={resultsRef} tabIndex={-1} aria-live="polite">
                <ContradictionLead finding={result.findings.find((item) => item.status === "conflict")} />
                <section className="result-summary">
                  <div
                    className="score-block"
                    aria-label={`Readiness score ${result.score} out of 100`}
                  >
                    <span>{result.score}</span>
                    <small>/ 100</small>
                  </div>
                  <div className="summary-copy">
                    <div className="result-meta">
                      <span>Readiness snapshot</span>
                      <span>
                        {result.mode === "gemini"
                          ? "AI + rules"
                          : "Reliable demo mode"}
                      </span>
                    </div>
                    <h2>{result.headline}</h2>
                    <p>{result.summary}</p>
                  </div>
                </section>

                <div className="count-grid" aria-label="Audit totals">
                  <div>
                    <CheckCircle2 aria-hidden="true" />
                    <strong>{counts.confirmed}</strong>
                    <span>Supported</span>
                  </div>
                  <div>
                    <Info aria-hidden="true" />
                    <strong>{counts.unanswered}</strong>
                    <span>Need answers</span>
                  </div>
                  <div>
                    <TriangleAlert aria-hidden="true" />
                    <strong>{counts.conflicts}</strong>
                    <span>Conflicts</span>
                  </div>
                </div>

                <section className="ai-method" aria-labelledby="ai-method-title">
                  <div className="ai-method-heading">
                    <Sparkles aria-hidden="true" size={19} />
                    <div>
                      <p className="eyebrow">How the review works</p>
                      <h2 id="ai-method-title">AI finds the information mess. Evidence keeps it honest.</h2>
                    </div>
                  </div>
                  <div className="ai-method-grid">
                    <span><strong>01</strong>Extract semantic claims</span>
                    <span><strong>02</strong>Detect cross-source conflicts</span>
                    <span><strong>03</strong>Prioritize clarification questions</span>
                    <span><strong>04</strong>Draft an evidence-constrained guide</span>
                  </div>
                  <p className="ai-method-footnote">{result.mode === "gemini" ? "Gemini supplied the semantic review; the citation verifier confirmed every quoted line against the supplied sources." : "No Gemini key was detected, so this run used the deterministic demo fallback."}</p>
                </section>

                <section className="findings-section" aria-labelledby="findings-title">
                  <div className="section-heading">
                    <p className="eyebrow">Evidence review</p>
                    <h2 id="findings-title">What needs attention</h2>
                  </div>
                  <div className="findings-list">
                    {result.findings.map((finding) => (
                      <FindingCard key={finding.id} finding={finding} />
                    ))}
                  </div>
                </section>

                <section className="questions-card" aria-labelledby="questions-title">
                  <p className="eyebrow">Ask before publishing</p>
                  <h2 id="questions-title">Five questions that unblock the guide</h2>
                  <ol>
                    {result.priorityQuestions.map((question, index) => (
                      <li key={question}>
                        <span>{index + 1}</span>
                        {question}
                      </li>
                    ))}
                  </ol>
                </section>

                <section className="guide-card" aria-labelledby="guide-title">
                  <div className="guide-heading">
                    <div>
                      <p className="eyebrow">Public draft</p>
                      <h2 id="guide-title">Attendee access guide</h2>
                    </div>
                    <button className="copy-button" type="button" onClick={copyGuide}>
                      {copied ? (
                        <Check aria-hidden="true" size={17} />
                      ) : (
                        <Clipboard aria-hidden="true" size={17} />
                      )}
                      {copied ? "Copied" : "Copy guide"}
                    </button>
                  </div>
                  <div className="guide-document">
                    <h3>{result.publicGuide.title}</h3>
                    <p>{result.publicGuide.introduction}</p>
                    {result.publicGuide.sections.map((section) => (
                      <div key={section.heading}>
                        <h4>{section.heading}</h4>
                        <p>{section.body}</p>
                      </div>
                    ))}
                    <p className="contact-line">{result.publicGuide.contactLine}</p>
                  </div>
                </section>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      <footer>
        <span>AccessReady</span>
        <p>Clear access information is part of the event—not an afterthought.</p>
      </footer>
    </div>
  );
}
