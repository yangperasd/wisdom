import { _decorator, Collider2D, Component, Contact2DType, IPhysics2DContact } from 'cc';
import { HealthComponent } from './HealthComponent';

const { ccclass, property } = _decorator;

@ccclass('DamageOnContact')
export class DamageOnContact extends Component {
  @property
  damage = 1;

  @property
  targetNameIncludes = 'Player';

  @property
  destroyAfterHit = false;

  private collider: Collider2D | null = null;

  protected onLoad(): void {
    this.collider = this.getComponent(Collider2D);
    this.collider?.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
  }

  protected onDestroy(): void {
    this.collider?.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
  }

  private onBeginContact(_self: Collider2D, other: Collider2D, _contact?: IPhysics2DContact | null): void {
    if (this.targetNameIncludes && !other.node.name.includes(this.targetNameIncludes)) {
      return;
    }

    const health = other.getComponent(HealthComponent);
    if (!health) {
      return;
    }

    if (health.applyDamage(this.damage) && this.destroyAfterHit) {
      this.node.destroy();
    }
  }
}
