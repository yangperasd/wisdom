import { _decorator, Color, Component, Label, Node, UITransform, Vec3, sys, view } from 'cc';
import { HEALTH_EVENT_CHANGED, HealthComponent } from '../combat/HealthComponent';
import { GAME_EVENT_CHECKPOINT_CHANGED, EchoId } from '../core/GameTypes';
import { GameManager } from '../core/GameManager';
import { ECHO_EVENT_SELECTED, ECHO_EVENT_UNLOCKED, EchoManager } from '../echo/EchoManager';
import { RectVisual } from '../visual/RectVisual';

const { ccclass, property } = _decorator;

const ECHO_DISPLAY_NAME: Record<EchoId, string> = {
  [EchoId.Box]: 'Box',
  [EchoId.SpringFlower]: 'Flower',
  [EchoId.BombBug]: 'Bomb',
};

const ECHO_BUTTON_LABEL: Record<EchoId, string> = {
  [EchoId.Box]: 'BOX',
  [EchoId.SpringFlower]: 'FLOWER',
  [EchoId.BombBug]: 'BOMB',
};

const CHECKPOINT_LABEL: Record<string, string> = {
  'camp-entry': 'Camp',
  'camp-return': 'Camp West Gate',
  'field-west-entry': 'West Path',
  'field-west-return': 'West Ruins Gate',
  'field-ruins-entry': 'Ruins',
  'dungeon-hub-entry': 'Trial Hub',
  'dungeon-room-a-entry': 'Room A',
  'dungeon-room-b-entry': 'Room B',
  'dungeon-room-c-entry': 'Room C',
  'boss-arena-entry': 'Boss Gate',
};

@ccclass('GameHud')
export class GameHud extends Component {
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

  @property(Label)
  sceneTitleLabel: Label | null = null;

  @property(Label)
  objectiveLabel: Label | null = null;

  @property(Label)
  healthLabel: Label | null = null;

  @property(Label)
  echoLabel: Label | null = null;

  @property(Label)
  checkpointLabel: Label | null = null;

  @property(Label)
  controlsLabel: Label | null = null;

  @property(HealthComponent)
  playerHealth: HealthComponent | null = null;

  @property(EchoManager)
  echoManager: EchoManager | null = null;

  @property(Node)
  echoBoxButton: Node | null = null;

  @property(Node)
  echoFlowerButton: Node | null = null;

  @property(Node)
  echoBombButton: Node | null = null;

  @property(Node)
  joystick: Node | null = null;

  @property(Node)
  attackButton: Node | null = null;

  @property(Node)
  summonButton: Node | null = null;

  @property(Node)
  resetButton: Node | null = null;

  @property(Node)
  pauseButton: Node | null = null;

  @property
  sceneTitle = 'Scene';

  @property
  objectiveText = 'Keep moving.';

  @property
  desktopHintText = 'Keyboard: WASD move, J attack, K summon, Q/E cycle';

  @property
  mobileHintText = 'Touch: left stick move, right buttons act';

  private readonly selectedFill = new Color(248, 228, 150, 255);
  private readonly selectedStroke = new Color(255, 249, 219, 220);
  private readonly selectedText = new Color(28, 24, 18, 255);
  private readonly unlockedFill = new Color(84, 116, 132, 245);
  private readonly unlockedStroke = new Color(207, 232, 241, 96);
  private readonly unlockedText = new Color(231, 244, 255, 255);
  private readonly lockedFill = new Color(42, 49, 58, 170);
  private readonly lockedStroke = new Color(137, 151, 162, 48);
  private readonly lockedText = new Color(156, 166, 176, 255);

  private readonly selectedScale = 1.08;
  private readonly unlockedScale = 1;
  private readonly lockedScale = 0.94;
  private textDirty = true;
  private echoButtonsDirty = true;

  protected onEnable(): void {
    this.applyResponsiveLayout();
    this.bindHudEvents();
    this.markAllDirty();
    this.refreshText();
    this.refreshEchoButtons();
    view.on('canvas-resize', this.applyResponsiveLayout, this);
    view.on('design-resolution-changed', this.applyResponsiveLayout, this);
  }

  protected onDisable(): void {
    this.unbindHudEvents();
    view.off('canvas-resize', this.applyResponsiveLayout, this);
    view.off('design-resolution-changed', this.applyResponsiveLayout, this);
  }

  protected start(): void {
    this.applyResponsiveLayout();
    this.refreshText();
    this.refreshEchoButtons();
  }

