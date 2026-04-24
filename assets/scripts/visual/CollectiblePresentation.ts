import { _decorator, AudioClip, Component, SpriteFrame, Texture2D } from 'cc';
import { playTransientClipAtNode } from '../audio/TransientAudio';
import {
  applySpriteFrameToPlaceholderVisual,
  destroyGeneratedSpriteFrames,
  PlaceholderSpriteFitMode,
  PlaceholderSpriteVerticalAnchor,
  resolveTextureBackedSpriteFrame,
  setPlaceholderLabelVisible,
} from './SpriteVisualSkin';

const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('CollectiblePresentation')
@executeInEditMode
export class CollectiblePresentation extends Component {
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
    applySpriteFrameToPlaceholderVisual(this.node, effectiveFrame, {
      fitMode: PlaceholderSpriteFitMode.Cover,
      verticalAnchor: PlaceholderSpriteVerticalAnchor.Bottom,
      scaleMultiplier: 1.06,
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
}
