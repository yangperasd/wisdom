import { _decorator, Collider2D, Component, Contact2DType, IPhysics2DContact, Vec3 } from 'cc';
import { GameManager } from '../core/GameManager';
import { PlayerController } from '../player/PlayerController';

const { ccclass, property } = _decorator;

@ccclass('SpringFlowerBounce')
export class SpringFlowerBounce extends Component {
  @property
  directionX = 1;

  @property
  directionY = 0.35;

  @property
  launchDistance = 190;

  @property
  launchDuration = 0.22;

  @property
  cooldownSeconds = 0.45;

  @property
  playerNameIncludes = 'Player';

  private collider: Collider2D | null = null;
  private cooldownTimer = 0;

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

    if (this.cooldownTimer > 0) {
      this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);
    }
  }

  private onBeginContact(_self: Collider2D, other: Collider2D, _contact?: IPhysics2DContact | null): void {
    if (GameManager.instance?.isPaused()) {
      return;
    }

    if (this.cooldownTimer > 0) {
      return;
    }

    if (this.playerNameIncludes && !other.node.name.includes(this.playerNameIncludes)) {
      return;
    }

    const player = other.node.getComponent(PlayerController);
    if (!player) {
      return;
    }

    const launchDirection = new Vec3(this.directionX, this.directionY, 0);
    if (!player.launch(launchDirection, this.launchDistance, this.launchDuration)) {
      return;
    }

    this.cooldownTimer = this.cooldownSeconds;
  }
}
