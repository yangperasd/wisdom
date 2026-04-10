import { _decorator, AudioClip, Component, SpriteFrame } from 'cc';
import { playTransientClipAtNode } from '../audio/TransientAudio';
import { applySpriteFrameToPlaceholderVisual, setPlaceholderLabelVisible } from './SpriteVisualSkin';

const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('CollectiblePresentation')
@executeInEditMode
export class CollectiblePresentation extends Component {
  @property(SpriteFrame)
  visualSpriteFrame: SpriteFrame | null = null;

  @property(AudioClip)
  pickupClip: AudioClip | null = null;

  @property
  pickupClipVolume = 1;

  @property
  hideLabelWhenSkinned = true;

  protected onLoad(): void {
    this.applyPresentation();
  }

  protected onValidate(): void {
    this.applyPresentation();
  }

  public applyPresentation(): void {
    applySpriteFrameToPlaceholderVisual(this.node, this.visualSpriteFrame);
    this.applyPlaceholderLabelVisibility();
  }

  public playPickupFeedback(): void {
    if (!this.pickupClip) {
      return;
    }

    playTransientClipAtNode(this.node, this.pickupClip, this.pickupClipVolume, 'PickupAudio');
  }

  private applyPlaceholderLabelVisibility(): void {
    const shouldHide = this.hideLabelWhenSkinned && !!this.visualSpriteFrame;
    setPlaceholderLabelVisible(this.node, !shouldHide);
  }
}
