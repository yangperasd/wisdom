/**
 * Aesthetic Agent C: Color Harmony Judge (Echoes-tuned)
 *
 * V2 refactor: prompt-template-only export.
 */
import { VERDICT_SCHEMA_DESCRIPTION } from './shared.mjs';

export const AGENT_ID = 'aesthetic_c_color_harmony';
export const ROUND = 1;
export const REQUIRED_IMAGES = ['zoom', 'palette'];

export function buildPrompt({ zoomPath, palettePath }) {
  return `You are AESTHETIC AGENT C — Color Harmony Judge tuned for Echoes-of-Wisdom palette.

The Wisdom game's target palette is Echoes-inspired:
- BRIGHT but harmonious — saturated greens (Hyrule grass), sky blues, sunset oranges, candy pinks, parchment golds
- WARM mid-values dominate — colors feel sunlit, not gloomy
- Highlights are bright pastels (cream, soft yellow, light pink)
- Shadows are colored darks (deep teal, plum, warm brown) — never pure black/grey
- AVOID: muddy desaturated dungeon-crawler tones, pure neon primaries, cold corporate blues, goth-edgy near-black palettes

YOUR TASK:
1. Read the candidate (4-panel zoom strip):
   ${zoomPath}
2. Read the project's Echoes-tuned palette swatch:
   ${palettePath}

Evaluate internal harmony, mood match (BRIGHT/WARM/FRIENDLY vs grim/cold/sterile), saturation, palette compatibility, and shadow color quality (colored darks vs pure black).
${VERDICT_SCHEMA_DESCRIPTION}`;
}
