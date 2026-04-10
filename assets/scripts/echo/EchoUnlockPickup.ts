import { _decorator, Collider2D, Component, Contact2DType, Enum, IPhysics2DContact } from 'cc';
import { EchoId } from '../core/GameTypes';
import { CollectiblePresentation } from '../visual/CollectiblePresentation';
import { EchoManager } from './EchoManager';

const { ccclass, property } = _decorator;

@ccclass('EchoUnlockPickup')
export class EchoUnlockPickup extends Component {
  @property(EchoManager)
  echoManager: EchoManager | null = null;

  @property({ type: Enum(EchoId) })
  echoId: EchoId = EchoId.SpringFlower;

  @property
  playerNameIncludes = 'Player';

  @property
  selectAfterUnlock = true;

  @property
  destroyOnPickup = true;

  private collider: Collider2D | null = null;
  private presentation: CollectiblePresentation | null = null;

  protected onLoad(): void {
    this.collider = this.getComponent(Collider2D);
    this.collider?.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
    this.presentation = this.getComponent(CollectiblePresentation);
    this.presentation?.applyPresentation();
  }

  protected onDestroy(): void {
    this.collider?.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
  }

  private onBeginContact(_self: Collider2D, other: Collider2D, _contact?: IPhysics2DContact | null): void {
    if (!other.node.name.includes(this.playerNameIncludes) || !this.echoManager) {
      return;
    }

    this.echoManager.unlockEcho(this.echoId);
    if (this.selectAfterUnlock) {
      this.echoManager.selectEcho(this.echoId);
    }

    this.presentation?.playPickupFeedback();

    if (this.destroyOnPickup) {
      this.node.destroy();
    }
  }
}
