import { _decorator, AudioClip, AudioSource, Component, Enum, EventMouse, EventTouch, input, Input, Node, Sprite, SpriteFrame, Texture2D, UITransform, Vec2, Vec3 } from 'cc';
import { EchoId } from '../core/GameTypes';
import { GameManager } from '../core/GameManager';
import { SceneLoader } from '../core/SceneLoader';
import { PlayerController } from '../player/PlayerController';
import { RectVisual } from '../visual/RectVisual';
import { resolveTextureBackedSpriteFrame, destroyGeneratedSpriteFrames } from '../visual/SpriteVisualSkin';
import {
  getNativeChangedTouches,
  getNativeTouchId,
  getWechatTouchApi,
  isNativeMouseInsideNode,
  isNativeTouchInsideNode,
  NativeMouseEventLike,
  NativeTouchEventLike,
  NativeTouchLike,
  WechatTouchApi,
} from './NativeTouchUtils';

const { ccclass, property } = _decorator;

enum TouchCommand {
  Attack,
  PlaceEcho,
  Respawn,
  EchoBox,
  EchoFlower,
  EchoBomb,
  EchoPrev,
  EchoNext,
  PauseToggle,
  Resume,
  ReturnToCamp,
}

@ccclass('TouchCommandButton')
export class TouchCommandButton extends Component {
  @property(PlayerController)
  player: PlayerController | null = null;

  @property({ type: Enum(TouchCommand) })
  command: TouchCommand = TouchCommand.Attack;

  @property
  pressedScale = 0.92;

  @property(SpriteFrame)
  buttonSpriteFrame: SpriteFrame | null = null;

  @property(Texture2D)
  buttonTexture: Texture2D | null = null;

  @property(AudioClip)
  tapClip: AudioClip | null = null;

  @property(AudioClip)
  confirmClip: AudioClip | null = null;

  @property(AudioClip)
  errorClip: AudioClip | null = null;

  @property(AudioClip)
  menuClip: AudioClip | null = null;

  @property
  audioVolume = 1;

  private touchId: number | null = null;
  private initialScale = new Vec3(1, 1, 1);
  private audioSource: AudioSource | null = null;
  private generatedFrames: Map<string, SpriteFrame> = new Map();
  private boundTouchNodes: Node[] = [];
  private globalTouchActive = false;
  private mouseActive = false;
  private nativeTouchActive = false;
  private nativeMouseActive = false;
  private nativeTouchId: number | null = null;
  private wechatTouchApi: WechatTouchApi | null = null;
  private readonly boundWechatNativeTouchStart = (event: NativeTouchEventLike): void => this.onWechatNativeTouchStart(event);
  private readonly boundWechatNativeTouchEnd = (event: NativeTouchEventLike): void => this.onWechatNativeTouchEnd(event);
  private readonly boundWechatNativeTouchCancel = (event: NativeTouchEventLike): void => this.onWechatNativeTouchCancel(event);
  private readonly boundWechatNativeMouseDown = (event: NativeMouseEventLike): void => this.onWechatNativeMouseDown(event);
  private readonly boundWechatNativeMouseUp = (event: NativeMouseEventLike): void => this.onWechatNativeMouseUp(event);

  protected onLoad(): void {
    this.initialScale = this.node.scale.clone();
    const audioSource = this.getComponent(AudioSource) ?? this.addComponent(AudioSource);
    if (!audioSource) {
      return;
    }
    this.audioSource = audioSource;
    audioSource.playOnAwake = false;
    audioSource.loop = false;
    this.applyButtonSpriteFrame();
  }

  protected onEnable(): void {
    this.bindTouchNodes();
    this.bindWechatNativeTouches();
    input.on(Input.EventType.TOUCH_START, this.onGlobalTouchStart, this);
    input.on(Input.EventType.TOUCH_END, this.onGlobalTouchEnd, this);
    input.on(Input.EventType.TOUCH_CANCEL, this.onGlobalTouchCancel, this);
  }

  protected onDisable(): void {
    this.unbindTouchNodes();
    this.unbindWechatNativeTouches();
    input.off(Input.EventType.TOUCH_START, this.onGlobalTouchStart, this);
    input.off(Input.EventType.TOUCH_END, this.onGlobalTouchEnd, this);
    input.off(Input.EventType.TOUCH_CANCEL, this.onGlobalTouchCancel, this);
    input.off(Input.EventType.MOUSE_UP, this.onGlobalMouseUp, this);
    this.globalTouchActive = false;
    this.mouseActive = false;
    this.nativeTouchActive = false;
    this.nativeMouseActive = false;
    this.nativeTouchId = null;
    this.restoreScale();
  }

