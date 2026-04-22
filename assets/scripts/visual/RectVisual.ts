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

  // Aesthetic upgrade (2026-04-15 晚, batch §1.3.5.5): instead of a flat
  // colored rect, draw a vertical gradient (lighter top -> darker bottom) +
  // a 2-px inner highlight near the top edge. Large rects additionally get
  // a diagonal hatch pattern overlay to break the "big flat block" feel.
  // All effects are pure Graphics API calls; no texture assets required.
  @property
  gradientStrength = 0.35;

  @property
  innerHighlight = true;

  // Diagonal hatch overlay for large placeholder zones (>= 200x160 default).
  // Draws sparse diagonal lines inside the rect at low alpha to give the
  // surface a texture-like structure without real sprites. Scales linearly
  // with hatchStrength; 0 disables, 1 = fully opaque hatch.
  @property
  hatchStrength = 0;

  @property
  hatchSpacing = 18;

  // --- 2026-04-16 visual polish layer ---

  // Inner shadow: darkens bottom and side edges inside the rect to create
  // depth/inset appearance. Strength 0-1; 0 disables.
  @property
  innerShadow = 0;

  // Outer glow: draws an expanded translucent ring behind the rect.
  // Good for interactive buttons and highlighted elements. Strength 0-1.
  @property
  outerGlow = 0;

  @property(Color)
  outerGlowColor: Color = new Color(255, 200, 100, 0);

  // Double border: draws a second thinner stroke inset from the main one,
  // creating a beveled frame look. 0 = off, 1 = full opacity.
  @property
  doubleBorder = 0;

  // Dot/stipple pattern for zone textures -- alternative to hatch lines.
  // Draws small circles in a grid. Strength 0-1.
  @property
  stippleStrength = 0;

  @property
  stippleSpacing = 24;

  // Bottom edge accent line: a 2px colored bar at the very bottom edge
  // to give buttons/cards a colored "underline" accent. Alpha 0 = off.
  @property(Color)
  bottomAccent: Color = new Color(0, 0, 0, 0);

  private graphics: Graphics | null = null;
  private lastWidth = -1;
  private lastHeight = -1;
  private lastFill = '';
  private lastStroke = '';
  private lastStrokeWidth = -1;
  private lastCornerRadius = -1;
  private lastGradient = -1;
  private lastHighlight = false;
  private lastHatch = -1;
  private lastHatchSpacing = -1;
  private lastInnerShadow = -1;
  private lastOuterGlow = -1;
  private lastOuterGlowColor = '';
  private lastDoubleBorder = -1;
  private lastStipple = -1;
  private lastStippleSpacing = -1;
  private lastBottomAccent = '';
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

    const glowKey = this.colorKey(this.outerGlowColor);
    const accentKey = this.colorKey(this.bottomAccent);

    if (
      !this.dirty &&
      width === this.lastWidth &&
      height === this.lastHeight &&
      fill === this.lastFill &&
      stroke === this.lastStroke &&
      this.strokeWidth === this.lastStrokeWidth &&
      this.cornerRadius === this.lastCornerRadius &&
      this.gradientStrength === this.lastGradient &&
      this.innerHighlight === this.lastHighlight &&
      this.hatchStrength === this.lastHatch &&
      this.hatchSpacing === this.lastHatchSpacing &&
      this.innerShadow === this.lastInnerShadow &&
      this.outerGlow === this.lastOuterGlow &&
      glowKey === this.lastOuterGlowColor &&
      this.doubleBorder === this.lastDoubleBorder &&
      this.stippleStrength === this.lastStipple &&
      this.stippleSpacing === this.lastStippleSpacing &&
      accentKey === this.lastBottomAccent
    ) {
      return;
    }

    this.lastWidth = width;
    this.lastHeight = height;
    this.lastFill = fill;
    this.lastStroke = stroke;
    this.lastStrokeWidth = this.strokeWidth;
    this.lastCornerRadius = this.cornerRadius;
    this.lastGradient = this.gradientStrength;
    this.lastHighlight = this.innerHighlight;
    this.lastHatch = this.hatchStrength;
    this.lastHatchSpacing = this.hatchSpacing;
    this.lastInnerShadow = this.innerShadow;
    this.lastOuterGlow = this.outerGlow;
    this.lastOuterGlowColor = glowKey;
    this.lastDoubleBorder = this.doubleBorder;
    this.lastStipple = this.stippleStrength;
    this.lastStippleSpacing = this.stippleSpacing;
    this.lastBottomAccent = accentKey;
    this.dirty = false;

    this.redraw(width, height);
  }

  private drawShape(x: number, y: number, width: number, height: number, radius: number): void {
    if (!this.graphics) return;
    if (radius > 0) {
      this.graphics.roundRect(x, y, width, height, radius);
    } else {
      this.graphics.rect(x, y, width, height);
    }
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

    // -1. Neumorphic dual shadow (CSS box-shadow simulation):
    //     Dark shadow shifted bottom-right + light shadow shifted top-left,
    //     both behind the main rect. This is what makes the rect "float"
    //     above the background instead of sitting flat. The technique is
    //     from neumorphism.io / CSS-Tricks neumorphism guide.
    //     Only draws when drawFill is on and the fill has reasonable alpha.
    if (this.drawFill && this.fillColor.a > 60) {
      const shadowOffset = Math.max(3, Math.round(Math.min(width, height) * 0.06));
      const shadowAlpha = Math.round(this.fillColor.a * 0.35);
      // Dark shadow (bottom-right): darker version of fill
      const dR = Math.max(0, this.fillColor.r - 50);
      const dG = Math.max(0, this.fillColor.g - 50);
      const dB = Math.max(0, this.fillColor.b - 50);
      this.drawShape(x + shadowOffset, y - shadowOffset, width, height, radius);
      this.graphics.fillColor = new Color(dR, dG, dB, shadowAlpha);
      this.graphics.fill();
      // Light highlight (top-left): lighter version
      const lR = Math.min(255, this.fillColor.r + 40);
      const lG = Math.min(255, this.fillColor.g + 40);
      const lB = Math.min(255, this.fillColor.b + 40);
      this.drawShape(x - shadowOffset * 0.5, y + shadowOffset * 0.5, width, height, radius);
      this.graphics.fillColor = new Color(lR, lG, lB, Math.round(shadowAlpha * 0.5));
      this.graphics.fill();
    }

    // 0. Outer glow — expanded translucent ring behind the main shape.
    //    Drawn first so it sits behind everything. Two concentric rings at
    //    decreasing alpha simulate a soft bloom.
    if (this.outerGlow > 0 && this.outerGlowColor.a > 0) {
      const gs = Math.max(0, Math.min(1, this.outerGlow));
      const gc = this.outerGlowColor;
      // Outer ring (10px expand). Alpha multipliers pumped high so glow is
      // visible even at mobile 350px viewport (previous 0.25/0.40 were invisible).
      const expand1 = 10;
      this.drawShape(x - expand1, y - expand1, width + expand1 * 2, height + expand1 * 2,
        Math.min(radius + expand1, (width + expand1 * 2) * 0.5, (height + expand1 * 2) * 0.5));
      this.graphics.fillColor = new Color(gc.r, gc.g, gc.b, Math.round(gc.a * gs * 0.65));
      this.graphics.fill();
      // Inner ring (5px expand, higher alpha)
      const expand2 = 5;
      this.drawShape(x - expand2, y - expand2, width + expand2 * 2, height + expand2 * 2,
        Math.min(radius + expand2, (width + expand2 * 2) * 0.5, (height + expand2 * 2) * 0.5));
      this.graphics.fillColor = new Color(gc.r, gc.g, gc.b, Math.round(gc.a * gs * 0.85));
      this.graphics.fill();
    }

    if (this.drawFill) {
      // 1. Base fill (flat color) — same as before, keeps backwards-compat.
      this.drawShape(x, y, width, height, radius);
      this.graphics.fillColor = this.fillColor;
      this.graphics.fill();

      // 2. Gradient overlay: 4 horizontal bands inside the rect, each
      //    nudging the color lighter (top) or darker (bottom) at low alpha.
      //    Low alpha means corner mismatch between band (square) and outer
      //    (rounded) is invisible — the corners blend naturally.
      if (this.gradientStrength > 0 && height > 4) {
        const s = Math.max(0, Math.min(1, this.gradientStrength));
        const lift = Math.round(45 * s);
        const drop = Math.round(50 * s);
        const baseA = this.fillColor.a;
        const topBandH = height * 0.30;
        const bottomBandH = height * 0.30;
        const topMidH = height * 0.20;
        const bottomMidH = height * 0.20;

        const lightR = Math.min(255, this.fillColor.r + lift);
        const lightG = Math.min(255, this.fillColor.g + lift);
        const lightB = Math.min(255, this.fillColor.b + lift);
        const darkR = Math.max(0, this.fillColor.r - drop);
        const darkG = Math.max(0, this.fillColor.g - drop);
        const darkB = Math.max(0, this.fillColor.b - drop);

        // Upper inset band (strong lighten, top) — alpha pumped for mobile visibility
        this.drawShape(x + 2, y + height - topBandH, width - 4, topBandH, Math.max(0, radius - 2));
        this.graphics.fillColor = new Color(lightR, lightG, lightB, Math.round(baseA * 0.50));
        this.graphics.fill();

        // Upper-mid band (mild lighten)
        this.drawShape(x + 2, y + height - topBandH - topMidH, width - 4, topMidH, 0);
        this.graphics.fillColor = new Color(lightR, lightG, lightB, Math.round(baseA * 0.25));
        this.graphics.fill();

        // Lower-mid band (mild darken)
        this.drawShape(x + 2, y + bottomBandH, width - 4, bottomMidH, 0);
        this.graphics.fillColor = new Color(darkR, darkG, darkB, Math.round(baseA * 0.22));
        this.graphics.fill();

        // Bottom inset band (strong darken)
        this.drawShape(x + 2, y, width - 4, bottomBandH, Math.max(0, radius - 2));
        this.graphics.fillColor = new Color(darkR, darkG, darkB, Math.round(baseA * 0.45));
        this.graphics.fill();
      }

      // 3. Inner top highlight — 2px lighter line just inside the top edge.
      //    Reads as "light from above" and makes the rect feel card-like.
      if (this.innerHighlight && height >= 16 && width >= 16) {
        const hlInset = Math.min(4, Math.max(2, Math.round(height * 0.05)));
        const hlHeight = 2;
        const hlR = Math.min(255, this.fillColor.r + 70);
        const hlG = Math.min(255, this.fillColor.g + 70);
        const hlB = Math.min(255, this.fillColor.b + 70);
        this.drawShape(
          x + hlInset + 2,
          y + height - hlInset - hlHeight,
          width - (hlInset + 2) * 2,
          hlHeight,
          Math.min(2, Math.max(0, radius - hlInset)),
        );
        this.graphics.fillColor = new Color(hlR, hlG, hlB, 160);
        this.graphics.fill();
      }

      // 4. Diagonal hatch overlay — only for large rects where uniform color
      //    reads as "big dead block". Sparse 1-px diagonals at low alpha:
      //    the hatch is almost imperceptible per-line but the *grain* it
      //    adds breaks the flatness.
      if (this.hatchStrength > 0 && width >= 120 && height >= 80) {
        const spacing = Math.max(6, Math.round(this.hatchSpacing));
        const strength = Math.max(0, Math.min(1, this.hatchStrength));
        const hAlpha = Math.round(40 * strength);
        const hR = Math.min(255, this.fillColor.r + 25);
        const hG = Math.min(255, this.fillColor.g + 25);
        const hB = Math.min(255, this.fillColor.b + 25);
        this.graphics.lineWidth = 1;
        this.graphics.strokeColor = new Color(hR, hG, hB, hAlpha);
        // Diagonal lines sweeping from top-left area to bottom-right;
        // cover from (x - h) to (x + w) so full rect is hatched.
        const start = x - height;
        const end = x + width;
        for (let i = start; i <= end; i += spacing) {
          this.graphics.moveTo(i, y);
          this.graphics.lineTo(i + height, y + height);
          this.graphics.stroke();
        }
      }

      // 5. Stipple/dot pattern — alternative to hatch for zone textures.
      //    Small filled circles in a grid pattern at low alpha.
      if (this.stippleStrength > 0 && width >= 80 && height >= 60) {
        const sSpacing = Math.max(8, Math.round(this.stippleSpacing));
        const sStr = Math.max(0, Math.min(1, this.stippleStrength));
        const sAlpha = Math.round(30 * sStr);
        const dotR = Math.min(255, this.fillColor.r + 30);
        const dotG = Math.min(255, this.fillColor.g + 30);
        const dotB = Math.min(255, this.fillColor.b + 30);
        this.graphics.fillColor = new Color(dotR, dotG, dotB, sAlpha);
        const dotRadius = 1.5;
        const inset = 4;
        for (let dy = y + inset; dy < y + height - inset; dy += sSpacing) {
          // Offset every other row for a more organic pattern
          const rowOffset = (Math.round((dy - y) / sSpacing) % 2 === 0) ? 0 : sSpacing * 0.5;
          for (let dx = x + inset + rowOffset; dx < x + width - inset; dx += sSpacing) {
            this.graphics.circle(dx, dy, dotRadius);
            this.graphics.fill();
          }
        }
      }

      // 6. Inner shadow — darkens bottom and side edges to create depth.
      //    Three overlapping inset rects: bottom, left edge, right edge.
      if (this.innerShadow > 0 && height >= 12 && width >= 12) {
        const is = Math.max(0, Math.min(1, this.innerShadow));
        const shadowAlpha = Math.round(60 * is);
        const shadowColor = new Color(0, 0, 0, shadowAlpha);
        const shadowSize = Math.max(2, Math.round(Math.min(height, width) * 0.06));
        // Bottom edge shadow
        this.drawShape(x + 2, y, width - 4, shadowSize, Math.max(0, radius - 2));
        this.graphics.fillColor = shadowColor;
        this.graphics.fill();
        // Left edge shadow (thinner)
        const sideW = Math.max(1, Math.round(shadowSize * 0.6));
        this.graphics.rect(x, y + shadowSize, sideW, height - shadowSize * 2);
        this.graphics.fillColor = new Color(0, 0, 0, Math.round(shadowAlpha * 0.5));
        this.graphics.fill();
        // Right edge shadow (thinner)
        this.graphics.rect(x + width - sideW, y + shadowSize, sideW, height - shadowSize * 2);
        this.graphics.fillColor = new Color(0, 0, 0, Math.round(shadowAlpha * 0.5));
        this.graphics.fill();
      }

      // 7. Bottom accent line — colored bar at the very bottom edge.
      if (this.bottomAccent.a > 0 && width >= 8) {
        const accentH = 3;
        const accentInset = Math.max(2, Math.round(radius * 0.5));
        this.drawShape(x + accentInset, y, width - accentInset * 2, accentH,
          Math.min(2, Math.max(0, radius - accentInset)));
        this.graphics.fillColor = this.bottomAccent;
        this.graphics.fill();
      }
    }

    // 8. Primary stroke
    if (this.drawStroke && this.strokeWidth > 0) {
      this.drawShape(x, y, width, height, radius);
      this.graphics.lineWidth = this.strokeWidth;
      this.graphics.strokeColor = this.strokeColor;
      this.graphics.stroke();
    }

    // 9. Double border — second thinner stroke inset from the main one.
    if (this.doubleBorder > 0 && this.drawStroke && this.strokeWidth > 0 && width > 12 && height > 12) {
      const db = Math.max(0, Math.min(1, this.doubleBorder));
      const inset = this.strokeWidth + 2;
      const innerR = Math.max(0, radius - inset);
      this.drawShape(x + inset, y + inset, width - inset * 2, height - inset * 2, innerR);
      this.graphics.lineWidth = 1;
      const dbAlpha = Math.round(this.strokeColor.a * db * 0.5);
      const dbR = Math.min(255, this.strokeColor.r + 30);
      const dbG = Math.min(255, this.strokeColor.g + 30);
      const dbB = Math.min(255, this.strokeColor.b + 30);
      this.graphics.strokeColor = new Color(dbR, dbG, dbB, dbAlpha);
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
