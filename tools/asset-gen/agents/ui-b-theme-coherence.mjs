/**
 * UI Agent B: Mood Coherence (Echoes-of-Wisdom-style)
 *
 * V2 refactor: prompt-template-only export.
 */
import { VERDICT_SCHEMA_DESCRIPTION } from './shared.mjs';

export const AGENT_ID = 'ui_b_mood_coherence';
export const ROUND = 2;
export const REQUIRED_IMAGES = ['compositeScene', 'originalScene'];

export function buildPrompt({ compositeScenePath, originalScenePath, candidateName }) {
  return `You are UI AGENT B — Mood Coherence guard for an Echoes-of-Wisdom-style pixel art game.

TARGET MOOD:
- Cute fairy-tale adventure rendered in pixel art
- Color mood: warm greens, friendly blues, sunny yellows, soft pinks, parchment golds
- Lighting: bright, sunny, magical — like a Hyrule afternoon
- Vibe: fairy-tale wonder, gentle magic, toy-like miniature world

In-tone signals (good): cute round proportions, bright saturated palette, whimsical sparkle/magic glow, "toy diorama" quality, friendly fantasy elements.

Out-of-tone signals (BAD — flag): grimdark/horror, edgy/aggressive design, realistic/photographic, cold-corporate-modern, goth/metal aesthetic, anime fan-service, overly muted dungeon-crawler, generic mobile cartoon.

YOUR TASK:
Read both images:
   Image 1 (scene WITH "${candidateName}"): ${compositeScenePath}
   Image 2 (scene WITHOUT, for tone reference): ${originalScenePath}

Evaluate whether the new sprite preserves the cute, sunny, fairy-tale Echoes adventure tone, or shifts it to something problematic.
${VERDICT_SCHEMA_DESCRIPTION}`;
}