  private onTouchStart(event: EventTouch): void {
    if (this.touchId !== null) {
      return;
    }

    this.touchId = event.getID();
    this.globalTouchActive = false;
    this.nativeTouchActive = false;
    this.nativeMouseActive = false;
    this.nativeTouchId = null;
    this.node.setScale(
      this.initialScale.x * this.pressedScale,
      this.initialScale.y * this.pressedScale,
      this.initialScale.z,
    );
  }

  private onTouchEnd(event: EventTouch): void {
    if (event.getID() !== this.touchId) {
      return;
    }

    this.touchId = null;
    this.globalTouchActive = false;
    this.restoreScale();
    this.executeCommand();
  }

  private onTouchCancel(event: EventTouch): void {
    if (event.getID() !== this.touchId) {
      return;
    }

    this.touchId = null;
    this.globalTouchActive = false;
    this.restoreScale();
  }

  private onGlobalTouchStart(event: EventTouch): void {
    if (this.touchId !== null || !this.isTouchInsideNode(event)) {
      return;
    }

    this.touchId = event.getID();
    this.globalTouchActive = true;
    this.nativeTouchActive = false;
    this.nativeMouseActive = false;
    this.nativeTouchId = null;
    this.node.setScale(
      this.initialScale.x * this.pressedScale,
      this.initialScale.y * this.pressedScale,
      this.initialScale.z,
    );
  }

  private onGlobalTouchEnd(event: EventTouch): void {
    if (!this.globalTouchActive || event.getID() !== this.touchId) {
      return;
    }

    this.touchId = null;
    this.globalTouchActive = false;
    this.restoreScale();
    this.executeCommand();
  }

  private onGlobalTouchCancel(event: EventTouch): void {
    if (!this.globalTouchActive || event.getID() !== this.touchId) {
      return;
    }

    this.touchId = null;
    this.globalTouchActive = false;
    this.restoreScale();
  }

  private onWechatNativeTouchStart(event: NativeTouchEventLike): void {
    if (this.touchId !== null) {
      return;
    }

    const api = this.wechatTouchApi;
    const touches = getNativeChangedTouches(event);
    const matchedIndex = touches.findIndex((touch) => isNativeTouchInsideNode(this.node, touch, api));
    if (matchedIndex < 0) {
      return;
    }

    this.touchId = getNativeTouchId(touches[matchedIndex], matchedIndex);
    this.nativeTouchId = this.touchId;
    this.nativeTouchActive = true;
    this.nativeMouseActive = false;
    this.globalTouchActive = false;
    this.node.setScale(
      this.initialScale.x * this.pressedScale,
      this.initialScale.y * this.pressedScale,
      this.initialScale.z,
    );
  }

  private onWechatNativeTouchEnd(event: NativeTouchEventLike): void {
    if (!this.nativeTouchActive || !this.hasMatchingNativeTouch(event, true)) {
      return;
    }

    this.touchId = null;
    this.nativeTouchId = null;
    this.nativeTouchActive = false;
    this.restoreScale();
    this.executeCommand();
  }

  private onWechatNativeMouseDown(event: NativeMouseEventLike): void {
    if (this.touchId !== null || this.nativeMouseActive) {
      return;
    }

    if (!isNativeMouseInsideNode(this.node, event, this.wechatTouchApi)) {
      return;
    }

    this.touchId = -2;
    this.nativeMouseActive = true;
    this.globalTouchActive = false;
    this.nativeTouchActive = false;
    this.nativeTouchId = null;
    this.node.setScale(
      this.initialScale.x * this.pressedScale,
      this.initialScale.y * this.pressedScale,
      this.initialScale.z,
    );
  }

  private onWechatNativeMouseUp(event: NativeMouseEventLike): void {
    if (!this.nativeMouseActive) {
      return;
    }

    const shouldExecute = isNativeMouseInsideNode(this.node, event, this.wechatTouchApi);
    this.touchId = null;
    this.nativeMouseActive = false;
    this.restoreScale();
    if (shouldExecute) {
      this.executeCommand();
    }
  }

  private onMouseDown(event: EventMouse): void {
    if (this.touchId !== null || this.mouseActive || !this.isMouseInsideNode(event)) {
      return;
    }

    this.mouseActive = true;
    this.touchId = -1;
    this.globalTouchActive = false;
    this.nativeTouchActive = false;
    this.nativeMouseActive = false;
    this.nativeTouchId = null;
    this.node.setScale(
      this.initialScale.x * this.pressedScale,
      this.initialScale.y * this.pressedScale,
      this.initialScale.z,
    );
  }

