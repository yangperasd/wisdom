import { _decorator, Color, Component, Label, Node, Sprite, SpriteFrame, UITransform, Vec3, director, sys, view } from 'cc';
import { HEALTH_EVENT_CHANGED, HealthComponent } from '../combat/HealthComponent';
import { GAME_EVENT_CHECKPOINT_CHANGED, EchoId } from '../core/GameTypes';
import { GameManager } from '../core/GameManager';
import { SCENE_EVENT_SWITCH_STATE_CHANGED, SceneLoader, SceneSwitchState } from '../core/SceneLoader';
import { ECHO_EVENT_SELECTED, ECHO_EVENT_UNLOCKED, EchoManager } from '../echo/EchoManager';
import { RectVisual } from '../visual/RectVisual';

const { ccclass, property } = _decorator;

const ECHO_DISPLAY_NAME: Record<EchoId, string> = {
  [EchoId.Box]: '箱子',
  [EchoId.SpringFlower]: '弹花',
  [EchoId.BombBug]: '炸虫',
};

const ECHO_BUTTON_LABEL: Record<EchoId, string> = {
  [EchoId.Box]: '箱子',
  [EchoId.SpringFlower]: '弹花',
  [EchoId.BombBug]: '炸虫',
};

const CHECKPOINT_LABEL: Record<string, string> = {
  'camp-entry': '营地',
  'camp-return': '西门',
  'field-west-entry': '林间小径',
  'field-west-return': '遗迹门',
  'field-ruins-entry': '遗迹',
  'dungeon-hub-entry': '试炼大厅',
  'dungeon-room-a-entry': '箱子房',
  'dungeon-room-b-entry': '弹花房',
  'dungeon-room-c-entry': '炸虫房',
  'boss-arena-entry': '首领门',
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

  @property(SpriteFrame)
  hudTopBarSpriteFrame: SpriteFrame | null = null;

  @property(SpriteFrame)
  hudObjectiveCardSpriteFrame: SpriteFrame | null = null;

  @property(SpriteFrame)
  hudControlsCardSpriteFrame: SpriteFrame | null = null;

  @property(SpriteFrame)
  attackIconSpriteFrame: SpriteFrame | null = null;

  @property(SpriteFrame)
  summonIconSpriteFrame: SpriteFrame | null = null;

  @property(SpriteFrame)
  respawnIconSpriteFrame: SpriteFrame | null = null;

  @property(SpriteFrame)
  pauseIconSpriteFrame: SpriteFrame | null = null;

  @property(SpriteFrame)
  echoBoxIconSpriteFrame: SpriteFrame | null = null;

  @property(SpriteFrame)
  echoFlowerIconSpriteFrame: SpriteFrame | null = null;

  @property(SpriteFrame)
  echoBombIconSpriteFrame: SpriteFrame | null = null;

  @property
  sceneTitle = '场景';

  @property
  objectiveText = '继续前进。';

  @property
  desktopHintText = 'WASD 移动  J 攻击  K 召唤  Q/E 切换';

  @property
  mobileHintText = '左侧摇杆移动，右侧按钮行动';

  // -- Palette v2 (2026-04-16 visual polish) --
  // Selected: warm gold with strong contrast
  private readonly selectedFill = new Color(232, 168, 56, 255);
  private readonly selectedStroke = new Color(255, 224, 140, 200);
  private readonly selectedText = new Color(24, 18, 8, 255);
  // Unlocked: clean blue with bright text
  private readonly unlockedFill = new Color(58, 112, 168, 245);
  private readonly unlockedStroke = new Color(140, 195, 232, 110);
  private readonly unlockedText = new Color(220, 238, 255, 255);
  // Locked: desaturated steel, clearly disabled
  private readonly lockedFill = new Color(36, 42, 52, 160);
  private readonly lockedStroke = new Color(90, 100, 115, 50);
  private readonly lockedText = new Color(120, 130, 145, 200);

  private readonly selectedScale = 1.08;
  private readonly unlockedScale = 1;
  private readonly lockedScale = 0.94;
  private textDirty = true;
  private echoButtonsDirty = true;
  private sceneSwitchNotice = '';
  private boundSceneLoader: SceneLoader | null = null;

  protected onEnable(): void {
    this.applySpriteSkin();
    this.applyResponsiveLayout();
    this.hideWorldHintNodes();
    this.applyWorldPlaceholderSemantics();
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
    this.applySpriteSkin();
    this.applyResponsiveLayout();
    this.hideWorldHintNodes();
    this.applyWorldPlaceholderSemantics();
    this.bindSceneLoader();
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
    // Mobile tier: detect real small landscape phone canvases without treating
    // ultra-wide desktop preview windows as phones.
    // designResolution is FIXED_HEIGHT=720, so visibleSize.height stays 720 but
    // width stretches to viewport aspect. Phone landscape 812x375 maps to
    // ~1559 visibleSize.width (ratio 2.16); tablet/desktop stay below 1.78.
    // Also fall back to canvas physical size for WeChat mini-game runtime.
    const canvasSize = view.getCanvasSize();
    const aspect = visibleSize.height > 0 ? visibleSize.width / visibleSize.height : 1;
    const mobile =
      canvasSize.width <= 900 ||
      canvasSize.height <= 480 ||
      (aspect >= 1.9 && canvasSize.height <= 520);
    // On mobile scale UP main action buttons (Attack / Summon) to meet the
    // 44-pt iOS HIG touch target floor, and hide the echo-row and controls
    // card entirely. Echo switching moves to Q/E on desktop; on mobile the
    // player picks up echoes contextually and SUMMON places the currently
    // selected one. See docs/demo视觉美学审计-2026-04-15.md P0 §3.
    const controlScale = mobile ? 1.35 : tight ? 0.88 : compact ? 0.94 : 1;
    const joystickInsetX = mobile ? 96 : tight ? 122 : compact ? 128 : 134;
    const joystickInsetY = mobile ? 96 : tight ? 106 : compact ? 114 : 122;
    // ATTACK + SUMMON sit at the SAME Y with clear horizontal breathing room.
    // Previous design placed SUMMON 44-48 px BELOW attack, which collided
    // because button heights (~66-70 px) exceeded that vertical gap (edge
    // overlap ~20 px, visible in the 2026-04-15 screenshot where the user
    // caught the bug). Horizontal offsets below are computed from each
    // tier's button half-widths + 25 px margin:
    //   mobile  1.35x: halfW 80+84 + 28 margin = 200
    //   tight   0.88x: halfW 52+55 + 23 margin = 150
    //   compact 0.94x: halfW 55+58 + 22 margin = 160
    //   desktop 1.00x: halfW 59+62 + 24 margin = 170
    const attackInsetX = mobile ? 100 : tight ? 108 : compact ? 112 : 118;
    const summonOffsetX = mobile ? 200 : tight ? 150 : compact ? 160 : 170;
    const resetOffsetX = tight ? 12 : 16;
    const echoBaseOffsetX = tight ? 308 : compact ? 320 : 332;
    // echoStepX: adversary audit (2026-04-16) found 6-12px gap between echo
    // buttons at old values — P0 touch-target violation. Bumped to 128/136
    // for ~40px gaps.
    const echoStepX = tight ? 128 : 136;
    const attackBaseY = safeBottom + (mobile ? 126 : tight ? 100 : compact ? 108 : 116);
    // Echo row raised higher (adversary found BOMB-to-ATTACK gap was 4px).
    const echoRowY = attackBaseY + (tight ? 110 : compact ? 116 : 122);
    const pauseInsetX = tight ? 204 : 214;
    const pauseInsetY = tight ? 88 : 96;
    // Keep the always-visible HUD informative without letting it read as two
    // full-width debug banners over the world.
    const hudWidth = clamp(safeArea.width - (tight ? 88 : 116), 700, 1120);
    const objectiveWidth = clamp(safeArea.width - (tight ? 120 : 176), 620, 1040);
    const controlsWidth = clamp(safeArea.width - 420, 420, 900);
    const topBarY = safeTop - 40;
    const objectiveY = safeTop - (tight ? 92 : 96);
    const controlsY = safeBottom + 30;
    const controlsVisible = !compact;
    const checkpointVisible = !compact;
    const resetVisible = !compact && !mobile;
    const echoRowVisible = !mobile;

    this.resizeNode(this.hudTopBar, hudWidth, 76);
    this.resizeNode(this.hudObjectiveCard, objectiveWidth, 44);
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

    // Hide the 3-slot echo row on mobile: SUMMON places the currently-selected
    // echo, selected via pickup / keyboard. Keeps thumb zone clean.
    // Use `.active = false` AND position offscreen to be robust to layout re-runs
    // that may only re-apply positions (not activations).
    if (this.echoBoxButton) {
      this.echoBoxButton.active = echoRowVisible;
    }
    if (this.echoFlowerButton) {
      this.echoFlowerButton.active = echoRowVisible;
    }
    if (this.echoBombButton) {
      this.echoBombButton.active = echoRowVisible;
    }

    this.setPosition(this.joystick, safeLeft + joystickInsetX, safeBottom + joystickInsetY);
    this.setPosition(this.attackButton, safeRight - attackInsetX, attackBaseY);
    // Summon is to the LEFT of attack at the SAME Y (see constant comment
    // above; vertical stagger removed to fix overlap regression).
    this.setPosition(this.summonButton, safeRight - attackInsetX - summonOffsetX, attackBaseY);
    // RESET button moved 30px further down to clear SUMMON (adversary audit
    // found 6px vertical overlap).
    this.setPosition(this.resetButton, safeRight - attackInsetX + resetOffsetX, safeBottom + (tight ? 16 : 24));
    const echoOffscreenX = -99999;
    const echoOffscreenY = -99999;
    if (echoRowVisible) {
      this.setPosition(this.echoBoxButton, safeRight - echoBaseOffsetX, echoRowY);
      this.setPosition(this.echoFlowerButton, safeRight - echoBaseOffsetX + echoStepX, echoRowY);
      this.setPosition(this.echoBombButton, safeRight - echoBaseOffsetX + echoStepX * 2, echoRowY);
    } else {
      this.setPosition(this.echoBoxButton, echoOffscreenX, echoOffscreenY);
      this.setPosition(this.echoFlowerButton, echoOffscreenX, echoOffscreenY);
      this.setPosition(this.echoBombButton, echoOffscreenX, echoOffscreenY);
    }
    this.setPosition(this.pauseButton, safeRight - pauseInsetX, safeTop - pauseInsetY);

    this.setScale(this.joystick, controlScale);
    this.setScale(this.attackButton, controlScale);
    this.setScale(this.summonButton, controlScale);
    this.setScale(this.resetButton, controlScale);
    this.setScale(this.echoBoxButton, controlScale);
    this.setScale(this.echoFlowerButton, controlScale);
    this.setScale(this.echoBombButton, controlScale);
    this.setScale(this.pauseButton, controlScale);

    if (!GameHud.geometrySelfCheckDone) {
      GameHud.geometrySelfCheckDone = true;
      this.verifyTouchButtonGeometry(controlScale);
    }
  }

  private hideWorldHintNodes(): void {
    const canvas = director.getScene()?.getChildByName('Canvas') ?? null;
    const worldRoot = canvas?.getChildByName('WorldRoot') ?? null;
    if (!worldRoot) {
      return;
    }

    const visit = (node: Node): void => {
      if (!node?.isValid) {
        return;
      }

      if (/Hint/i.test(node.name)) {
        node.active = false;
        return;
      }

      if (/Sign/i.test(node.name)) {
        node.active = false;
        return;
      }

      for (const child of node.children) {
        visit(child);
      }
    };

    for (const child of worldRoot.children) {
      visit(child);
    }
  }

  private applyWorldPlaceholderSemantics(): void {
    const canvas = director.getScene()?.getChildByName('Canvas') ?? null;
    const worldRoot = canvas?.getChildByName('WorldRoot') ?? null;
    if (!worldRoot) {
      return;
    }

    const visit = (node: Node): void => {
      if (!node?.isValid) {
        return;
      }

      this.applyWorldSemanticToNode(node);
      for (const child of node.children) {
        visit(child);
      }
    };

    for (const child of worldRoot.children) {
      visit(child);
    }
  }

  private applyWorldSemanticToNode(node: Node): void {
    const name = node.name;
    if (/^(?:CampHint|WestHint|RuinsHint|HubHint|Room[A-C]Hint|CampSign)/i.test(name)) {
      node.active = false;
      return;
    }

    const visualNode = node.getChildByName(`${name}-Visual`) ?? node.getChildByName('Visual');
    const labelNode = node.getChildByName(`${name}-Label`) ?? node.getChildByName('Label');
    const label = labelNode?.getComponent(Label) ?? null;
    const rectVisual = visualNode?.getComponent(RectVisual) ?? null;
    const spriteSkinNode = visualNode?.getChildByName('SpriteSkin') ?? null;
    let hasSpriteSkin = Boolean(spriteSkinNode?.activeInHierarchy);

    if (/^Boss(?:Backdrop|Lane)$/i.test(name) && spriteSkinNode?.isValid) {
      // BossArena reads cleaner with soft placeholder planes than with tiled
      // wall skins. Keeping the SpriteSkin active produces the "many big boxes"
      // effect the user reported in the final arena.
      spriteSkinNode.active = false;
      hasSpriteSkin = false;
    }

    if (/^(?:.*Backdrop|.*Lane|.*Zone|.*Strip|.*Glow|.*Accent(?:-\d+)?)$/i.test(name)) {
      if (labelNode) {
        labelNode.active = false;
      }
      if (rectVisual && !hasSpriteSkin) {
        const fillAlpha = /^BossBackdrop$/i.test(name)
          ? 10
          : /^BossLane$/i.test(name)
            ? 18
            : /Backdrop/i.test(name)
              ? 22
              : 34;
        rectVisual.fillColor = new Color(rectVisual.fillColor.r, rectVisual.fillColor.g, rectVisual.fillColor.b, fillAlpha);
        rectVisual.strokeColor = new Color(rectVisual.strokeColor.r, rectVisual.strokeColor.g, rectVisual.strokeColor.b, 0);
        rectVisual.drawStroke = false;
        rectVisual.gradientStrength = /^Boss(?:Backdrop|Lane)$/i.test(name) ? 0.08 : rectVisual.gradientStrength;
        rectVisual.innerShadow = 0;
        rectVisual.doubleBorder = 0;
        rectVisual.hatchStrength = 0;
        rectVisual.stippleStrength = 0;
        rectVisual.outerGlow = 0;
        rectVisual.requestRedraw();
      }
      return;
    }

    if (this.hasComponentNamed(node, 'ScenePortal')) {
      this.applySemanticPalette({
        label: this.describePortalLabel(node),
        labelColor: new Color(245, 251, 255, 255),
        fillColor: new Color(104, 154, 184, 232),
        strokeColor: new Color(228, 247, 255, 172),
        outerGlow: 0.18,
        outerGlowColor: new Color(176, 230, 255, 110),
      }, label, labelNode, rectVisual, hasSpriteSkin);
      return;
    }

    if (this.hasComponentNamed(node, 'CheckpointMarker')) {
      this.applySemanticPalette({
        label: '\u7BDD\u706B',
        labelColor: new Color(77, 57, 21, 255),
        fillColor: new Color(237, 196, 105, 236),
        strokeColor: new Color(255, 245, 211, 190),
        outerGlow: 0.1,
        outerGlowColor: new Color(255, 236, 166, 96),
      }, label, labelNode, rectVisual, hasSpriteSkin);
      return;
    }

    if (this.hasComponentNamed(node, 'PressurePlateSwitch') || /Plate/i.test(name)) {
      this.applySemanticPalette({
        label: '\u673A\u5173',
        labelColor: new Color(27, 55, 31, 255),
        fillColor: new Color(128, 203, 123, 238),
        strokeColor: new Color(224, 255, 216, 180),
      }, label, labelNode, rectVisual, hasSpriteSkin);
      return;
    }

    if (this.hasComponentNamed(node, 'EchoUnlockPickup') || /EchoPickup/i.test(name)) {
      this.applySemanticPalette({
        label: '\u65B0\u56DE\u54CD',
        labelColor: new Color(30, 83, 48, 255),
        fillColor: new Color(155, 220, 167, 232),
        strokeColor: new Color(232, 255, 238, 176),
      }, label, labelNode, rectVisual, hasSpriteSkin);
      return;
    }

    if (this.hasComponentNamed(node, 'ProgressFlagPickup')) {
      this.applySemanticPalette({
        label: '\u9057\u7269',
        labelColor: new Color(90, 60, 28, 255),
        fillColor: new Color(239, 205, 139, 232),
        strokeColor: new Color(255, 241, 202, 176),
      }, label, labelNode, rectVisual, hasSpriteSkin);
      return;
    }

    if (/Enemy/i.test(name) || this.hasComponentNamed(node, 'EnemyAI')) {
      this.applySemanticPalette({
        label: '\u654C\u4EBA',
        labelColor: new Color(98, 44, 42, 255),
        fillColor: new Color(232, 156, 146, 228),
        strokeColor: new Color(255, 228, 224, 160),
      }, label, labelNode, rectVisual, hasSpriteSkin);
    }
  }

  private applySemanticPalette(
    semantic: {
      label: string;
      labelColor: Color;
      fillColor: Color;
      strokeColor: Color;
      outerGlow?: number;
      outerGlowColor?: Color;
    },
    label: Label | null,
    labelNode: Node | null,
    rectVisual: RectVisual | null,
    hasSpriteSkin: boolean,
  ): void {
    if (label && !hasSpriteSkin) {
      label.string = semantic.label;
      label.color = semantic.labelColor;
    }
    if (labelNode && !hasSpriteSkin) {
      labelNode.active = true;
    }
    if (rectVisual && !hasSpriteSkin) {
      rectVisual.drawFill = true;
      rectVisual.drawStroke = true;
      rectVisual.fillColor = semantic.fillColor;
      rectVisual.strokeColor = semantic.strokeColor;
      rectVisual.outerGlow = semantic.outerGlow ?? 0;
      rectVisual.outerGlowColor = semantic.outerGlowColor ?? new Color(0, 0, 0, 0);
      rectVisual.requestRedraw();
    }
  }

  private hasComponentNamed(node: Node, componentName: string): boolean {
    return node.components.some((component) => component?.constructor?.name === componentName);
  }

  private describePortalLabel(node: Node): string {
    const portal = node.components.find((component) => component?.constructor?.name === 'ScenePortal') as {
      targetScene?: string;
    } | undefined;
    const targetScene = String(portal?.targetScene ?? '').trim();
    const targetSceneLabel = this.describeSceneLabel(targetScene);
    if (!targetSceneLabel) {
      return '\u51FA\u53E3';
    }

    if (targetScene === 'StartCamp') {
      return `\u56DE${targetSceneLabel}`;
    }

    return `\u524D\u5F80${targetSceneLabel}`;
  }

  private describeSceneLabel(sceneName: string): string {
    switch (sceneName) {
      case 'StartCamp':
        return '\u8425\u5730';
      case 'FieldWest':
        return '\u6797\u95F4\u5C0F\u5F84';
      case 'FieldRuins':
        return '\u9057\u8FF9';
      case 'DungeonHub':
        return '\u8BD5\u70BC\u5927\u5385';
      case 'DungeonRoomA':
        return '\u7BB1\u5B50\u8BD5\u70BC';
      case 'DungeonRoomB':
        return '\u5F39\u82B1\u8BD5\u70BC';
      case 'DungeonRoomC':
        return '\u70B8\u866B\u8BD5\u70BC';
      case 'BossArena':
        return '\u9996\u9886\u8BD5\u70BC';
      default:
        return '';
    }
  }

  // geometrySelfCheckDone + verifyTouchButtonGeometry exist *because* the
  // 2026-04-15 screenshot caught attack/summon overlapping by 20 px — a bug
  // that three parallel aesthetic-audit agents missed because they reasoned
  // visually about single screenshots, not geometrically about button AABBs.
  // Self-check warns in console if any two active touch buttons' axis-aligned
  // bounding boxes intersect. Runs once per HUD lifetime to avoid spam.
  private static geometrySelfCheckDone = false;

  private verifyTouchButtonGeometry(scale: number): void {
    const buttons: { name: string; node: Node | null }[] = [
      { name: 'joystick', node: this.joystick },
      { name: 'attackButton', node: this.attackButton },
      { name: 'summonButton', node: this.summonButton },
      { name: 'resetButton', node: this.resetButton },
      { name: 'echoBoxButton', node: this.echoBoxButton },
      { name: 'echoFlowerButton', node: this.echoFlowerButton },
      { name: 'echoBombButton', node: this.echoBombButton },
      { name: 'pauseButton', node: this.pauseButton },
    ];

    const rects: { name: string; x0: number; y0: number; x1: number; y1: number }[] = [];
    for (const { name, node } of buttons) {
      if (!node?.isValid || !node.active) continue;
      const t = node.getComponent(UITransform);
      if (!t) continue;
      const { x, y } = node.position;
      const w = t.contentSize.width * scale;
      const h = t.contentSize.height * scale;
      rects.push({ name, x0: x - w / 2, y0: y - h / 2, x1: x + w / 2, y1: y + h / 2 });
    }

    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        const overlap = a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
        if (overlap) {
          const dx = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
          const dy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
          console.warn(
            `[GameHud] Touch button overlap: ${a.name} vs ${b.name}`,
            `(dx=${dx.toFixed(1)}px, dy=${dy.toFixed(1)}px, scale=${scale.toFixed(2)})`,
          );
        }
      }
    }
  }

  private applySpriteSkin(): void {
    this.applyNodeSpriteSkin(this.hudTopBar, this.hudTopBarSpriteFrame);
    this.applyNodeSpriteSkin(this.hudObjectiveCard, this.hudObjectiveCardSpriteFrame);
    this.applyNodeSpriteSkin(this.hudControlsCard, this.hudControlsCardSpriteFrame);
    this.applyButtonIconSkin(this.attackButton, this.attackIconSpriteFrame, true);
    this.applyButtonIconSkin(this.summonButton, this.summonIconSpriteFrame, true);
    this.applyButtonIconSkin(this.resetButton, this.respawnIconSpriteFrame, true);
    this.applyButtonIconSkin(this.pauseButton, this.pauseIconSpriteFrame, true);
    this.applyButtonIconSkin(this.echoBoxButton, this.echoBoxIconSpriteFrame, false);
    this.applyButtonIconSkin(this.echoFlowerButton, this.echoFlowerIconSpriteFrame, false);
    this.applyButtonIconSkin(this.echoBombButton, this.echoBombIconSpriteFrame, false);
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
      this.objectiveLabel.string = `目标  ${this.objectiveText}`;
    }

    if (this.objectiveLabel && this.sceneSwitchNotice) {
      this.objectiveLabel.string = `提示  ${this.sceneSwitchNotice}`;
    }

    if (this.controlsLabel) {
      // First-session / WeChat evidence must stay touch-only; desktop shortcuts
      // are still implemented, but should not be taught in the mobile HUD.
      this.controlsLabel.string = this.mobileHintText;
    }

    if (this.healthLabel) {
      const currentHealth = this.playerHealth?.getCurrentHealth() ?? 0;
      const maxHealth = this.playerHealth?.maxHealth ?? 0;
      this.healthLabel.string = `生命 ${currentHealth}/${maxHealth}`;
    }

    if (this.echoLabel) {
      const currentEcho = this.echoManager?.getCurrentEchoId() ?? EchoId.Box;
      const unlockedCount = this.echoManager?.getUnlockedEchoes().length ?? 1;
      this.echoLabel.string = `回响 ${ECHO_DISPLAY_NAME[currentEcho]}  ${unlockedCount}/3`;
    }

    if (this.checkpointLabel) {
      const checkpoint = GameManager.instance?.getCheckpoint();
      const checkpointName = checkpoint
        ? (CHECKPOINT_LABEL[checkpoint.markerId] ?? checkpoint.markerId)
        : '未激活';
      this.checkpointLabel.string = `营火 ${checkpointName}`;
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
      // 锁定态保留按钮本名（FLOWER / BOMB），用颜色 + 缩放传达状态。
      // 之前写死 "LOCK" 导致 Flower 和 Bomb 两颗锁定按钮视觉完全相同，
      // 外部审美 agent 把它标记为"出厂 bug 级的视觉冗余"。
      label.string = `${buttonName}·锁`;
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

  private applyNodeSpriteSkin(node: Node | null, spriteFrame: SpriteFrame | null): void {
    if (!node || !spriteFrame) {
      return;
    }

    const sprite = node.getComponent(Sprite) ?? node.addComponent(Sprite);
    sprite.spriteFrame = spriteFrame;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;

    const rectVisual = node.getComponent(RectVisual);
    if (rectVisual) {
      rectVisual.drawFill = false;
      rectVisual.drawStroke = false;
      rectVisual.requestRedraw();
    }
  }

  private applyButtonIconSkin(button: Node | null, spriteFrame: SpriteFrame | null, hideLabel: boolean): void {
    if (!button || !spriteFrame) {
      return;
    }

    const iconNodeName = `${button.name}-Icon`;
    let iconNode = button.getChildByName(iconNodeName);
    if (!iconNode) {
      iconNode = new Node(iconNodeName);
      iconNode.layer = button.layer;
      iconNode.setParent(button);
    }

    const iconTransform = iconNode.getComponent(UITransform) ?? iconNode.addComponent(UITransform);
    iconTransform.setContentSize(24, 24);
    iconNode.setPosition(0, hideLabel ? 0 : 8, 0);

    const sprite = iconNode.getComponent(Sprite) ?? iconNode.addComponent(Sprite);
    sprite.spriteFrame = spriteFrame;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;

    const labelNode = button.getChildByName(`${button.name}-Label`) ?? button.getChildByName('Label');
    if (!labelNode) {
      return;
    }

    labelNode.active = !hideLabel;
    if (!hideLabel) {
      labelNode.setPosition(0, -14, 0);
    }
  }

  private bindHudEvents(): void {
    this.playerHealth?.events?.on(HEALTH_EVENT_CHANGED, this.onHealthChanged, this);
    this.echoManager?.events?.on(ECHO_EVENT_SELECTED, this.onEchoChanged, this);
    this.echoManager?.events?.on(ECHO_EVENT_UNLOCKED, this.onEchoChanged, this);
    GameManager.instance?.events?.on(GAME_EVENT_CHECKPOINT_CHANGED, this.onCheckpointChanged, this);
    this.bindSceneLoader();
  }

  private unbindHudEvents(): void {
    this.playerHealth?.events?.off(HEALTH_EVENT_CHANGED, this.onHealthChanged, this);
    this.echoManager?.events?.off(ECHO_EVENT_SELECTED, this.onEchoChanged, this);
    this.echoManager?.events?.off(ECHO_EVENT_UNLOCKED, this.onEchoChanged, this);
    GameManager.instance?.events?.off(GAME_EVENT_CHECKPOINT_CHANGED, this.onCheckpointChanged, this);
    this.boundSceneLoader?.events?.off(SCENE_EVENT_SWITCH_STATE_CHANGED, this.onSceneSwitchStateChanged, this);
    this.boundSceneLoader = null;
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

  private bindSceneLoader(): void {
    const loader = SceneLoader.instance;
    if (this.boundSceneLoader === loader) {
      return;
    }

    this.boundSceneLoader?.events?.off(SCENE_EVENT_SWITCH_STATE_CHANGED, this.onSceneSwitchStateChanged, this);
    this.boundSceneLoader = loader;
    this.boundSceneLoader?.events?.on(SCENE_EVENT_SWITCH_STATE_CHANGED, this.onSceneSwitchStateChanged, this);
    this.onSceneSwitchStateChanged(this.boundSceneLoader?.getSwitchState() ?? null);
  }

  private onSceneSwitchStateChanged(state: SceneSwitchState | null): void {
    const nextNotice = this.formatSceneSwitchNotice(state);
    if (this.sceneSwitchNotice === nextNotice) {
      return;
    }

    this.sceneSwitchNotice = nextNotice;
    this.markTextDirty();
  }

  private formatSceneSwitchNotice(state: SceneSwitchState | null): string {
    if (!state || state.status === 'idle') {
      return '';
    }

    if (state.status === 'switching') {
      return state.targetScene
        ? `正在前往 ${state.targetScene}...`
        : '正在切换场景...';
    }

    if (state.status === 'failed') {
      const reason = state.errorMessage ? `：${state.errorMessage}` : '';
      return state.targetScene
        ? `加载 ${state.targetScene} 失败，可重试${reason}`
        : `加载失败，可重试${reason}`;
    }

    return '';
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
