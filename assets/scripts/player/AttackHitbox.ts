import { _decorator, Collider2D, Component, Contact2DType, IPhysics2DContact } from 'cc';
import { HealthComponent } from '../combat/HealthComponent';
import {
  PLAYER_EVENT_ATTACK_ENDED,
  PLAYER_EVENT_ATTACK_STARTED,
  PlayerController,
} from './PlayerController';

const { ccclass, property } = _decorator;

@ccclass('AttackHitbox')
export class AttackHitbox extends Component {
  @property(PlayerController)
  player: PlayerController | null = null;

  @property
  damage = 1;

  @property
  targetNameIncludes = 'Enemy';

  private collider: Collider2D | null = null;
  private hitTargets = new Set<string>();

  protected onLoad(): void {
    this.collider = this.getComponent(Collider2D);
    if (this.collider) {
      this.collider.enabled = false;
      this.collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
    }
  }

  protected onEnable(): void {
    this.player?.events.on(PLAYER_EVENT_ATTACK_STARTED, this.onAttackStarted, this);
    this.player?.events.on(PLAYER_EVENT_ATTACK_ENDED, this.onAttackEnded, this);
  }

  protected onDisable(): void {
    this.player?.events.off(PLAYER_EVENT_ATTACK_STARTED, this.onAttackStarted, this);
    this.player?.events.off(PLAYER_EVENT_ATTACK_ENDED, this.onAttackEnded, this);
  }

  protected onDestroy(): void {
    this.collider?.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
  }

  private onAttackStarted(): void {
    this.hitTargets.clear();
    if (this.collider) {
      this.collider.enabled = true;
    }
  }

  private onAttackEnded(): void {
    this.hitTargets.clear();
    if (this.collider) {
      this.collider.enabled = false;
    }
  }

  private onBeginContact(_self: Collider2D, other: Collider2D, _contact?: IPhysics2DContact | null): void {
    if (!this.player || !this.player.isAttacking()) {
      return;
    }

    if (this.targetNameIncludes && !other.node.name.includes(this.targetNameIncludes)) {
      return;
    }

    if (this.hitTargets.has(other.node.uuid)) {
      return;
    }

    const health = other.getComponent(HealthComponent);
    if (!health) {
      return;
    }

    if (health.applyDamage(this.damage)) {
      this.hitTargets.add(other.node.uuid);
    }
  }
}
