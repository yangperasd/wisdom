import { _decorator, Component, director, Vec3 } from 'cc';
import { EchoId, GAME_EVENT_CHECKPOINT_CHANGED, GAME_EVENT_FLAGS_CHANGED, SaveSnapshot } from './GameTypes';
import { GameManager } from './GameManager';
import { SaveSystem } from './SaveSystem';
import { EchoManager, ECHO_EVENT_SELECTED, ECHO_EVENT_UNLOCKED } from '../echo/EchoManager';
import { PlayerController } from '../player/PlayerController';

const { ccclass, property } = _decorator;

@ccclass('GameSession')
export class GameSession extends Component {
  @property(GameManager)
  gameManager: GameManager | null = null;

  @property(SaveSystem)
  saveSystem: SaveSystem | null = null;

  @property(EchoManager)
  echoManager: EchoManager | null = null;

  @property(PlayerController)
  player: PlayerController | null = null;

  @property
  respawnPlayerAtSavedCheckpoint = true;

  private snapshot: SaveSnapshot | null = null;
  private isApplyingSnapshot = false;

  protected start(): void {
    this.applySnapshotFromDisk();
    this.bindEvents();
  }

  protected onDestroy(): void {
    const gameEvents = this.gameManager?.events ?? null;
    const echoEvents = this.echoManager?.events ?? null;

    gameEvents?.off(GAME_EVENT_CHECKPOINT_CHANGED, this.saveNow, this);
    gameEvents?.off(GAME_EVENT_FLAGS_CHANGED, this.saveNow, this);
    echoEvents?.off(ECHO_EVENT_UNLOCKED, this.saveNow, this);
    echoEvents?.off(ECHO_EVENT_SELECTED, this.saveNow, this);
  }

  public saveNow(): void {
    if (this.isApplyingSnapshot) {
      return;
    }

    const saveSystem = this.resolveSaveSystem();
    if (!saveSystem) {
      return;
    }

    this.snapshot = this.createSnapshot();
    saveSystem.save(this.snapshot);
  }

  private applySnapshotFromDisk(): void {
    const saveSystem = this.resolveSaveSystem();
    if (!saveSystem) {
      return;
    }

    this.snapshot = saveSystem.load();
    this.isApplyingSnapshot = true;

    this.gameManager?.applyCheckpoint(this.snapshot.lastCheckpoint, false);
    this.gameManager?.applyProgressFlags(
      [
        ...(this.snapshot.unlockedShortcuts ?? []),
        ...(this.snapshot.bossCleared ? ['boss-cleared'] : []),
      ],
      false,
    );
    this.echoManager?.applySaveState(this.snapshot.unlockedEchoes, this.snapshot.selectedEcho);

    if (
      this.respawnPlayerAtSavedCheckpoint &&
      this.player &&
      this.snapshot.lastCheckpoint &&
      this.snapshot.lastCheckpoint.sceneName === (director.getScene()?.name ?? '')
    ) {
      this.player.respawnAt(
        new Vec3(
          this.snapshot.lastCheckpoint.worldPosition.x,
          this.snapshot.lastCheckpoint.worldPosition.y,
          this.snapshot.lastCheckpoint.worldPosition.z,
        ),
      );
    }

    this.isApplyingSnapshot = false;
  }

  private bindEvents(): void {
    const gameEvents = this.gameManager?.events ?? null;
    const echoEvents = this.echoManager?.events ?? null;

    gameEvents?.on(GAME_EVENT_CHECKPOINT_CHANGED, this.saveNow, this);
    gameEvents?.on(GAME_EVENT_FLAGS_CHANGED, this.saveNow, this);
    echoEvents?.on(ECHO_EVENT_UNLOCKED, this.saveNow, this);
    echoEvents?.on(ECHO_EVENT_SELECTED, this.saveNow, this);
  }

  private createSnapshot(): SaveSnapshot {
    const previous = this.snapshot;
    const progressFlags = Array.from(
      new Set(this.gameManager?.getProgressFlags() ?? previous?.unlockedShortcuts ?? []),
    );
    const bossCleared = progressFlags.indexOf('boss-cleared') !== -1 || previous?.bossCleared === true;
    if (bossCleared && progressFlags.indexOf('boss-cleared') === -1) {
      progressFlags.push('boss-cleared');
    }

    return {
      lastCheckpoint: this.gameManager?.getCheckpoint() ?? previous?.lastCheckpoint ?? null,
      unlockedEchoes: this.echoManager?.getUnlockedEchoes() ?? previous?.unlockedEchoes ?? [EchoId.Box],
      selectedEcho: this.echoManager?.getCurrentEchoId() ?? previous?.selectedEcho ?? EchoId.Box,
      unlockedShortcuts: progressFlags,
      bossCleared,
    };
  }

  private resolveSaveSystem(): SaveSystem | null {
    return this.saveSystem ?? SaveSystem.instance;
  }
}
