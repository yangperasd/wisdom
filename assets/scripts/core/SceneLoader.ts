import { _decorator, Component, EventTarget, director } from 'cc';

const { ccclass, property } = _decorator;

export const SCENE_EVENT_WILL_SWITCH = 'scene-will-switch';
export const SCENE_EVENT_SWITCH_STATE_CHANGED = 'scene-switch-state-changed';

export type SceneSwitchStatus = 'idle' | 'switching' | 'failed';

export interface SceneSwitchState {
  status: SceneSwitchStatus;
  targetScene: string;
  errorMessage: string;
  requestedAt: number;
  completedAt: number;
  failedAt: number;
}

const EMPTY_SWITCH_STATE: SceneSwitchState = {
  status: 'idle',
  targetScene: '',
  errorMessage: '',
  requestedAt: 0,
  completedAt: 0,
  failedAt: 0,
};

@ccclass('SceneLoader')
export class SceneLoader extends Component {
  public static instance: SceneLoader | null = null;
  private static sharedSwitchState: SceneSwitchState = { ...EMPTY_SWITCH_STATE };
  private static sharedSwitchRequestId = 0;

  public readonly events = new EventTarget();

  @property({ tooltip: 'Seconds before an accepted scene switch is treated as stalled and retryable.' })
  switchTimeoutSeconds = 12;

  private switchState: SceneSwitchState = { ...SceneLoader.sharedSwitchState };
  private switchRequestId = SceneLoader.sharedSwitchRequestId;

  protected onLoad(): void {
    SceneLoader.instance = this;
    this.switchState = { ...SceneLoader.sharedSwitchState };
    this.switchRequestId = SceneLoader.sharedSwitchRequestId;
    this.scheduleOnce(() => this.completeSwitchIfCurrentScene(), 0);
  }

  protected onDestroy(): void {
    if (SceneLoader.instance === this) {
      SceneLoader.instance = null;
    }
  }

  public preloadScene(sceneName: string): void {
    director.preloadScene(sceneName);
  }

  public switchScene(sceneName: string): boolean {
    const targetScene = sceneName.trim();
    if (!targetScene) {
      this.failSwitch('', 'Scene switch target is empty.');
      return false;
    }

    const requestId = SceneLoader.sharedSwitchRequestId + 1;
    this.switchRequestId = requestId;
    SceneLoader.sharedSwitchRequestId = requestId;

    this.setSwitchState({
      status: 'switching',
      targetScene,
      errorMessage: '',
      requestedAt: Date.now(),
      completedAt: 0,
      failedAt: 0,
    });
    this.events.emit(SCENE_EVENT_WILL_SWITCH, sceneName);

    try {
      const accepted = director.loadScene(targetScene, () => {
        if (!this.isCurrentSwitchRequest(requestId, targetScene)) {
          return;
        }

        const requestedAt = this.switchState?.requestedAt ?? SceneLoader.sharedSwitchState.requestedAt;
        this.setSwitchState({
          status: 'idle',
          targetScene,
          errorMessage: '',
          requestedAt,
          completedAt: Date.now(),
          failedAt: 0,
        });
      });

      if (accepted === false) {
        this.failSwitch(targetScene, `Cocos rejected scene switch to ${targetScene}.`, requestId);
        return false;
      }
    } catch (error) {
      this.failSwitch(targetScene, error instanceof Error ? error.message : String(error), requestId);
      return false;
    }

    this.scheduleSwitchWatchdog(targetScene, requestId);
    return true;
  }

  public getSwitchState(): SceneSwitchState {
    return { ...(this.switchState ?? SceneLoader.sharedSwitchState ?? EMPTY_SWITCH_STATE) };
  }

  public hasSwitchError(): boolean {
    return this.switchState.status === 'failed';
  }

  public clearSwitchError(): void {
    if (this.switchState.status !== 'failed') {
      return;
    }
    this.setSwitchState({ ...EMPTY_SWITCH_STATE });
  }

  public retryLastFailedSwitch(): boolean {
    if (this.switchState.status !== 'failed' || !this.switchState.targetScene) {
      return false;
    }

    return this.switchScene(this.switchState.targetScene);
  }

  private failSwitch(targetScene: string, errorMessage: string, requestId = this.switchRequestId): void {
    if (requestId !== this.switchRequestId || requestId !== SceneLoader.sharedSwitchRequestId) {
      return;
    }

    this.setSwitchState({
      status: 'failed',
      targetScene,
      errorMessage,
      requestedAt: this.switchState.requestedAt,
      completedAt: 0,
      failedAt: Date.now(),
    });
  }

  private scheduleSwitchWatchdog(targetScene: string, requestId: number): void {
    if (this.switchTimeoutSeconds <= 0) {
      return;
    }

    this.scheduleOnce(() => {
      if (!this.isCurrentSwitchRequest(requestId, targetScene)) {
        return;
      }

      this.failSwitch(
        targetScene,
        `Scene switch to ${targetScene} timed out after ${this.switchTimeoutSeconds.toFixed(2)}s. Retry is available.`,
        requestId,
      );
    }, this.switchTimeoutSeconds);
  }

  private completeSwitchIfCurrentScene(): void {
    if (this.switchState.status !== 'switching' || !this.switchState.targetScene) {
      return;
    }

    if (director.getScene()?.name !== this.switchState.targetScene) {
      return;
    }

    this.setSwitchState({
      status: 'idle',
      targetScene: this.switchState.targetScene,
      errorMessage: '',
      requestedAt: this.switchState.requestedAt,
      completedAt: Date.now(),
      failedAt: 0,
    });
  }

  private isCurrentSwitchRequest(requestId: number, targetScene: string): boolean {
    const switchState = this.switchState ?? SceneLoader.sharedSwitchState ?? EMPTY_SWITCH_STATE;

    return requestId === this.switchRequestId &&
      requestId === SceneLoader.sharedSwitchRequestId &&
      switchState.status === 'switching' &&
      switchState.targetScene === targetScene;
  }

  private setSwitchState(nextState: SceneSwitchState): void {
    this.switchState = nextState;
    SceneLoader.sharedSwitchState = { ...nextState };
    this.events.emit(SCENE_EVENT_SWITCH_STATE_CHANGED, this.getSwitchState());
  }
}
