import { _decorator, Component, EventTarget, director } from 'cc';

const { ccclass } = _decorator;

export const SCENE_EVENT_WILL_SWITCH = 'scene-will-switch';

@ccclass('SceneLoader')
export class SceneLoader extends Component {
  public static instance: SceneLoader | null = null;

  public readonly events = new EventTarget();

  protected onLoad(): void {
    SceneLoader.instance = this;
  }

  protected onDestroy(): void {
    if (SceneLoader.instance === this) {
      SceneLoader.instance = null;
    }
  }

  public preloadScene(sceneName: string): void {
    director.preloadScene(sceneName);
  }

  public switchScene(sceneName: string): void {
    this.events.emit(SCENE_EVENT_WILL_SWITCH, sceneName);
    director.loadScene(sceneName);
  }
}
