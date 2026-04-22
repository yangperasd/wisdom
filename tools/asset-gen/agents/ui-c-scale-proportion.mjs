/**
 * UI Agent C: Scale & Proportion (Echoes-tuned)
 *
 * V2 refactor: prompt-template-only export.
 */
import { VERDICT_SCHEMA_DESCRIPTION } from './shared.mjs';

export const AGENT_ID = 'ui_c_scale_proportion';
export const ROUND = 2;
export const REQUIRED_IMAGES = ['compositeScene'];

export function buildPrompt({ compositeScenePath, candidateName, candidateCategory }) {
  return `You are UI AGENT C — Scale & Proportion evaluator for an Echoes-of-Wisdom-style top-down 2D game.

Echoes feels like a hand-crafted toy diorama where every entity respects a consistent scale. Scale conventions:
- Player character: 32x32 baseline (or 32x48 for taller sprites)
- Enemies: similar size, with bosses noticeably larger but still toy-like
- Items on the floor: 50-75% of player size, never larger
- Echo summons (Box, Flower, BombBug): 50-80% of player — companion scale
- Doodads: variable but logical (torch small, sarcophagus big)
- HUD icons: 24x24 or smaller

Scale errors to flag:
- Item appearing as large as the player
- Creature too small to threaten / too big to be a "cute summon"
- Effects that overwhelm the entire scene
- Inconsistent perspective (top-down vs 3/4)
- Sprites that look "zoomed in" (too detailed) or "zoomed out" (lacking detail)

YOUR TASK:
Read this image (game scene with "${candidateName}" of category "${candidateCategory}" composited in):
   ${compositeScenePath}

Evaluate size appropriateness, proportion vs other entities, perspective match, and "toy diorama" vs "wallpaper" feel.
${VERDICT_SCHEMA_DESCRIPTION}`;
}