  private onMouseUp(event: EventMouse): void {
    if (!this.mouseActive) {
      return;
    }

    const shouldExecute = this.isMouseInsideNode(event);
    this.touchId = null;
    this.mouseActive = false;
    this.restoreScale();
    if (shouldExecute) {
      this.executeCommand();
    }
  }

  private onGlobalMouseUp(event: EventMouse): void {
    this.onMouseUp(event);
  }

  private onWechatNativeTouchCancel(event: NativeTouchEventLike): void {
    if (!this.nativeTouchActive || !this.hasMatchingNativeTouch(event)) {
      return;
    }

    this.touchId = null;
    this.nativeTouchId = null;
    this.nativeTouchActive = false;
    this.nativeMouseActive = false;
    this.restoreScale();
  }

  private hasMatchingNativeTouch(event: NativeTouchEventLike, requireInside = false): boolean {
    if (this.nativeTouchId === null) {
      return false;
    }

    const api = this.wechatTouchApi;
    return getNativeChangedTouches(event).some((touch: NativeTouchLike, index: number) => {
      const matchesId = getNativeTouchId(touch, index) === this.nativeTouchId;
      return matchesId && (!requireInside || isNativeTouchInsideNode(this.node, touch, api));
    });
  }

  private executeCommand(): void {
    const manager = GameManager.instance;
    const isPaused = manager?.isPaused() ?? false;
    const blockedWhenPaused =
      this.command === TouchCommand.Attack ||
      this.command === TouchCommand.PlaceEcho ||
      this.command === TouchCommand.EchoBox ||
      this.command === TouchCommand.EchoFlower ||
      this.command === TouchCommand.EchoBomb ||
      this.command === TouchCommand.EchoPrev ||
      this.command === TouchCommand.EchoNext;
    if (isPaused && blockedWhenPaused) {
      recordQaTouchCommand(this.node.name, this.command, 'blocked-paused', isPaused, manager?.getFlowState?.() ?? null);
      this.playClip(this.errorClip);
      return;
    }
    let clipToPlay: AudioClip | null = null;
    const flowBefore = manager?.getFlowState?.() ?? null;

    switch (this.command) {
      case TouchCommand.Attack:
        clipToPlay = this.player?.attack() ? (this.confirmClip ?? this.tapClip) : this.errorClip;
        break;
      case TouchCommand.PlaceEcho:
        clipToPlay = this.player?.tryPlaceCurrentEcho() ? (this.confirmClip ?? this.tapClip) : this.errorClip;
        break;
      case TouchCommand.Respawn:
        manager?.resumeGame();
        manager?.requestRespawn();
        clipToPlay = this.confirmClip ?? this.tapClip;
        break;
      case TouchCommand.EchoBox:
        this.player?.echoManager?.selectEcho(EchoId.Box);
        clipToPlay = this.tapClip;
        break;
      case TouchCommand.EchoFlower:
        this.player?.echoManager?.selectEcho(EchoId.SpringFlower);
        clipToPlay = this.tapClip;
        break;
      case TouchCommand.EchoBomb:
        this.player?.echoManager?.selectEcho(EchoId.BombBug);
        clipToPlay = this.tapClip;
        break;
      case TouchCommand.EchoPrev:
        this.player?.echoManager?.cycleSelection(-1);
        clipToPlay = this.tapClip;
        break;
      case TouchCommand.EchoNext:
        this.player?.echoManager?.cycleSelection(1);
        clipToPlay = this.tapClip;
        break;
      case TouchCommand.PauseToggle:
        manager?.togglePause();
        clipToPlay = this.menuClip ?? this.confirmClip ?? this.tapClip;
        break;
      case TouchCommand.Resume:
        manager?.resumeGame();
        clipToPlay = this.confirmClip ?? this.tapClip;
        break;
      case TouchCommand.ReturnToCamp:
        manager?.resumeGame();
        SceneLoader.instance?.switchScene('StartCamp');
        clipToPlay = this.confirmClip ?? this.tapClip;
        break;
      default:
        break;
    }

    recordQaTouchCommand(this.node.name, this.command, 'executed', isPaused, flowBefore, manager?.getFlowState?.() ?? null);
    this.playClip(clipToPlay);
  }

  private restoreScale(): void {
    this.node.setScale(this.initialScale);
  }

  private playClip(clip: AudioClip | null): void {
    if (!clip || !this.audioSource) {
      return;
    }

    this.audioSource.playOneShot(clip, this.audioVolume);
  }

  private isTouchInsideNode(event: EventTouch): boolean {
    const transform = this.node.getComponent(UITransform);
    if (!transform || !this.node.activeInHierarchy) {
      return false;
    }

    const location = event.getUILocation();
    return transform.getBoundingBoxToWorld().contains(new Vec2(location.x, location.y));
  }

