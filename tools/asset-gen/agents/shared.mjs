/**
 * agents/shared.mjs
 *
 * Shared utilities for screening pipeline. After the V2 refactor, the
 * pipeline no longer makes its own Claude API calls — the orchestrating
 * Claude Code session uses its native Agent tool to spawn screening
 * subagents directly. So this module now ONLY exports the JSON
 * verdict schema description and a JSON extractor (used when
 * deserializing agent responses written to disk).
 *
 * (Image-comparison helpers — zoom strips, vs-peers panels — live in
 * `prepare-screening.mjs` because they are run as a one-shot prep step,
 * not on demand from individual agents.)
 */

// ── Standard verdict schema ─────────────────────────────────────────

export const VERDICT_SCHEMA_DESCRIPTION = `
Return ONLY a single JSON object (no markdown fences, no surrounding text):
{
  "agent": "<agent_id>",
  "score": <integer 1-10>,
  "verdict": "pass" | "marginal" | "fail",
  "issues": [<short issue strings>],
  "reasoning": "<one short paragraph>"
}
Verdict thresholds: score >= 8 -> "pass", 5-7 -> "marginal", <= 4 -> "fail".
Adversarial agents add: "confidence": <float 0.0-1.0>.
`;

// ── Verdict JSON extraction ─────────────────────────────────────────

export function extractVerdictJson(text) {
  const fenced = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  let raw = fenced ? fenced[1] : null;
  if (!raw) {
    const start = text.indexOf('{');
    if (start === -1) throw new Error(`No JSON in response: ${text.slice(0, 200)}`);
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') { depth--; if (depth === 0) { raw = text.slice(start, i + 1); break; } }
    }
  }
  if (!raw) throw new Error(`Unbalanced JSON in response: ${text.slice(0, 200)}`);
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`JSON parse failed: ${err.message}\nRaw: ${raw.slice(0, 300)}`);
  }
}
