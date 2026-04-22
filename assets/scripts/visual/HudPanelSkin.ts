import { _decorator, Component, SpriteFrame, Texture2D } from 'cc';
import { applySpriteFrameToPlaceholderVisual, setPlaceholderLabelVisible, resolveTextureBackedSpriteFrame, destroyGeneratedSpriteFrames } from './SpriteVisualSkin';

const { ccclass, property, executeInEditMode } = _decorator;

/**
 * HudPanelSkin — drives the sprite display of a HUD panel node that currently
 * only has RectVisual + a Label. Drops a child `SpriteSkin` node (via the
 * shared applySpriteFrameToPlaceholderVisual helper) so the RectVisual backdrop
 * can turn off and an AI-generated panel PNG takes over rendering.
 *
 * Accepts EITHER a bound SpriteFrame, OR a bound Texture2D (which is wrapped
 * into a SpriteFrame at runtime — same pattern as SceneDressingSkin). This lets
 * AI PNGs that were imported only as textures still drive HUD visuals without
 * a project-wide re-import pass.
 *
 * Attach to HudTopBar / HudObjectiveCard / HudControlsCard in any scene that
 * wants the AI-generated UI skins.
 */
@ccclass('HudPanelSkin')
@executeInEditMode
export class HudPanelSkin extends Component {
  @property(SpriteFrame)
  visualSpriteFrame: SpriteFrame | null = null;

  @property(Texture2D)
  visualTexture: Texture2D | null = null;

  @property
  hideLabelWhenSkinned = true;

  private generatedFrames: Map<string, SpriteFrame> = new Map();

  protected onLoad(): void {
    this.applyVisual();
  }

  protected onEnable(): void {
    this.applyVisual();
  }

  protected onValidate(): void {
    this.applyVisual();
  }

  protected onDestroy(): void {
    destroyGeneratedSpriteFrames(this.generatedFrames);
  }

  private applyVisual(): void {
    const effective = this.visualSpriteFrame
      ?? resolveTextureBackedSpriteFrame(this.generatedFrames, 'hudpanel', this.visualTexture);
    applySpriteFrameToPlaceholderVisual(this.node, effective);
    setPlaceholderLabelVisible(this.node, !this.hideLabelWhenSkinned || !effective);
  }
}
