import { _decorator, Component, EPhysics2DDrawFlags, PhysicsSystem2D, Vec2 } from 'cc';

const { ccclass, property } = _decorator;

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
