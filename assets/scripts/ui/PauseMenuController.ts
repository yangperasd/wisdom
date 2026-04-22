import { _decorator, Component, Node } from 'cc';
import { GameManager } from '../core/GameManager';
import { GAME_EVENT_FLOW_CHANGED, GameFlowState } from '../core/GameTypes';

const { ccclass, property } = _decorator;

@ccclass('PauseMenuController')
export class PauseMenuController extends Component {
  @property(Node)
  panelRoot: Node | null = null;

  @property(Node)
  pauseButton: Node | null = null;

  @property([Node])
  gameplayTouchNodes: Node[] = [];

  private readonly gameplayTouchVisibility = new Map<string, boolean>();
  private gameplayHiddenByPause = false;

  protected onLoad(): void {
    this.applyState(GameManager.instance?.getFlowState() ?? GameFlowState.Playing);
  }

  protected onEnable(): void {
    GameManager.instance?.events?.on(GAME_EVENT_FLOW_CHANGED, this.applyState, this);
  }

  protected onDisable(): void {
    GameManager.instance?.events?.off(GAME_EVENT_FLOW_CHANGED, this.applyState, this);
  }

  private applyState(state: GameFlowState): void {
    const paused = state === GameFlowState.Paused;

    if (this.panelRoot?.isValid) {
      this.panelRoot.active = paused;
    }

    if (this.pauseButton?.isValid) {
      this.pauseButton.active = !paused;
    }

    if (paused) {
      this.hideGameplayNodesForPause();
      return;
    }

    this.restoreGameplayNodesAfterPause();
  }

  private hideGameplayNodesForPause(): void {
    if (this.gameplayHiddenByPause) {
      return;
    }

    this.gameplayHiddenByPause = true;
    this.gameplayTouchVisibility.clear();

    for (const node of this.gameplayTouchNodes) {
      if (node?.isValid) {
        this.gameplayTouchVisibility.set(node.uuid, node.active);
        node.active = false;
      }
    }
  }

  private restoreGameplayNodesAfterPause(): void {
    if (!this.gameplayHiddenByPause) {
      return;
    }

    this.gameplayHiddenByPause = false;

    for (const node of this.gameplayTouchNodes) {
      if (!node?.isValid) {
        continue;
      }

      const wasActive = this.gameplayTouchVisibility.get(node.uuid);
      if (wasActive !== undefined) {
        node.active = wasActive;
      }
    }

    this.gameplayTouchVisibility.clear();
  }
}