  private applyResponsiveLayout(): void {
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
    const checkpointVisible = !compact;
    const resetVisible = !compact;

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

    if (this.hudCheckpointLabel) {
      this.hudCheckpointLabel.active = checkpointVisible;
    }

    if (this.resetButton) {
      this.resetButton.active = resetVisible;
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

  private refreshText(): void {
    if (!this.textDirty) {
      return;
    }

    this.textDirty = false;

    if (this.sceneTitleLabel) {
      this.sceneTitleLabel.string = this.sceneTitle;
    }

    if (this.objectiveLabel) {
      this.objectiveLabel.string = `Goal  ${this.objectiveText}`;
    }

    if (this.controlsLabel) {
      this.controlsLabel.string = `${this.mobileHintText}  |  ${this.desktopHintText}`;
    }

    if (this.healthLabel) {
      const currentHealth = this.playerHealth?.getCurrentHealth() ?? 0;
      const maxHealth = this.playerHealth?.maxHealth ?? 0;
      this.healthLabel.string = `HP ${currentHealth}/${maxHealth}`;
    }

    if (this.echoLabel) {
      const currentEcho = this.echoManager?.getCurrentEchoId() ?? EchoId.Box;
      const unlockedCount = this.echoManager?.getUnlockedEchoes().length ?? 1;
      this.echoLabel.string = `Echo ${ECHO_DISPLAY_NAME[currentEcho]}  ${unlockedCount}/3`;
    }

    if (this.checkpointLabel) {
      const checkpoint = GameManager.instance?.getCheckpoint();
      const checkpointName = checkpoint
        ? (CHECKPOINT_LABEL[checkpoint.markerId] ?? checkpoint.markerId)
        : 'None';
      this.checkpointLabel.string = `Check ${checkpointName}`;
    }
  }

  private refreshEchoButtons(): void {
    if (!this.echoButtonsDirty) {
      return;
    }

    this.echoButtonsDirty = false;
    const echoManager = this.echoManager;
    const selectedEcho = echoManager?.getCurrentEchoId() ?? EchoId.Box;
    const unlockedEchoes = new Set(echoManager?.getUnlockedEchoes() ?? [EchoId.Box]);

    this.applyEchoButtonState(this.echoBoxButton, selectedEcho === EchoId.Box, unlockedEchoes.has(EchoId.Box));
    this.applyEchoButtonState(
      this.echoFlowerButton,
      selectedEcho === EchoId.SpringFlower,
      unlockedEchoes.has(EchoId.SpringFlower),
    );
    this.applyEchoButtonState(
      this.echoBombButton,
      selectedEcho === EchoId.BombBug,
      unlockedEchoes.has(EchoId.BombBug),
    );
  }

  private applyEchoButtonState(button: Node | null, selected: boolean, unlocked: boolean): void {
    const visual = this.resolveButtonVisual(button);
    const label = this.resolveButtonLabel(button);
    const buttonName = this.resolveEchoButtonName(button);
    if (!visual || !label || !buttonName || !button) {
      return;
    }

    if (!unlocked) {
      visual.fillColor = this.lockedFill;
      visual.strokeColor = this.lockedStroke;
      label.string = 'LOCK';
      label.color = this.lockedText;
      button.setScale(this.lockedScale, this.lockedScale, 1);
      visual.requestRedraw();
      return;
    }

    if (selected) {
      visual.fillColor = this.selectedFill;
      visual.strokeColor = this.selectedStroke;
      label.string = `${buttonName} *`;
      label.color = this.selectedText;
      button.setScale(this.selectedScale, this.selectedScale, 1);
      visual.requestRedraw();
      return;
    }

    visual.fillColor = this.unlockedFill;
    visual.strokeColor = this.unlockedStroke;
    label.string = buttonName;
    label.color = this.unlockedText;
    button.setScale(this.unlockedScale, this.unlockedScale, 1);
    visual.requestRedraw();
  }

  private resolveButtonVisual(button: Node | null): RectVisual | null {
    if (!button) {
      return null;
    }

    const visualNode = button.getChildByName(`${button.name}-Visual`) ?? button.getChildByName('Visual');
    return visualNode?.getComponent(RectVisual) ?? null;
  }

  private resolveButtonLabel(button: Node | null): Label | null {
    if (!button) {
      return null;
    }

    const labelNode = button.getChildByName(`${button.name}-Label`) ?? button.getChildByName('Label');
    return labelNode?.getComponent(Label) ?? null;
  }

  private resolveEchoButtonName(button: Node | null): string | null {
    switch (button?.name) {
      case 'TouchEchoBox':
        return ECHO_BUTTON_LABEL[EchoId.Box];
      case 'TouchEchoFlower':
        return ECHO_BUTTON_LABEL[EchoId.SpringFlower];
      case 'TouchEchoBomb':
        return ECHO_BUTTON_LABEL[EchoId.BombBug];
      default:
        return null;
    }
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

  private bindHudEvents(): void {
    this.playerHealth?.events.on(HEALTH_EVENT_CHANGED, this.onHealthChanged, this);
    this.echoManager?.events.on(ECHO_EVENT_SELECTED, this.onEchoChanged, this);
    this.echoManager?.events.on(ECHO_EVENT_UNLOCKED, this.onEchoChanged, this);
    GameManager.instance?.events.on(GAME_EVENT_CHECKPOINT_CHANGED, this.onCheckpointChanged, this);
  }

  private unbindHudEvents(): void {
    this.playerHealth?.events.off(HEALTH_EVENT_CHANGED, this.onHealthChanged, this);
    this.echoManager?.events.off(ECHO_EVENT_SELECTED, this.onEchoChanged, this);
    this.echoManager?.events.off(ECHO_EVENT_UNLOCKED, this.onEchoChanged, this);
    GameManager.instance?.events.off(GAME_EVENT_CHECKPOINT_CHANGED, this.onCheckpointChanged, this);
  }

  private onHealthChanged(): void {
    this.markTextDirty();
  }

  private onEchoChanged(): void {
    this.markTextDirty();
    this.markEchoButtonsDirty();
  }

  private onCheckpointChanged(): void {
    this.markTextDirty();
  }

  private markTextDirty(): void {
    this.textDirty = true;
    this.refreshText();
  }

  private markEchoButtonsDirty(): void {
    this.echoButtonsDirty = true;
    this.refreshEchoButtons();
  }

  private markAllDirty(): void {
    this.textDirty = true;
    this.echoButtonsDirty = true;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
