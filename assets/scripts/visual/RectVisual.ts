import { _decorator, Color, Component, Graphics, Node, UITransform } from 'cc';

const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('RectVisual')
@executeInEditMode
export class RectVisual extends Component {
  @property(Color)
  fillColor: Color = new Color(45, 62, 74, 255);

  @property(Color)
  strokeColor: Color = new Color(255, 255, 255, 60);

  @property
  strokeWidth = 2;

  @property
  cornerRadius = 10;

  @property
  drawFill = true;

  @property
  drawStroke = true;

  private graphics: Graphics | null = null;
  private lastWidth = -1;
  private lastHeight = -1;
  private lastFill = '';
  private lastStroke = '';
  private lastStrokeWidth = -1;
  private lastCornerRadius = -1;
  private dirty = true;

  protected onLoad(): void {
    this.ensureGraphics();
    this.redrawIfNeeded();
  }

  protected onEnable(): void {
    this.ensureGraphics();
    this.dirty = true;
    this.redrawIfNeeded();
    this.node.on(Node.EventType.SIZE_CHANGED, this.onSizeChanged, this);
  }

  protected onDisable(): void {
    this.node.off(Node.EventType.SIZE_CHANGED, this.onSizeChanged, this);
  }

  protected onValidate(): void {
    this.dirty = true;
  }

  public requestRedraw(): void {
    this.dirty = true;
    this.redrawIfNeeded();
  }

  private ensureGraphics(): void {
    this.graphics = this.getComponent(Graphics) ?? this.addComponent(Graphics);
  }

  private redrawIfNeeded(): void {
    const transform = this.getComponent(UITransform);
    if (!transform) {
      return;
    }

    const width = transform.contentSize.width;
    const height = transform.contentSize.height;
    const fill = this.colorKey(this.fillColor);
    const stroke = this.colorKey(this.strokeColor);

    if (
      !this.dirty &&
      width === this.lastWidth &&
      height === this.lastHeight &&
      fill === this.lastFill &&
      stroke === this.lastStroke &&
      this.strokeWidth === this.lastStrokeWidth &&
      this.cornerRadius === this.lastCornerRadius
    ) {
      return;
    }

    this.lastWidth = width;
    this.lastHeight = height;
    this.lastFill = fill;
    this.lastStroke = stroke;
    this.lastStrokeWidth = this.strokeWidth;
    this.lastCornerRadius = this.cornerRadius;
    this.dirty = false;

    this.redraw(width, height);
  }

  private redraw(width: number, height: number): void {
    this.ensureGraphics();
    if (!this.graphics) {
      return;
    }

    this.graphics.clear();

    const x = -width * 0.5;
    const y = -height * 0.5;
    const radius = Math.max(0, Math.min(this.cornerRadius, width * 0.5, height * 0.5));

    if (radius > 0) {
      this.graphics.roundRect(x, y, width, height, radius);
    } else {
      this.graphics.rect(x, y, width, height);
    }

    if (this.drawFill) {
      this.graphics.fillColor = this.fillColor;
      this.graphics.fill();
    }

    if (this.drawStroke && this.strokeWidth > 0) {
      if (radius > 0) {
        this.graphics.roundRect(x, y, width, height, radius);
      } else {
        this.graphics.rect(x, y, width, height);
      }

      this.graphics.lineWidth = this.strokeWidth;
      this.graphics.strokeColor = this.strokeColor;
      this.graphics.stroke();
    }
  }

  private colorKey(color: Readonly<Color>): string {
    return `${color.r}-${color.g}-${color.b}-${color.a}`;
  }

  private onSizeChanged(): void {
    this.requestRedraw();
  }
}
