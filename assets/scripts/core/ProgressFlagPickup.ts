import { _decorator, Collider2D, Component, Contact2DType, IPhysics2DContact, Node } from 'cc';
import { CollectiblePresentation } from '../visual/CollectiblePresentation';
import { GameManager } from './GameManager';

const { ccclass, property } = _decorator;

@ccclass('ProgressFlagPickup')
export class ProgressFlagPickup extends Component {
  @property
  flagId = '';

  @property
  playerNameIncludes = 'Player';

  @property([Node])
  activateOnCollected: Node[] = [];

  @property([Node])
  deactivateOnCollected: Node[] = [];

  @property
  destroyOnCollected = true;

  private collider: Collider2D | null = null;
  private presentation: CollectiblePresentation | null = null;

  protected onLoad(): void {
    this.collider = this.getComponent(Collider2D);
    this.collider?.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
    this.presentation = this.getComponent(CollectiblePresentation);
    this.presentation?.applyPresentation();
    this.applyCollectedState(GameManager.instance?.hasProgressFlag(this.flagId) ?? false);
  }

  protected onDestroy(): void {
    this.collider?.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
  }

  private onBeginContact(_self: Collider2D, other: Collider2D, _contact?: IPhysics2DContact | null): void {
    if (!other.node.name.includes(this.playerNameIncludes)) {
      return;
    }

    if (!this.flagId) {
      return;
    }

    const didUnlock = GameManager.instance?.setProgressFlag(this.flagId) ?? false;
    if (didUnlock) {
      this.presentation?.playPickupFeedback();
    }
    this.applyCollectedState(true);

    if (didUnlock && this.destroyOnCollected) {
      this.node.destroy();
    } else if (didUnlock) {
      this.node.active = false;
    }
  }

  private applyCollectedState(collected: boolean): void {
    if (collected) {
      for (const node of this.activateOnCollected) {
        if (node?.isValid) {
          node.active = true;
        }
      }

      for (const node of this.deactivateOnCollected) {
        if (node?.isValid) {
          node.active = false;
        }
      }

      if (this.node.isValid && (GameManager.instance?.hasProgressFlag(this.flagId) ?? false)) {
        this.node.active = !this.destroyOnCollected;
      }
    }
  }
}
