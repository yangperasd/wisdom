import { _decorator, Collider2D, Component, Contact2DType, IPhysics2DContact, Vec3 } from 'cc';
import { GameManager } from '../core/GameManager';

const { ccclass, property } = _decorator;

@ccclass('SimpleProjectile')
export class SimpleProjectile extends Component {
  @property
  speed = 260;

  @property
  maxLifetime = 2;

  @property
  destroyOnAnyContact = true;

  @property
  ignoreNodeNameIncludes = '';

  @property
  destroyOnNodeNameIncludes = 'Player';

  private direction = new Vec3(1, 0, 0);
  private elapsed = 0;
  private collider: Collider2D | null = null;

  protected onLoad(): void {
    this.collider = this.getComponent(Collider2D);
    this.collider?.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
  }

  protected onDestroy(): void {
    this.collider?.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
  }

  protected update(dt: number): void {
    if (GameManager.instance?.isPaused()) {
      return;
    }

    this.elapsed += dt;
    if (this.elapsed >= this.maxLifetime) {
      this.node.destroy();
      return;
    }

    const next = this.node.position.clone();
    next.x += this.direction.x * this.speed * dt;
    next.y += this.direction.y * this.speed * dt;
    this.node.setPosition(next);
  }

  public launch(direction: Readonly<Vec3>): void {
    this.direction.set(direction.x, direction.y, 0);
    if (this.direction.lengthSqr() > 0) {
      this.direction.normalize();
    }
  }

  private onBeginContact(_self: Collider2D, other: Collider2D, _contact?: IPhysics2DContact | null): void {
    if (this.ignoreNodeNameIncludes && other.node.name.includes(this.ignoreNodeNameIncludes)) {
      return;
    }

    if (this.destroyOnAnyContact || !this.destroyOnNodeNameIncludes || other.node.name.includes(this.destroyOnNodeNameIncludes)) {
      this.node.destroy();
    }
  }
}
