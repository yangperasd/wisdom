import { _decorator, Collider2D, Component, Contact2DType, IPhysics2DContact } from 'cc';
import { GameManager } from '../core/GameManager';
import { PlayerController } from '../player/PlayerController';

const { ccclass, property } = _decorator;

@ccclass('PlayerRespawnZone')
export class PlayerRespawnZone extends Component {
  @property
  playerNameIncludes = 'Player';

  @property
  ignoreWhileForcedMoving = false;

  private collider: Collider2D | null = null;

  protected onLoad(): void {
    this.collider = this.getComponent(Collider2D);
    this.collider?.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
  }

  protected onDestroy(): void {
    this.collider?.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
  }

  private onBeginContact(_self: Collider2D, other: Collider2D, _contact?: IPhysics2DContact | null): void {
    if (!other.node.name.includes(this.playerNameIncludes)) {
      return;
    }

    const player = other.node.getComponent(PlayerController);
    if (this.ignoreWhileForcedMoving && player?.isForcedMoving()) {
      return;
    }

    GameManager.instance?.requestRespawn();
  }
}
