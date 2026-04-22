/**
 * UI Agent A: In-Context Readability (Echoes-tuned)
 *
 * V2 refactor: prompt-template-only export. Requires Playwright-composited
 * scene images (composite + original) — handled by a future prep step.
 */
import { VERDICT_SCHEMA_DESCRIPTION } from './shared.mjs';

export const AGENT_ID = 'ui_a_readability';
export const ROUND = 2;
export const REQUIRED_IMAGES = ['compositeScene', 'originalScene'];

export function buildPrompt({ compositeScenePath, originalScenePath, candidateName }) {
  return `You are UI AGENT A — In-Context Readability evaluator. Reference standard: *The Legend of Zelda: Echoes of Wisdom* — exceptionally clean, readable scene composition.

A sprite is well-integrated when:
- A player can spot it within 0.5 sec while scanning the screen
- It does not blend into background tiles
- Its silhouette stays distinct against varied environment textures
- It contributes to the bright, charming, uncluttered Echoes feel
- It doesn't feel "pasted on"

A sprite is poorly integrated when:
- Same hue/value as background floor tiles
- Outline disappears against detailed backgrounds
- Triggers visual noise / pattern interference
- Clashes tonally with sunny/charming atmosphere

YOUR TASK:
Read both images:
   Image 1 (scene WITH "${candidateName}" composited; red arrow marks position): ${compositeScenePath}
   Image 2 (same scene WITHOUT candidate, for comparison):                       ${originalScenePath}

Evaluate: instant locatability, visual distinguishment from environment, dark-area visibility, "native vs pasted" feel, confusion with other entities, and Echoes-cleanliness preservation.
${VERDICT_SCHEMA_DESCRIPTION}`;
}
