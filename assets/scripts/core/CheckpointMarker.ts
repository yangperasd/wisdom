import { _decorator, Collider2D, Component, Contact2DType, director, IPhysics2DContact, SpriteFrame, Texture2D } from 'cc';
import { GameManager } from './GameManager';
import {
  applySpriteFrameToPlaceholderVisual,
  destroyGeneratedSpriteFrames,
  PlaceholderSpriteFitMode,
  PlaceholderSpriteVerticalAnchor,
  resolveTextureBackedSpriteFrame,
  setPlaceholderLabelVisible,
} from '../visual/SpriteVisualSkin';

const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('CheckpointMarker')
@executeInEditMode
export class CheckpointMarker extends Component {
  @property
  markerId = 'checkpoint-01';

  @property
  playerNameIncludes = 'Player';

  @property(SpriteFrame)
  visualSpriteFrame: SpriteFrame | null = null;

  @property(Texture2D)
  visualTexture: Texture2D | null = null;

  @property
  hideLabelWhenSkinned = true;

  private collider: Collider2D | null = null;
  private readonly generatedFrames = new Map<string, SpriteFrame>();

  protected onLoad(): void {
    this.applyVisual();
    this.collider = this.getComponent(Collider2D);
    this.collider?.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
  }

  protected onEnable(): void {
    this.applyVisual();
  }

  protected onValidate(): void {
    this.applyVisual();
  }

  protected onDestroy(): void {
    this.collider?.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
    destroyGeneratedSpriteFrames(this.generatedFrames);
  }

  private onBeginContact(_self: Collider2D, other: Collider2D, _contact?: IPhysics2DContact | null): void {
    if (!other.node.name.includes(this.playerNameIncludes)) {
      return;
    }

    GameManager.instance?.setCheckpoint(
      director.getScene()?.name ?? 'UnknownScene',
      this.markerId,
      this.node.worldPosition,
    );
  }

  private applyVisual(): void {
    const effectiveFrame = this.visualSpriteFrame
      ?? resolveTextureBackedSpriteFrame(this.generatedFrames, 'checkpoint', this.visualTexture);
    applySpriteFrameToPlaceholderVisual(this.node, effectiveFrame, {
      fitMode: PlaceholderSpriteFitMode.Contain,
      verticalAnchor: PlaceholderSpriteVerticalAnchor.Bottom,
      scaleMultiplier: 1,
    });
    setPlaceholderLabelVisible(this.node, !this.hideLabelWhenSkinned || !effectiveFrame);
  }
}
