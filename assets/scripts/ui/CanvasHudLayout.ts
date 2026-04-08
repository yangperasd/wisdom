import { _decorator, Component, Node, UITransform, Vec3, sys, view } from 'cc';

const { ccclass, property } = _decorator;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

@ccclass('CanvasHudLayout')
export class CanvasHudLayout extends Component {
  @property(Node)
  hudTopBar: Node | null = null;

  @property(Node)
  hudObjectiveCard: Node | null = null;

  @property(Node)
  hudControlsCard: Node | null = null;

  @property(Node)
  hudSceneTitle: Node | null = null;

  @property(Node)
  hudObjectiveLabel: Node | null = null;

  @property(Node)
  hudHealthLabel: Node | null = null;

  @property(Node)
  hudEchoLabel: Node | null = null;

  @property(Node)
  hudCheckpointLabel: Node | null = null;

  @property(Node)
  hudControlsLabel: Node | null = null;

  @property(Node)
  joystick: Node | null = null;

  @property(Node)
  attackButton: Node | null = null;

  @property(Node)
  summonButton: Node | null = null;

  @property(Node)
  resetButton: Node | null = null;

  @property(Node)
  echoBoxButton: Node | null = null;

  @property(Node)
  echoFlowerButton: Node | null = null;

  @property(Node)
  echoBombButton: Node | null = null;

  @property(Node)
  pauseButton: Node | null = null;

  protected onEnable(): void {
    this.applyLayout();
    view.on('canvas-resize', this.applyLayout, this);
    view.on('design-resolution-changed', this.applyLayout, this);
  }

  protected onDisable(): void {
    view.off('canvas-resize', this.applyLayout, this);
    view.off('design-resolution-changed', this.applyLayout, this);
  }

  protected start(): void {
    this.applyLayout();
  }

  private applyLayout(): void {
    const visibleSize = view.getVisibleSize();
    const safeArea = sys.getSafeAreaRect(true);
    const halfWidth = visibleSize.width / 2;
    const halfHeight = visibleSize.height / 2;
    const safeLeft = safeArea.x - halfWidth;
    const safeRight = safeArea.x + safeArea.width - halfWidth;
    const safeBottom = safeArea.y - halfHeight;
    const safeTop = safeArea.y + safeArea.height - halfHeight;
    const compact = safeArea.width <= 1180 || safeArea.height <= 690;
    const tight = safeArea.width <= 1060 || safeArea.height <= 620;
    const controlScale = tight ? 0.88 : compact ? 0.94 : 1;
    const joystickInsetX = tight ? 122 : compact ? 128 : 134;
    const joystickInsetY = tight ? 106 : compact ? 114 : 122;
    const attackInsetX = tight ? 108 : compact ? 112 : 118;
    const summonOffsetX = tight ? 132 : compact ? 138 : 144;
    const resetOffsetX = tight ? 12 : 16;
    const echoBaseOffsetX = tight ? 308 : compact ? 320 : 332;
    const echoStepX = tight ? 96 : 102;
    const attackBaseY = safeBottom + (tight ? 100 : compact ? 108 : 116);
    const echoRowY = attackBaseY + (tight ? 76 : compact ? 82 : 88);
    const pauseInsetX = tight ? 70 : 76;
    const pauseInsetY = tight ? 34 : 38;
    const hudWidth = clamp(safeArea.width - (tight ? 44 : 56), 760, 1236);
    const objectiveWidth = clamp(safeArea.width - (tight ? 64 : 88), 700, 1190);
    const controlsWidth = clamp(safeArea.width - 420, 420, 900);
    const topBarY = safeTop - 42;
    const objectiveY = safeTop - 100;
    const controlsY = safeBottom + 30;
    const controlsVisible = !compact;

    this.resizeNode(this.hudTopBar, hudWidth, 88);
    this.resizeNode(this.hudObjectiveCard, objectiveWidth, 52);
    this.resizeNode(this.hudControlsCard, controlsWidth, 54);

    this.setPosition(this.hudTopBar, 0, topBarY);
    this.setPosition(this.hudObjectiveCard, 0, objectiveY);
    this.setPosition(this.hudControlsCard, 0, controlsY);

    this.setPosition(this.hudSceneTitle, -(hudWidth / 2) + 162, topBarY);
    this.setPosition(this.hudHealthLabel, compact ? 30 : 40, topBarY);
    this.setPosition(this.hudEchoLabel, compact ? 206 : 232, topBarY);
    this.setPosition(this.hudCheckpointLabel, (hudWidth / 2) - (compact ? 126 : 112), topBarY);
    this.setPosition(this.hudObjectiveLabel, 0, objectiveY);
    this.setPosition(this.hudControlsLabel, 0, controlsY);

    if (this.hudControlsCard) {
      this.hudControlsCard.active = controlsVisible;
    }

    if (this.hudControlsLabel) {
      this.hudControlsLabel.active = controlsVisible;
    }

    this.setPosition(this.joystick, safeLeft + joystickInsetX, safeBottom + joystickInsetY);
    this.setPosition(this.attackButton, safeRight - attackInsetX, attackBaseY);
    this.setPosition(this.summonButton, safeRight - attackInsetX - summonOffsetX, attackBaseY - (tight ? 44 : 48));
    this.setPosition(this.resetButton, safeRight - attackInsetX + resetOffsetX, safeBottom + (tight ? 46 : 54));
    this.setPosition(this.echoBoxButton, safeRight - echoBaseOffsetX, echoRowY);
    this.setPosition(this.echoFlowerButton, safeRight - echoBaseOffsetX + echoStepX, echoRowY);
    this.setPosition(this.echoBombButton, safeRight - echoBaseOffsetX + echoStepX * 2, echoRowY);
    this.setPosition(this.pauseButton, safeRight - pauseInsetX, safeTop - pauseInsetY);

    this.setScale(this.joystick, controlScale);
    this.setScale(this.attackButton, controlScale);
    this.setScale(this.summonButton, controlScale);
    this.setScale(this.resetButton, controlScale);
    this.setScale(this.echoBoxButton, controlScale);
    this.setScale(this.echoFlowerButton, controlScale);
    this.setScale(this.echoBombButton, controlScale);
    this.setScale(this.pauseButton, controlScale);
  }

  private resizeNode(node: Node | null, width: number, height: number): void {
    if (!node) {
      return;
    }

    const transform = node.getComponent(UITransform);
    if (!transform) {
      return;
    }

    transform.setContentSize(width, height);
  }

  private setPosition(node: Node | null, x: number, y: number): void {
    if (!node) {
      return;
    }

    node.setPosition(new Vec3(x, y, 0));
  }

  private setScale(node: Node | null, scale: number): void {
    if (!node) {
      return;
    }

    node.setScale(scale, scale, 1);
  }
}
