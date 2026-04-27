import { _decorator, AudioClip, Component, Enum, Node, SpriteFrame, Texture2D } from 'cc';
import { playTransientClipAtNode } from '../audio/TransientAudio';
import {
  applySpriteFrameToPlaceholderVisual,
  destroyGeneratedSpriteFrames,
  PlaceholderSpriteFitMode,
  PlaceholderSpriteMaskShape,
  PlaceholderSpriteVerticalAnchor,
  resolveTextureBackedSpriteFrame,
  setPlaceholderLabelVisible,
} from './SpriteVisualSkin';

const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('CollectiblePresentation')
@executeInEditMode
export class CollectiblePresentation extends Component {
  @property(Node)
  visualRoot: Node | null = null;

  @property(SpriteFrame)
  visualSpriteFrame: SpriteFrame | null = null;

  @property(Texture2D)
  visualTexture: Texture2D | null = null;

  @property(AudioClip)
  pickupClip: AudioClip | null = null;

  @property
  pickupClipVolume = 1;

  @property
  hideLabelWhenSkinned = true;

  @property({ type: Enum(PlaceholderSpriteFitMode) })
  fitMode = PlaceholderSpriteFitMode.Cover;

  @property({ type: Enum(PlaceholderSpriteVerticalAnchor) })
  verticalAnchor = PlaceholderSpriteVerticalAnchor.Bottom;

  @property
  scaleMultiplier = 1.06;

  @property({ type: Enum(PlaceholderSpriteMaskShape) })
  maskShape = PlaceholderSpriteMaskShape.None;

  @property
  maskEllipseSegments = 48;

  @property
  maskCornerRadius = 0;

  @property
  useObjectLayout = false;

  private readonly generatedFrames = new Map<string, SpriteFrame>();

  protected onLoad(): void {
    this.applyPresentation();
  }

  protected onValidate(): void {
    this.applyPresentation();
  }

  protected onDestroy(): void {
    destroyGeneratedSpriteFrames(this.generatedFrames);
  }

  public applyPresentation(): void {
    const effectiveFrame = this.visualSpriteFrame
      ?? resolveTextureBackedSpriteFrame(this.generatedFrames, 'collectible', this.visualTexture);
    const targetNode = this.resolvePresentationTarget();
    const useObjectLayout = this.shouldUseObjectLayout();
    applySpriteFrameToPlaceholderVisual(targetNode, effectiveFrame, {
      fitMode: useObjectLayout ? PlaceholderSpriteFitMode.Contain : this.fitMode,
      verticalAnchor: useObjectLayout ? PlaceholderSpriteVerticalAnchor.Bottom : this.verticalAnchor,
      scaleMultiplier: useObjectLayout ? Math.min(this.scaleMultiplier, 0.96) : this.scaleMultiplier,
      maskShape: useObjectLayout
        ? (this.maskShape === PlaceholderSpriteMaskShape.None
          ? PlaceholderSpriteMaskShape.RoundedRect
          : this.maskShape)
        : this.maskShape,
      maskEllipseSegments: this.maskEllipseSegments,
      maskCornerRadius: useObjectLayout
        ? (this.maskCornerRadius > 0 ? this.maskCornerRadius : 12)
        : this.maskCornerRadius,
      preferGenericVisualChild: useObjectLayout,
    });
    this.applyPlaceholderLabelVisibility(effectiveFrame);
  }

  public playPickupFeedback(): void {
    if (!this.pickupClip) {
      return;
    }

    playTransientClipAtNode(this.node, this.pickupClip, this.pickupClipVolume, 'PickupAudio');
  }

  private applyPlaceholderLabelVisibility(effectiveFrame: SpriteFrame | null): void {
    const shouldHide = this.hideLabelWhenSkinned && !!effectiveFrame;
    setPlaceholderLabelVisible(this.node, !shouldHide);
  }

  private resolvePresentationTarget(): Node | null {
    if (this.visualRoot?.isValid) {
      return this.visualRoot;
    }

    return this.node;
  }

  private shouldUseObjectLayout(): boolean {
    const nodeName = this.node?.name?.toLowerCase() ?? '';
    return this.useObjectLayout || nodeName.includes('echo');
  }
}
