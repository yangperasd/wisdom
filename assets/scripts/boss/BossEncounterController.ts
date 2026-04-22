import { _decorator, Component, Node } from 'cc';
import { HEALTH_EVENT_DEPLETED, HealthComponent } from '../combat/HealthComponent';
import { GameManager } from '../core/GameManager';
import { GAME_EVENT_FLAGS_CHANGED, GAME_EVENT_RESPAWN_REQUESTED } from '../core/GameTypes';

const { ccclass, property } = _decorator;

@ccclass('BossEncounterController')
export class BossEncounterController extends Component {
  @property(HealthComponent)
  bossHealth: HealthComponent | null = null;

  @property(Node)
  bossRoot: Node | null = null;

  @property
  clearFlagId = 'boss-cleared';

  @property([Node])
  activateOnCleared: Node[] = [];

  @property([Node])
  deactivateOnCleared: Node[] = [];

  protected onLoad(): void {
    this.bossHealth?.events?.on(HEALTH_EVENT_DEPLETED, this.onBossDepleted, this);
    this.applyState(GameManager.instance?.hasProgressFlag(this.clearFlagId) ?? false);
  }

  protected onEnable(): void {
    GameManager.instance?.events?.on(GAME_EVENT_FLAGS_CHANGED, this.refreshFromFlags, this);
    GameManager.instance?.events?.on(GAME_EVENT_RESPAWN_REQUESTED, this.refreshFromFlags, this);
  }

  protected onDisable(): void {
    GameManager.instance?.events?.off(GAME_EVENT_FLAGS_CHANGED, this.refreshFromFlags, this);
    GameManager.instance?.events?.off(GAME_EVENT_RESPAWN_REQUESTED, this.refreshFromFlags, this);
  }

  protected onDestroy(): void {
    this.bossHealth?.events?.off(HEALTH_EVENT_DEPLETED, this.onBossDepleted, this);
  }

  private onBossDepleted(): void {
    GameManager.instance?.setProgressFlag(this.clearFlagId);
    this.applyState(true);
  }

  private refreshFromFlags(): void {
    this.applyState(GameManager.instance?.hasProgressFlag(this.clearFlagId) ?? false);
  }

  private applyState(isCleared: boolean): void {
    if (this.bossRoot?.isValid) {
      this.bossRoot.active = !isCleared;
    }

    for (const node of this.activateOnCleared) {
      if (node?.isValid) {
        node.active = isCleared;
      }
    }

    for (const node of this.deactivateOnCleared) {
      if (node?.isValid) {
        node.active = !isCleared;
      }
    }
  }
}
