import { _decorator, AudioClip, AudioSource, Collider2D, Component, Contact2DType, director, IPhysics2DContact, SpriteFrame, Texture2D, Vec3 } from 'cc';
import { GameManager } from './GameManager';
import { SceneLoader } from './SceneLoader';
import {
  applySpriteFrameToPlaceholderVisual,
  destroyGeneratedSpriteFrames,
  PlaceholderSpriteFitMode,
  PlaceholderSpriteVerticalAnchor,
  resolveTextureBackedSpriteFrame,
  setPlaceholderLabelVisible,
} from '../visual/SpriteVisualSkin';

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

  @property(AudioClip)
  enterClip: AudioClip | null = null;

  @property
  enterClipVolume = 1;

  @property(SpriteFrame)
  visualSpriteFrame: SpriteFrame | null = null;

  @property(Texture2D)
  visualTexture: Texture2D | null = null;

  @property
  hideLabelWhenSkinned = true;

  private collider: Collider2D | null = null;
  private isTransitioning = false;
  private audioSource: AudioSource | null = null;
  private readonly generatedFrames = new Map<string, SpriteFrame>();

  protected onLoad(): void {
    this.collider = this.getComponent(Collider2D);
    this.collider?.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
    const audioSource = this.getComponent(AudioSource) ?? this.addComponent(AudioSource);
    if (!audioSource) {
      return;
    }
    this.audioSource = audioSource;
    audioSource.playOnAwake = false;
    audioSource.loop = false;
    this.applyVisual();
  }

  protected start(): void {
    if (this.preloadTarget && this.targetScene) {
      this.resolveSceneLoader()?.preloadScene(this.targetScene);
    }
  }

  protected onDisable(): void {
    this.isTransitioning = false;
  }

  protected onEnable(): void {
    this.applyVisual();
  }

  protected onDestroy(): void {
    this.collider?.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
    destroyGeneratedSpriteFrames(this.generatedFrames);
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

    const audioSource = this.audioSource;
    if (this.enterClip && audioSource) {
      audioSource.playOneShot(this.enterClip, this.enterClipVolume);
    }

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

  private applyVisual(): void {
    const effectiveFrame = this.visualSpriteFrame
      ?? resolveTextureBackedSpriteFrame(this.generatedFrames, 'portal', this.visualTexture);
    applySpriteFrameToPlaceholderVisual(this.node, effectiveFrame, {
      fitMode: PlaceholderSpriteFitMode.Contain,
      verticalAnchor: PlaceholderSpriteVerticalAnchor.Bottom,
      scaleMultiplier: 1,
    });
    setPlaceholderLabelVisible(this.node, !this.hideLabelWhenSkinned || !effectiveFrame);
  }
}
