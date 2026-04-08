import { _decorator, Collider2D, Component, Contact2DType, director, IPhysics2DContact, Vec3 } from 'cc';
import { GameManager } from './GameManager';
import { SceneLoader } from './SceneLoader';

const { ccclass, property } = _decorator;

@ccclass('ScenePortal')
export class ScenePortal extends Component {
  @property(SceneLoader)
  sceneLoader: SceneLoader | null = null;

  @property
  targetScene = '';

  @property
  targetMarkerId = 'scene-entry';

  @property
  targetPositionX = 0;

  @property
  targetPositionY = 0;

  @property
  targetPositionZ = 0;

  @property
  preloadTarget = true;

  @property
  playerNameIncludes = 'Player';

  private collider: Collider2D | null = null;
  private isTransitioning = false;

  protected onLoad(): void {
    this.collider = this.getComponent(Collider2D);
    this.collider?.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
  }

  protected start(): void {
    if (this.preloadTarget && this.targetScene) {
      this.resolveSceneLoader()?.preloadScene(this.targetScene);
    }
  }

  protected onDisable(): void {
    this.isTransitioning = false;
  }

  protected onDestroy(): void {
    this.collider?.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
  }

  private onBeginContact(_self: Collider2D, other: Collider2D, _contact?: IPhysics2DContact | null): void {
    if (
      this.isTransitioning ||
      !this.targetScene ||
      !other.node.name.includes(this.playerNameIncludes)
    ) {
      return;
    }

    if (director.getScene()?.name === this.targetScene) {
      return;
    }

    this.isTransitioning = true;

    GameManager.instance?.setCheckpoint(
      this.targetScene,
      this.targetMarkerId,
      new Vec3(this.targetPositionX, this.targetPositionY, this.targetPositionZ),
    );

    this.resolveSceneLoader()?.switchScene(this.targetScene);
  }

  private resolveSceneLoader(): SceneLoader | null {
    return this.sceneLoader ?? SceneLoader.instance;
  }
}
