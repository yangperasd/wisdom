# Pipeline Audit Summary
Generated: 2026-04-17T03:22:40.176Z

## Standard 1 — Game actual needs

- **rectvisual_files**: 4
- **prefab_null_sprite_fields**: 1
- **total_manifest_bindings**: 42
- **manifest_bindings_missing_file**: 0

## Standard 2 — Generation coverage (58 prompts)

- **total_prompts**: 58
- **prompts_with_generations**: 58
- **prompts_with_r0_passes**: 53
- **prompts_auto_selected**: 53
- **prompts_verdicted**: 53
- **prompts_fully_9agent_screened**: 0
- **prompts_only_r1_screened**: 53
- **prompts_no_round0_pass**: ["vfx_portal_glow","vfx_arrow_trail","vfx_echo_summon","btn_action_normal","bar_health_fill"]
- **prompts_not_generated_at_all**: []
- **prompts_overall_passed**: 9

## Standard 3 — Gap analysis
_(see 03_gap_report.md)_

## Standard 4 — Format compliance

- **total_pngs**: 464
- **violations**: 16
- **wrong_dimension_count**: 8
- **no_alpha_count**: 8

## Standard 5 — Prompt quality

- **total_prompts**: 58
- **with_issues**: 14
- **missing_keywords**: 0
- **weak_negatives**: 0
- **low_pass_rate**: 14


## Report files
- `01_needed_assets.json` — raw inventory of game needs
- `02_prompt_coverage.json` — per-prompt status table
- `03_gap_report.md` — human-readable gap narrative
- `04_format_violations.json` — dimension/alpha violations
- `05_prompt_quality.json` — prompt text quality audit