  private isMouseInsideNode(event: EventMouse): boolean {
    const transform = this.node.getComponent(UITransform);
    if (!transform || !this.node.activeInHierarchy) {
      return false;
    }

    const location = event.getUILocation();
    return transform.getBoundingBoxToWorld().contains(new Vec2(location.x, location.y));
  }

  private applyButtonSpriteFrame(): void {
    const effective = this.buttonSpriteFrame
      ?? resolveTextureBackedSpriteFrame(this.generatedFrames, 'button', this.buttonTexture);
    if (!effective) {
      return;
    }

    const visualNode = this.node.getChildByName(`${this.node.name}-Visual`) ?? this.node.getChildByName('Visual');
    if (!visualNode) {
      return;
    }

    const sprite = visualNode.getComponent(Sprite) ?? visualNode.addComponent(Sprite);
    sprite.spriteFrame = effective;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;

    const rectVisual = visualNode.getComponent(RectVisual);
    if (rectVisual) {
      rectVisual.drawFill = false;
      rectVisual.drawStroke = false;
      rectVisual.requestRedraw();
    }
  }

  private bindTouchNodes(): void {
    this.unbindTouchNodes();

    // WeChat DevTools can target the visible label/skin child rather than the
    // parent node. Bind direct children too so the obvious pixels are tappable.
    const nodes = [this.node, ...this.node.children].filter((node, index, all) => all.indexOf(node) === index);
    for (const node of nodes) {
      node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
      node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
      node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
      node.on(Node.EventType.MOUSE_DOWN, this.onMouseDown, this);
      node.on(Node.EventType.MOUSE_UP, this.onMouseUp, this);
    }
    this.boundTouchNodes = nodes;
    input.on(Input.EventType.MOUSE_UP, this.onGlobalMouseUp, this);
  }

  private unbindTouchNodes(): void {
    for (const node of this.boundTouchNodes) {
      node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
      node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
      node.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
      node.off(Node.EventType.MOUSE_DOWN, this.onMouseDown, this);
      node.off(Node.EventType.MOUSE_UP, this.onMouseUp, this);
    }
    this.boundTouchNodes = [];
    input.off(Input.EventType.MOUSE_UP, this.onGlobalMouseUp, this);
  }

  private bindWechatNativeTouches(): void {
    this.unbindWechatNativeTouches();
    const api = getWechatTouchApi();
    if (!api) {
      return;
    }

    api.onTouchStart?.(this.boundWechatNativeTouchStart);
    api.onTouchEnd?.(this.boundWechatNativeTouchEnd);
    api.onTouchCancel?.(this.boundWechatNativeTouchCancel);
    api.onMouseDown?.(this.boundWechatNativeMouseDown);
    api.onMouseUp?.(this.boundWechatNativeMouseUp);
    this.wechatTouchApi = api;
  }

  private unbindWechatNativeTouches(): void {
    if (!this.wechatTouchApi) {
      return;
    }

    this.wechatTouchApi.offTouchStart?.(this.boundWechatNativeTouchStart);
    this.wechatTouchApi.offTouchEnd?.(this.boundWechatNativeTouchEnd);
    this.wechatTouchApi.offTouchCancel?.(this.boundWechatNativeTouchCancel);
    this.wechatTouchApi.offMouseDown?.(this.boundWechatNativeMouseDown);
    this.wechatTouchApi.offMouseUp?.(this.boundWechatNativeMouseUp);
    this.wechatTouchApi = null;
  }

  protected onDestroy(): void {
    this.unbindTouchNodes();
    this.unbindWechatNativeTouches();
    destroyGeneratedSpriteFrames(this.generatedFrames);
  }
}

function recordQaTouchCommand(
  nodeName: string,
  command: TouchCommand,
  status: 'executed' | 'blocked-paused',
  wasPaused: boolean,
  flowBefore: string | null,
  flowAfter: string | null = flowBefore,
): void {
  const wxApi = (globalThis as { wx?: { getSystemInfoSync?: () => { platform?: string } } }).wx;
  if (wxApi?.getSystemInfoSync?.().platform !== 'devtools') {
    return;
  }

  const target = globalThis as unknown as {
    __wisdomQaTouchLog?: Array<Record<string, unknown>>;
  };
  target.__wisdomQaTouchLog ??= [];
  target.__wisdomQaTouchLog.push({
    at: Date.now(),
    nodeName,
    command,
    commandName: TouchCommand[command],
    status,
    wasPaused,
    flowBefore,
    flowAfter,
  });
  if (target.__wisdomQaTouchLog.length > 40) {
    target.__wisdomQaTouchLog.splice(0, target.__wisdomQaTouchLog.length - 40);
  }
}
