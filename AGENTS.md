# wisdom repo working notes

These instructions apply inside `E:\cv5\wisdom` and should be read together with any higher-level AGENTS instructions.

## Source of truth

- Treat `assets/configs/asset_binding_manifest_v2.json` as the live binding fact source.
- Treat `assets/configs/asset_selection_manifest.json` as the intent / scene-role fact source.
- Treat `assets/configs/style_resource_gate.json` as the style and AI-asset boundary fact source.
- Do not bind generated art directly into the live manifest before candidate review, package checks, and runtime validation pass.

## Image 2.0 workflow

- Default goal is not "generate final art fast"; default goal is "generate reviewable candidates safely".
- Start with `must-redo` environment keys before wider replacement:
  - `outdoor_wall_standard`
  - `outdoor_wall_broken`
  - `outdoor_wall_cracked`
  - `outdoor_path_cobble`
  - `outdoor_ground_flowers`
- Every major category may be attempted with Image 2.0 generation or reference-guided editing.
- The main distinction is adoption gate, not exploration permission.
- High-risk categories may be explored, but must not auto-promote into live bindings without stricter review:
  - main HUD widgets
  - final `boss_core` body
  - full-scene background sheets
- `player` is a special case:
  - redesign is allowed and expected
  - direct auto-binding of a single generated player image is not allowed
  - use a player redesign track with concept, paperdoll, and state-sheet review first
- Keep generated candidates staged outside live bindings first, preferably under `temp/image2/...` and then `assets/art/generated/...`.
- For environment candidate preview, do not bind the raw review PNG straight into runtime if it is oversized for tile use.
  - `outdoor_ground_*` and `outdoor_path_*` preview tiles should stay semantic tile-sized (`32x32` currently).
  - `outdoor_wall_*` preview tiles should stay wall-tile sized (`64x64` currently).

## WeChat verification reality

- Prefer `npm run test:wechat:playthrough` over DevTools GUI automation for day-to-day runtime proof.
- Treat `npm run verify:wechat` plus `npm run test:wechat:playthrough` as the main no-human WeChat gate.
- GUI smoke is evidence-only. It is slower, can steal focus/mouse, and should not be the normal rebuild path.
- Do not overclaim:
  - Preview proof is not WeChat runtime proof.
  - DevTools simulator proof is not true-device proof.
  - Runtime playthrough proof is not identical to final tactile/manual UX proof.

## Preferred WeChat workflow

- Preferred daily refresh:
  - `npm run rebuild:wechat`
- Preferred reopen/reload:
  - `npm run open:wechat`
  - `npm run reload:wechat`
- Default execution order for local WeChat confidence:
  - `build:wechat:config`
  - `build:wechat`
  - `verify:wechat`
  - `test:wechat:playthrough`
  - GUI smoke only if window-level evidence is actually needed
- `test:wechat:playthrough` should default to the already-open `build/wechatgame` DevTools session via in-place probe injection plus project-level `close --project -> open`; do not full-quit/restart DevTools as the normal path.
- If the runtime probe temporarily injects a websocket bootstrap into `game.js`, treat that bootstrap as disposable harness state and clean it after the playthrough run before using the build for normal manual inspection.
- Before `open:wechat` / `reload:wechat`, scrub stale runtime-probe bootstrap from all `build/wechatgame*` outputs, not only the latest successful output, because DevTools may still be attached to a fixed legacy staging directory.
- Only use `WECHAT_DEVTOOLS_FORCE_REOPEN=1` when stale runtime cache is the real blocker.
- If a full DevTools restart is unavoidable, treat clicking `信任并运行` as a required step on that restart path.
- Do not consider a DevTools reopen complete until the `信任并运行` trust modal has been handled.
- Because that trust modal is window-level and can block runtime boot, full restart remains a human-assisted recovery path, not the default no-human gate.
- Soft close is an escape hatch only; full quit/reopen is usually more reliable for stale DevTools runtime cache.

## Known DevTools caveats

- `InjectTouchInput` is currently diagnostic-only on this Windows/DevTools stack and must not be treated as release evidence.
- DevTools auto protocol `App.*` calls are not reliable enough to be the primary automation interface.
- Active DevTools sessions can lock build directories; runtime harnesses should prefer `%TEMP%\wisdom-wechat-harnesses\...`.
- If DevTools shows a `project.config.json` parse modal, prefer `npm run repair:wechat-project-configs` before any manual cleanup.
- Do not use GUI smoke or modal-dismiss scripts as the normal rebuild path.
- Do not run modal-dismiss helpers by default inside the non-GUI runtime probe path; only allow them when explicitly opting into window-level recovery work.
- If DevTools reports `WebSocket connection to ws://127.0.0.1:37991/ failed`, suspect stale runtime-probe bootstrap or a probe server that has already exited before assuming a socket legal-domain regression.
- If DevTools is reopened and the project appears stuck before runtime boot, suspect an unhandled `信任并运行` trust modal before assuming build or gameplay regression.
- If a result looks inconsistent with current code, suspect stale harness path, stale recent-project entry, trust modal, or stale runtime cache before assuming game logic regressed.

## Evidence and memory

- Use `docs/image-2-loop-memory.md` as the primary working memory for `Image 2.0` / art-replacement loops.
- Use `docs/image-2-loop-todo.md` as the prioritized actionable queue for those loops.
- Keep `docs/harness-loop-memory-2026-04-21.md` scoped to WeChat build, runtime, DevTools, package, and harness learnings.
- When the user repeatedly corrects a workflow or harness rule, write that rule into repo memory and/or `AGENTS.md` in the same loop before continuing.
- When adding a new verification path, document both:
  - what it can prove
  - what it still cannot prove
- If a result depends on human login, QR scan, or physical-device checks, label it explicitly as a human-only boundary.
- Every finished `Image 2.0` loop should update both:
  - progress / findings / evidence in `docs/image-2-loop-memory.md`
  - task status in `docs/image-2-loop-todo.md`
