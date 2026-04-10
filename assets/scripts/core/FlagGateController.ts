import { _decorator, CCString, Component, Node, SpriteFrame } from 'cc';
import { GameManager } from './GameManager';
import { GAME_EVENT_FLAGS_CHANGED } from './GameTypes';
import { applySpriteFrameToPlaceholderVisual } from '../visual/SpriteVisualSkin';

const { ccclass, property } = _decorator;

@ccclass('FlagGateController')
export class FlagGateController extends Component {
  @property([CCString])
  requiredFlags: string[] = [];

  @property(Node)
  closedVisualNode: Node | null = null;

  @property(Node)
  openVisualNode: Node | null = null;

  @property(SpriteFrame)
  closedSpriteFrame: SpriteFrame | null = null;

  @property(SpriteFrame)
  openSpriteFrame: SpriteFrame | null = null;

  @property([Node])
  activateWhenReady: Node[] = [];

  @property([Node])
  deactivateWhenReady: Node[] = [];

  @property
  activeWhenIncomplete = true;

  protected onLoad(): void {
    this.applyVisualSkins();
    this.applyState();
  }

  protected onEnable(): void {
    this.bindGameManager();
  }

  protected start(): void {
    this.bindGameManager();
    this.applyState();
  }

  protected onDisable(): void {
    GameManager.instance?.events.off(GAME_EVENT_FLAGS_CHANGED, this.applyState, this);
  }

  public applyState(): void {
    this.applyVisualSkins();
    const isReady = this.requiredFlags.every((flag) => GameManager.instance?.hasProgressFlag(flag));

    for (const node of this.activateWhenReady) {
      if (node?.isValid) {
        node.active = isReady;
      }
    }

    for (const node of this.deactivateWhenReady) {
      if (node?.isValid) {
        node.active = isReady ? false : this.activeWhenIncomplete;
      }
    }
  }

  private bindGameManager(): void {
    GameManager.instance?.events.off(GAME_EVENT_FLAGS_CHANGED, this.applyState, this);
    GameManager.instance?.events.on(GAME_EVENT_FLAGS_CHANGED, this.applyState, this);
  }

  private applyVisualSkins(): void {
    applySpriteFrameToPlaceholderVisual(this.closedVisualNode, this.closedSpriteFrame);
    applySpriteFrameToPlaceholderVisual(this.openVisualNode, this.openSpriteFrame);
  }
}
