import { _decorator, Component, EventTarget, Node, Vec3 } from 'cc';
import { GameManager } from '../core/GameManager';
import { GAME_EVENT_RESPAWN_REQUESTED } from '../core/GameTypes';

const { ccclass, property } = _decorator;

export const BREAKABLE_EVENT_BROKEN = 'breakable-broken';
export const BREAKABLE_EVENT_RESET = 'breakable-reset';

@ccclass('BreakableTarget')
export class BreakableTarget extends Component {
  public readonly events = new EventTarget();

  @property
  startsBroken = false;

  @property([Node])
  activateOnBroken: Node[] = [];

  @property([Node])
  deactivateOnBroken: Node[] = [];

  private isBroken = false;

  protected onLoad(): void {
    this.isBroken = this.startsBroken;
    this.applyState();
  }

  protected onEnable(): void {
    this.bindGameManager();
  }

  protected start(): void {
    this.bindGameManager();
  }

  protected onDisable(): void {
    GameManager.instance?.events.off(GAME_EVENT_RESPAWN_REQUESTED, this.resetState, this);
  }

  public applyExplosion(_origin?: Readonly<Vec3>): boolean {
    if (this.isBroken) {
      return false;
    }

    this.isBroken = true;
    this.applyState();
    this.events.emit(BREAKABLE_EVENT_BROKEN);
    return true;
  }

  public resetState(): void {
    this.isBroken = this.startsBroken;
    this.applyState();
    this.events.emit(BREAKABLE_EVENT_RESET, this.isBroken);
  }

  public isCurrentlyBroken(): boolean {
    return this.isBroken;
  }

  private applyState(): void {
    for (const node of this.activateOnBroken) {
      if (node?.isValid) {
        node.active = this.isBroken;
      }
    }

    for (const node of this.deactivateOnBroken) {
      if (node?.isValid) {
        node.active = !this.isBroken;
      }
    }
  }

  private bindGameManager(): void {
    GameManager.instance?.events.off(GAME_EVENT_RESPAWN_REQUESTED, this.resetState, this);
    GameManager.instance?.events.on(GAME_EVENT_RESPAWN_REQUESTED, this.resetState, this);
  }
}
