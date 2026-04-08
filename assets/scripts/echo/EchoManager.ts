import { _decorator, Component, Enum, EventTarget, instantiate, Node, Prefab, Vec3 } from 'cc';
import { ECHO_DEBUG_NAME, EchoId } from '../core/GameTypes';

const { ccclass, property } = _decorator;

export const ECHO_EVENT_UNLOCKED = 'echo-unlocked';
export const ECHO_EVENT_SELECTED = 'echo-selected';

@ccclass('EchoPrefabEntry')
export class EchoPrefabEntry {
  @property({ type: Enum(EchoId) })
  echoId: EchoId = EchoId.Box;

  @property(Prefab)
  prefab: Prefab | null = null;
}

@ccclass('EchoManager')
export class EchoManager extends Component {
  public readonly events = new EventTarget();

  @property([EchoPrefabEntry])
  entries: EchoPrefabEntry[] = [];

  @property(Prefab)
  boxPrefab: Prefab | null = null;

  @property(Prefab)
  springFlowerPrefab: Prefab | null = null;

  @property(Prefab)
  bombBugPrefab: Prefab | null = null;

  @property({ type: Enum(EchoId) })
  currentEchoId: EchoId = EchoId.Box;

  @property
  spawnLimit = 2;

  private prefabMap = new Map<EchoId, Prefab>();
  private activeEchoes: Node[] = [];
  private unlockedEchoes = new Set<EchoId>([EchoId.Box]);

  protected onLoad(): void {
    this.prefabMap.clear();

    for (const entry of this.entries) {
      if (entry.prefab) {
        this.prefabMap.set(entry.echoId, entry.prefab);
      }
    }

    this.registerFallbackPrefab(EchoId.Box, this.boxPrefab);
    this.registerFallbackPrefab(EchoId.SpringFlower, this.springFlowerPrefab);
    this.registerFallbackPrefab(EchoId.BombBug, this.bombBugPrefab);
  }

  public unlockEcho(echoId: EchoId): void {
    if (this.unlockedEchoes.has(echoId)) {
      return;
    }

    this.unlockedEchoes.add(echoId);
    this.events.emit(ECHO_EVENT_UNLOCKED, echoId);
  }

  public getUnlockedEchoes(): EchoId[] {
    return Array.from(this.unlockedEchoes);
  }

  public getCurrentEchoId(): EchoId {
    return this.currentEchoId;
  }

  public selectEcho(echoId: EchoId): void {
    if (!this.unlockedEchoes.has(echoId) || this.currentEchoId === echoId) {
      return;
    }

    this.currentEchoId = echoId;
    this.events.emit(ECHO_EVENT_SELECTED, echoId);
  }

  public cycleSelection(step = 1): EchoId {
    const unlocked = this.getUnlockedEchoes();
    if (unlocked.length === 0) {
      return this.currentEchoId;
    }

    const currentIndex = Math.max(0, unlocked.indexOf(this.currentEchoId));
    const nextIndex = (currentIndex + step + unlocked.length) % unlocked.length;
    this.selectEcho(unlocked[nextIndex]);
    return this.currentEchoId;
  }

  public applySaveState(unlockedEchoes: EchoId[], selectedEcho: EchoId): void {
    const nextUnlocked = unlockedEchoes.length > 0 ? unlockedEchoes : [EchoId.Box];
    this.unlockedEchoes = new Set(nextUnlocked);
    this.unlockedEchoes.add(EchoId.Box);

    const nextSelected = this.unlockedEchoes.has(selectedEcho)
      ? selectedEcho
      : nextUnlocked[0] ?? EchoId.Box;
    this.currentEchoId = nextSelected;
    this.events.emit(ECHO_EVENT_SELECTED, nextSelected);
  }

  public spawnCurrentEcho(worldPosition: Vec3): boolean {
    this.pruneDestroyedEchoes();

    if (!this.unlockedEchoes.has(this.currentEchoId)) {
      return false;
    }

    const prefab = this.prefabMap.get(this.currentEchoId);
    if (!prefab) {
      return false;
    }

    if (this.activeEchoes.length >= this.spawnLimit) {
      this.reclaimOldestEcho();
    }

    const echoNode = instantiate(prefab);
    echoNode.name = `Echo-${ECHO_DEBUG_NAME[this.currentEchoId]}`;
    echoNode.setParent(this.node);
    echoNode.setWorldPosition(worldPosition);
    this.activeEchoes.push(echoNode);
    return true;
  }

  public reclaimAll(): void {
    this.pruneDestroyedEchoes();

    for (const echo of this.activeEchoes) {
      if (echo.isValid) {
        echo.destroy();
      }
    }

    this.activeEchoes.length = 0;
  }

  public reclaimOldestEcho(): void {
    this.pruneDestroyedEchoes();

    const echo = this.activeEchoes.shift();
    if (echo && echo.isValid) {
      echo.destroy();
    }
  }

  public resetRoomState(): void {
    this.reclaimAll();
  }

  private registerFallbackPrefab(echoId: EchoId, prefab: Prefab | null): void {
    if (prefab && !this.prefabMap.has(echoId)) {
      this.prefabMap.set(echoId, prefab);
    }
  }

  private pruneDestroyedEchoes(): void {
    this.activeEchoes = this.activeEchoes.filter((echo) => echo?.isValid);
  }
}
