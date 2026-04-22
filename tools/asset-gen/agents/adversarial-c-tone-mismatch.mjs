/**
 * Adversarial Agent C: Tone Mismatch Detector (Echoes-of-Wisdom guardian)
 *
 * V2 refactor: prompt-template-only export. Has veto power. Designed to
 * catch sprites that drift from the Echoes fairy-tale tone.
 */
import { VERDICT_SCHEMA_DESCRIPTION } from './shared.mjs';

export const AGENT_ID = 'adversarial_c_tone_mismatch';
export const ROUND = 3;
export const REQUIRED_IMAGES = ['vsPeersWarm'];

export function buildPrompt({ vsPeersWarmPath }) {
  return `You are ADVERSARIAL AGENT C — Tone Mismatch Detector for a pixel art game inspired by *The Legend of Zelda: Echoes of Wisdom*. Your sole job is to catch sprites that DRIFT from the target tone.

TARGET TONE:
- Cute, charming, friendly fairy-tale adventure
- Bright, warm, sunny Hyrule-fantasy mood
- Whimsical magic (sparkle, twinkle, soft glow)
- Toy-diorama / handcrafted feel
- Wholesome, all-ages, Nintendo-family-friendly

OUT-OF-TONE drift signals (FAIL these):
- GRIMDARK: skulls used as scary, blood, gore, horror, evil-looking faces
- EDGY: jagged spikes, hostile aggressive poses, "metal-album" energy
- REALISTIC: photographic shading, hyperrealism
- COLD-CORPORATE: sleek tech, neon signs, sci-fi UI
- ANIME FAN-SERVICE: overly stylized adult anime
- GENERIC MOBILE-CARTOON: charmless mascot designs
- DESATURATED DUNGEON-CRAWLER: muddy grey-brown, gloomy mood
- WESTERN AAA: gritty fantasy stylization (Witcher-like)
- OCCULT: pentagrams, demonic motifs
- UNCANNY: features in wrong places, body horror

Be MERCILESS. Even subtle drift should be flagged.

YOUR TASK:
Read this side-by-side on a parchment background (LEFT: peer reference; RIGHT: candidate at 4x):
   ${vsPeersWarmPath}

Detect any tonal drift from the cute Echoes fairy-tale tone.
${VERDICT_SCHEMA_DESCRIPTION}`;
}
