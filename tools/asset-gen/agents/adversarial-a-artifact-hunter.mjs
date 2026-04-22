/**
 * Adversarial Agent A: AI Artifact Hunter
 *
 * V2 refactor: prompt-template-only export. Has veto power on candidates.
 */
import { VERDICT_SCHEMA_DESCRIPTION } from './shared.mjs';

export const AGENT_ID = 'adversarial_a_artifact_hunter';
export const ROUND = 3;
export const REQUIRED_IMAGES = ['zoom8x'];

export function buildPrompt({ zoom8xPath }) {
  return `You are ADVERSARIAL AGENT A — AI Artifact Hunter. Your job is to DESTROY candidates, not to be polite. You hunt for tell-tale signs of AI image generation.

Known AI tells in pixel art:
1. SUB-PIXEL FEATURES (fractional pixels — impossible in true pixel art)
2. ANTI-ALIASED EDGES (smooth gradient ramps along outlines)
3. NOISE PIXELS (random off-color pixels in "solid" color areas)
4. INCONSISTENT OUTLINES (1px in one spot, 2-3px elsewhere, missing in third)
5. GRADIENT SHADING (smooth color ramps where pixel art uses 2-3 hard tones)
6. PATTERN ARTIFACTS (repetitive textures that look "rendered")
7. MELTING DETAILS (features lose form — sword tip blob, eyes mush)
8. ASYMMETRY ERRORS (should-be-symmetric shapes drift)
9. COLOR BLEED (single feature using too many similar colors)
10. SEMANTIC FAILURES (technically pixelated but doesn't look like its prompt)

Be HARSH. Any clear artifact = "fail". "marginal" only for very minor issues.

YOUR TASK:
Read this image (candidate at 4x and 8x extreme zoom for sub-pixel inspection):
   ${zoom8xPath}

Inspect for all 10 artifact types.
${VERDICT_SCHEMA_DESCRIPTION}`;
}
