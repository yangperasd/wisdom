import { _decorator, Component, sys } from 'cc';
import { EchoId, SaveSnapshot } from './GameTypes';

const { ccclass, property } = _decorator;

@ccclass('SaveSystem')
export class SaveSystem extends Component {
  public static instance: SaveSystem | null = null;

  @property
  storageKey = 'wisdom-mvp-save';

  protected onLoad(): void {
    if (SaveSystem.instance && SaveSystem.instance !== this) {
      this.destroy();
      return;
    }

    SaveSystem.instance = this;
  }

  protected onDestroy(): void {
    if (SaveSystem.instance === this) {
      SaveSystem.instance = null;
    }
  }

  public load(): SaveSnapshot {
    const raw = sys.localStorage.getItem(this.storageKey);

    if (!raw) {
      return this.createEmptySave();
    }

    try {
      return this.normalizeSnapshot(JSON.parse(raw) as Partial<SaveSnapshot>);
    } catch {
      return this.createEmptySave();
    }
  }

  public save(snapshot: SaveSnapshot): void {
    sys.localStorage.setItem(this.storageKey, JSON.stringify(snapshot));
  }

  public clear(): void {
    sys.localStorage.removeItem(this.storageKey);
  }

  private createEmptySave(): SaveSnapshot {
    return {
      lastCheckpoint: null,
      unlockedEchoes: [EchoId.Box],
      selectedEcho: EchoId.Box,
      unlockedShortcuts: [],
      bossCleared: false,
    };
  }

  private normalizeSnapshot(parsed: Partial<SaveSnapshot>): SaveSnapshot {
    const allowedEchoes = [EchoId.Box, EchoId.SpringFlower, EchoId.BombBug];
    const unlockedEchoes = [EchoId.Box];

    for (const echoId of parsed.unlockedEchoes ?? []) {
      if (allowedEchoes.indexOf(echoId) === -1 || unlockedEchoes.indexOf(echoId) !== -1) {
        continue;
      }

      unlockedEchoes.push(echoId);
    }

    const unlockedShortcuts = Array.from(new Set(
      (parsed.unlockedShortcuts ?? [])
        .map((flag) => `${flag}`.trim())
        .filter((flag) => flag.length > 0),
    ));
    const bossCleared = Boolean(parsed.bossCleared) || unlockedShortcuts.indexOf('boss-cleared') !== -1;

    if (bossCleared && unlockedShortcuts.indexOf('boss-cleared') === -1) {
      unlockedShortcuts.push('boss-cleared');
    }

    const selectedEcho = unlockedEchoes.indexOf(parsed.selectedEcho ?? EchoId.Box) !== -1
      ? (parsed.selectedEcho ?? EchoId.Box)
      : unlockedEchoes[0];
    const checkpoint = parsed.lastCheckpoint;
    const lastCheckpoint = checkpoint &&
      typeof checkpoint.sceneName === 'string' &&
      typeof checkpoint.markerId === 'string' &&
      typeof checkpoint.worldPosition?.x === 'number' &&
      typeof checkpoint.worldPosition?.y === 'number' &&
      typeof checkpoint.worldPosition?.z === 'number'
      ? checkpoint
      : null;

    return {
      lastCheckpoint,
      unlockedEchoes,
      selectedEcho,
      unlockedShortcuts,
      bossCleared,
    };
  }
}
