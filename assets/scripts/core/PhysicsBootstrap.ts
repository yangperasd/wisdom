import { _decorator, Component, EPhysics2DDrawFlags, PhysicsSystem2D, Vec2, macro } from 'cc';

const { ccclass, property } = _decorator;

// Cocos's default batch chunk is 144KB (cc.macro.BATCHER2D_MEM_INCREMENT). With
// vfmtPosUvColor (36 bytes/vertex) that allows ~4,096 vertices, i.e. ~1,024
// tiled-sprite tiles per draw call. The outdoor backdrops in FieldWest
// (1840x560) and FieldRuins (1960x560) tile a 32x32 ground texture, producing
// 1,044 / 1,116 tiles -- just over the default ceiling -- which surfaced as
// "Failed to allocate chunk in StaticVBAccessor, the requested buffer might be
// too large: 150336/160704 bytes" criticals in the demo audit. Bumping the
// macro to 256KB (well under the 2,303KB hard cap) gives a comfortable margin
// for these and any similar backdrops without any per-scene refactor. This is
// the engine's own knob for exactly this scenario.
//
// IMPORTANT: this MUST run at module load time (not inside onLoad) because
// Cocos's batcher lazily creates a StaticVBAccessor on the first sprite render
// and locks `_vCount` from `macro.BATCHER2D_MEM_INCREMENT * 1024 / vbStride`
// at construction time. Setting the macro inside any scene-component lifecycle
// (e.g. onLoad/start) is too late — the accessor is already cached.
const RECOMMENDED_BATCHER2D_MEM_INCREMENT_KB = 256;
if ((macro.BATCHER2D_MEM_INCREMENT ?? 0) < RECOMMENDED_BATCHER2D_MEM_INCREMENT_KB) {
  macro.BATCHER2D_MEM_INCREMENT = RECOMMENDED_BATCHER2D_MEM_INCREMENT_KB;
}

@ccclass('PhysicsBootstrap')
export class PhysicsBootstrap extends Component {
  @property
  enableDebugDraw = false;

  protected onLoad(): void {
    const physics = PhysicsSystem2D.instance;
    physics.enable = true;
    physics.gravity = new Vec2(0, 0);
    physics.debugDrawFlags = this.enableDebugDraw
      ? EPhysics2DDrawFlags.Shape | EPhysics2DDrawFlags.Aabb
      : EPhysics2DDrawFlags.None;
  }
}
