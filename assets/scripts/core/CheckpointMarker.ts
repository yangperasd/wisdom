import { _decorator, Collider2D, Component, Contact2DType, director, IPhysics2DContact } from 'cc';
import { GameManager } from './GameManager';

const { ccclass, property } = _decorator;

@ccclass('CheckpointMarker')
export class CheckpointMarker extends Component {
  @property
  markerId = 'checkpoint-01';

  @property
  playerNameIncludes = 'Player';

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

    GameManager.instance?.setCheckpoint(
      director.getScene()?.name ?? 'UnknownScene',
      this.markerId,
      this.node.worldPosition,
    );
  }
}
