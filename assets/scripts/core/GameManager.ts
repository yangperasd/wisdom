import { _decorator, Component, director, EventTarget, Node, Vec3 } from 'cc';
import {
  CheckpointData,
  GAME_EVENT_CHECKPOINT_CHANGED,
  GAME_EVENT_FLAGS_CHANGED,
  GAME_EVENT_FLOW_CHANGED,
  GAME_EVENT_RESPAWN_REQUESTED,
  GameFlowState,
} from './GameTypes';
import { startWechatDevtoolsRuntimeProbe } from '../qa/WechatDevtoolsRuntimeProbe';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
  public static instance: GameManager | null = null;

  public readonly events = new EventTarget();

  @property({ type: Node, tooltip: 'Optional player root for respawn alignment.' })
  playerRoot: Node | null = null;

  @property
  persistOnLoad = true;

  private flowState = GameFlowState.Boot;
  private checkpoint: CheckpointData | null = null;
  private progressFlags = new Set<string>();

  protected onLoad(): void {
    if (GameManager.instance && GameManager.instance !== this) {
      this.destroy();
      return;
    }

    GameManager.instance = this;

    if (this.persistOnLoad) {
      director.addPersistRootNode(this.node);
    }

    this.flowState = GameFlowState.Playing;
    startWechatDevtoolsRuntimeProbe();
  }

  protected onDestroy(): void {
    if (GameManager.instance === this) {
      GameManager.instance = null;
    }
  }

  public setFlowState(nextState: GameFlowState): void {
    if (this.flowState === nextState) {
      return;
    }

    this.flowState = nextState;
    this.events.emit(GAME_EVENT_FLOW_CHANGED, nextState);
  }

  public getFlowState(): GameFlowState {
    return this.flowState;
  }

  public pauseGame(): void {
    this.setFlowState(GameFlowState.Paused);
  }

  public resumeGame(): void {
    this.setFlowState(GameFlowState.Playing);
  }

  public togglePause(): GameFlowState {
    if (this.flowState === GameFlowState.Paused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }

    return this.flowState;
  }

  public isPaused(): boolean {
    return this.flowState === GameFlowState.Paused;
  }

  public setCheckpoint(sceneName: string, markerId: string, worldPosition: Vec3): void {
    this.applyCheckpoint({
      sceneName,
      markerId,
      worldPosition: {
        x: worldPosition.x,
        y: worldPosition.y,
        z: worldPosition.z,
      },
    });
  }

  public getCheckpoint(): CheckpointData | null {
    return this.checkpoint;
  }

  public applyCheckpoint(nextCheckpoint: CheckpointData | null, emitEvent = true): void {
    this.checkpoint = nextCheckpoint
      ? {
          sceneName: nextCheckpoint.sceneName,
          markerId: nextCheckpoint.markerId,
          worldPosition: {
            x: nextCheckpoint.worldPosition.x,
            y: nextCheckpoint.worldPosition.y,
            z: nextCheckpoint.worldPosition.z,
          },
        }
      : null;

    if (emitEvent) {
      this.events.emit(GAME_EVENT_CHECKPOINT_CHANGED, this.checkpoint);
    }
  }

  public requestRespawn(): void {
    this.events.emit(GAME_EVENT_RESPAWN_REQUESTED, this.checkpoint);

    if (this.playerRoot && this.checkpoint) {
      this.playerRoot.setWorldPosition(
        new Vec3(
          this.checkpoint.worldPosition.x,
          this.checkpoint.worldPosition.y,
          this.checkpoint.worldPosition.z,
        ),
      );
    }
  }

  public setProgressFlag(flagId: string, emitEvent = true): boolean {
    const normalizedFlagId = flagId.trim();
    if (!normalizedFlagId || this.progressFlags.has(normalizedFlagId)) {
      return false;
    }

    this.progressFlags.add(normalizedFlagId);
    if (emitEvent) {
      this.events.emit(GAME_EVENT_FLAGS_CHANGED, this.getProgressFlags());
    }
    return true;
  }

  public hasProgressFlag(flagId: string): boolean {
    return this.progressFlags.has(flagId.trim());
  }

  public getProgressFlags(): string[] {
    return Array.from(this.progressFlags);
  }

  public applyProgressFlags(flags: string[], emitEvent = true): void {
    this.progressFlags = new Set(
      flags
        .map((flag) => flag.trim())
        .filter((flag) => flag.length > 0),
    );

    if (emitEvent) {
      this.events.emit(GAME_EVENT_FLAGS_CHANGED, this.getProgressFlags());
    }
  }
}
