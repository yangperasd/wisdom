import { _decorator, Component, Node, Sprite, SpriteFrame, Texture2D } from 'cc';
import { applySpriteFrameToPlaceholderVisual, setPlaceholderLabelVisible } from './SpriteVisualSkin';

const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('SceneDressingSkin')
@executeInEditMode
export class SceneDressingSkin extends Component {
  @property(Node)
  visualRoot: Node | null = null;

  @property(SpriteFrame)
  spriteFrame: SpriteFrame | null = null;

  @property(Texture2D)
  texture: Texture2D | null = null;

  @property
  hideLabelWhenSkinned = false;

  @property
  tiled = true;

  private generatedSpriteFrame: SpriteFrame | null = null;

  protected onLoad(): void {
    this.applySkin();
  }

  protected onEnable(): void {
    this.applySkin();
  }

  protected onValidate(): void {
    this.applySkin();
  }

  private applySkin(): void {
    const effectiveSpriteFrame = this.resolveSpriteFrame();
    if (!effectiveSpriteFrame) {
      return;
    }

    applySpriteFrameToPlaceholderVisual(
      this.visualRoot ?? this.node,
      effectiveSpriteFrame,
      { spriteType: this.tiled ? Sprite.Type.TILED : Sprite.Type.SIMPLE },
    );

    if (this.hideLabelWhenSkinned) {
      setPlaceholderLabelVisible(this.node, false);
    }
  }

  protected onDestroy(): void {
    this.generatedSpriteFrame?.destroy();
    this.generatedSpriteFrame = null;
  }

  private resolveSpriteFrame(): SpriteFrame | null {
    if (this.spriteFrame) {
      return this.spriteFrame;
    }

    if (!this.texture) {
      return null;
    }

    if (!this.generatedSpriteFrame?.isValid) {
      this.generatedSpriteFrame = new SpriteFrame();
    }

    this.generatedSpriteFrame.texture = this.texture;
    return this.generatedSpriteFrame;
  }
}
