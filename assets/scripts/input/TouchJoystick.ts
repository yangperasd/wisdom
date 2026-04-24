import { _decorator, Component, EventMouse, EventTouch, input, Input, Node, UITransform, Vec2, Vec3 } from 'cc';
import { GameManager } from '../core/GameManager';
import { PlayerController } from '../player/PlayerController';
import {
  getNativeChangedTouches,
  getNativeMouseUILocation,
  getNativeTouchId,
  getNativeTouchUILocation,
  getWechatTouchApi,
  hasNativeTouchId,
  isNativeMouseInsideNode,
  isNativeTouchInsideNode,
  NativeMouseEventLike,
  NativeTouchEventLike,
  NativeTouchLike,
  WechatTouchApi,
} from './NativeTouchUtils';

const { ccclass, property } = _decorator;

@ccclass('TouchJoystick')
export class TouchJoystick extends Component {
  @property(PlayerController)
  player: PlayerController | null = null;

  @property(Node)
  knob: Node | null = null;

  @property
  maxRadius = 56;

  @property
  deadzone = 10;

  @property
  responseExponent = 0.72;

  private activeTouchId: number | null = null;
  private axis = new Vec2();
  private readonly direction = new Vec2();
  private readonly knobPosition = new Vec3();
  private boundTouchNodes: Node[] = [];
  private globalTouchActive = false;
  private mouseActive = false;
  private nativeTouchActive = false;
  private nativeMouseActive = false;
  private nativeTouchId: number | null = null;
  private wechatTouchApi: WechatTouchApi | null = null;
  private readonly boundWechatNativeTouchStart = (event: NativeTouchEventLike): void => this.onWechatNativeTouchStart(event);
  private readonly boundWechatNativeTouchMove = (event: NativeTouchEventLike): void => this.onWechatNativeTouchMove(event);
  private readonly boundWechatNativeTouchEnd = (event: NativeTouchEventLike): void => this.onWechatNativeTouchEnd(event);
  private readonly boundWechatNativeMouseDown = (event: NativeMouseEventLike): void => this.onWechatNativeMouseDown(event);
  private readonly boundWechatNativeMouseMove = (event: NativeMouseEventLike): void => this.onWechatNativeMouseMove(event);
  private readonly boundWechatNativeMouseUp = (): void => this.onWechatNativeMouseUp();

  protected onEnable(): void {
    this.bindTouchNodes();
    this.bindWechatNativeTouches();
    input.on(Input.EventType.TOUCH_START, this.onGlobalTouchStart, this);
    input.on(Input.EventType.TOUCH_MOVE, this.onGlobalTouchMove, this);
    input.on(Input.EventType.TOUCH_END, this.onGlobalTouchEnd, this);
    input.on(Input.EventType.TOUCH_CANCEL, this.onGlobalTouchEnd, this);
    input.on(Input.EventType.MOUSE_MOVE, this.onGlobalMouseMove, this);
    input.on(Input.EventType.MOUSE_UP, this.onGlobalMouseUp, this);
  }

  protected onDisable(): void {
    this.unbindTouchNodes();
    this.unbindWechatNativeTouches();
    input.off(Input.EventType.TOUCH_START, this.onGlobalTouchStart, this);
    input.off(Input.EventType.TOUCH_MOVE, this.onGlobalTouchMove, this);
    input.off(Input.EventType.TOUCH_END, this.onGlobalTouchEnd, this);
    input.off(Input.EventType.TOUCH_CANCEL, this.onGlobalTouchEnd, this);
    input.off(Input.EventType.MOUSE_MOVE, this.onGlobalMouseMove, this);
    input.off(Input.EventType.MOUSE_UP, this.onGlobalMouseUp, this);
    this.globalTouchActive = false;
    this.mouseActive = false;
    this.nativeTouchActive = false;
    this.nativeMouseActive = false;
    this.nativeTouchId = null;
    this.resetStick();
  }

  protected onDestroy(): void {
    this.unbindTouchNodes();
    this.unbindWechatNativeTouches();
  }

  private onTouchStart(event: EventTouch): void {
    if (GameManager.instance?.isPaused()) {
      this.resetStick();
      return;
    }

    if (this.activeTouchId !== null) {
      return;
    }

    this.activeTouchId = event.getID();
    this.globalTouchActive = false;
    this.nativeTouchActive = false;
    this.nativeMouseActive = false;
    this.nativeTouchId = null;
    this.updateFromTouch(event);
  }

  private onTouchMove(event: EventTouch): void {
    if (GameManager.instance?.isPaused()) {
      this.resetStick();
      return;
    }

    if (event.getID() !== this.activeTouchId) {
      return;
    }

    this.updateFromTouch(event);
  }

  private onTouchEnd(event: EventTouch): void {
    if (event.getID() !== this.activeTouchId) {
      return;
    }

    this.activeTouchId = null;
    this.globalTouchActive = false;
    this.resetStick();
  }

  private onGlobalTouchStart(event: EventTouch): void {
    if (GameManager.instance?.isPaused()) {
      this.resetStick();
      return;
    }

    if (this.activeTouchId !== null || !this.isTouchInsideNode(event)) {
      return;
    }

    this.activeTouchId = event.getID();
    this.globalTouchActive = true;
    this.nativeTouchActive = false;
    this.nativeMouseActive = false;
    this.nativeTouchId = null;
    this.updateFromTouch(event);
  }

  private onGlobalTouchMove(event: EventTouch): void {
    if (!this.globalTouchActive || event.getID() !== this.activeTouchId) {
      return;
    }

    this.updateFromTouch(event);
  }

  private onGlobalTouchEnd(event: EventTouch): void {
    if (!this.globalTouchActive || event.getID() !== this.activeTouchId) {
      return;
    }

    this.activeTouchId = null;
    this.globalTouchActive = false;
    this.resetStick();
  }

  private onWechatNativeTouchStart(event: NativeTouchEventLike): void {
    if (GameManager.instance?.isPaused()) {
      this.resetStick();
      return;
    }

    if (this.activeTouchId !== null) {
      return;
    }

    const api = this.wechatTouchApi;
    const touches = getNativeChangedTouches(event);
    const matchedIndex = touches.findIndex((touch) => isNativeTouchInsideNode(this.node, touch, api));
    if (matchedIndex < 0) {
      return;
    }

    const touch = touches[matchedIndex];
    this.activeTouchId = getNativeTouchId(touch, matchedIndex);
    this.nativeTouchId = this.activeTouchId;
    this.nativeTouchActive = true;
    this.nativeMouseActive = false;
    this.globalTouchActive = false;
    this.updateFromNativeTouch(touch);
  }

  private onWechatNativeTouchMove(event: NativeTouchEventLike): void {
    if (GameManager.instance?.isPaused()) {
      this.resetStick();
      return;
    }

    if (!this.nativeTouchActive || this.nativeTouchId === null) {
      return;
    }

    const touches = getNativeChangedTouches(event);
    const touch = touches.find((candidate, index) => getNativeTouchId(candidate, index) === this.nativeTouchId);
    if (!touch) {
      return;
    }

    this.updateFromNativeTouch(touch);
  }

  private onWechatNativeTouchEnd(event: NativeTouchEventLike): void {
    if (!this.nativeTouchActive || !hasNativeTouchId(event, this.nativeTouchId)) {
      return;
    }

    this.activeTouchId = null;
    this.nativeTouchId = null;
    this.nativeTouchActive = false;
    this.nativeMouseActive = false;
    this.resetStick();
  }

  private onWechatNativeMouseDown(event: NativeMouseEventLike): void {
    if (GameManager.instance?.isPaused()) {
      this.resetStick();
      return;
    }

    if (this.activeTouchId !== null || this.nativeMouseActive || !isNativeMouseInsideNode(this.node, event, this.wechatTouchApi)) {
      return;
    }

    this.activeTouchId = -2;
    this.nativeMouseActive = true;
    this.globalTouchActive = false;
    this.nativeTouchActive = false;
    this.nativeTouchId = null;
    this.updateFromNativeMouse(event);
  }

  private onWechatNativeMouseMove(event: NativeMouseEventLike): void {
    if (GameManager.instance?.isPaused()) {
      this.resetStick();
      return;
    }

    if (!this.nativeMouseActive) {
      return;
    }

    this.updateFromNativeMouse(event);
  }

  private onWechatNativeMouseUp(): void {
    if (!this.nativeMouseActive) {
      return;
    }

    this.activeTouchId = null;
    this.nativeMouseActive = false;
    this.resetStick();
  }

  private onMouseDown(event: EventMouse): void {
    if (GameManager.instance?.isPaused()) {
      this.resetStick();
      return;
    }

    if (this.activeTouchId !== null || this.mouseActive || !this.isMouseInsideNode(event)) {
      return;
    }

    this.activeTouchId = -1;
    this.mouseActive = true;
    this.globalTouchActive = false;
    this.nativeTouchActive = false;
    this.nativeMouseActive = false;
    this.nativeTouchId = null;
    this.updateFromMouse(event);
  }

  private onGlobalMouseMove(event: EventMouse): void {
    if (!this.mouseActive) {
      return;
    }

    this.updateFromMouse(event);
  }

  private onGlobalMouseUp(): void {
    if (!this.mouseActive) {
      return;
    }

    this.activeTouchId = null;
    this.mouseActive = false;
    this.resetStick();
  }

  private updateFromTouch(event: EventTouch): void {
    if (GameManager.instance?.isPaused()) {
      this.resetStick();
      return;
    }

    const transform = this.getComponent(UITransform);
    if (!transform) {
      return;
    }

    const uiLocation = event.getUILocation();
    const local = transform.convertToNodeSpaceAR(new Vec3(uiLocation.x, uiLocation.y, 0));
    this.applyStickFromLocalPoint(local);
  }

  private updateFromMouse(event: EventMouse): void {
    const location = event.getUILocation();
    this.updateFromUILocation(new Vec2(location.x, location.y));
  }

  private updateFromNativeTouch(touch: NativeTouchLike): void {
    const location = getNativeTouchUILocation(touch, this.wechatTouchApi);
    this.updateFromUILocation(location);
  }

  private updateFromNativeMouse(event: NativeMouseEventLike): void {
    const location = getNativeMouseUILocation(event, this.wechatTouchApi);
    this.updateFromUILocation(location);
  }

  private updateFromUILocation(uiLocation: Vec2): void {
    if (GameManager.instance?.isPaused()) {
      this.resetStick();
      return;
    }

    const transform = this.getComponent(UITransform);
    if (!transform) {
      return;
    }

    const local = transform.convertToNodeSpaceAR(new Vec3(uiLocation.x, uiLocation.y, 0));
    this.applyStickFromLocalPoint(local);
  }

  private applyStickFromLocalPoint(local: Readonly<Vec3>): void {
    const distance = Math.sqrt(local.x * local.x + local.y * local.y);
    const clampedDistance = Math.min(distance, this.maxRadius);
    if (distance > 0) {
      this.direction.set(local.x / distance, local.y / distance);
    } else {
      this.direction.set(0, 0);
    }

    this.knobPosition.set(this.direction.x * clampedDistance, this.direction.y * clampedDistance, 0);
    this.knob?.setPosition(this.knobPosition);

    if (clampedDistance <= this.deadzone) {
      this.axis.set(0, 0);
    } else {
      const normalizedStrength = (clampedDistance - this.deadzone) / Math.max(1, this.maxRadius - this.deadzone);
      // Keep direct-touch and native/UI-location drags on the same response
      // curve so WeChat runtime feel matches preview/headless checks.
      const responseExponent = Math.max(0.25, this.responseExponent);
      const adjustedStrength = Math.pow(normalizedStrength, responseExponent);
      this.axis.set(this.direction.x * adjustedStrength, this.direction.y * adjustedStrength);
    }

    this.player?.setMoveInput(this.axis.x, this.axis.y);
  }

  private isTouchInsideNode(event: EventTouch): boolean {
    const transform = this.getComponent(UITransform);
    if (!transform || !this.node.activeInHierarchy) {
      return false;
    }

    const location = event.getUILocation();
    return transform.getBoundingBoxToWorld().contains(new Vec2(location.x, location.y));
  }

  private isMouseInsideNode(event: EventMouse): boolean {
    const transform = this.getComponent(UITransform);
    if (!transform || !this.node.activeInHierarchy) {
      return false;
    }

    const location = event.getUILocation();
    return transform.getBoundingBoxToWorld().contains(new Vec2(location.x, location.y));
  }

  private resetStick(): void {
    this.axis.set(0, 0);
    this.knob?.setPosition(0, 0, 0);
    this.player?.setMoveInput(0, 0);
  }

  private bindTouchNodes(): void {
    this.unbindTouchNodes();

    // The draggable pixels are usually children (base ring / knob). Binding
    // them directly makes the simulator touch path match what players see.
    const nodes = [this.node, ...this.node.children].filter((node, index, all) => all.indexOf(node) === index);
    for (const node of nodes) {
      node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
      node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
      node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
      node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
      node.on(Node.EventType.MOUSE_DOWN, this.onMouseDown, this);
    }
    this.boundTouchNodes = nodes;
  }

  private unbindTouchNodes(): void {
    for (const node of this.boundTouchNodes) {
      node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
      node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
      node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
      node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
      node.off(Node.EventType.MOUSE_DOWN, this.onMouseDown, this);
    }
    this.boundTouchNodes = [];
  }

  private bindWechatNativeTouches(): void {
    this.unbindWechatNativeTouches();
    const api = getWechatTouchApi();
    if (!api) {
      return;
    }

    api.onTouchStart?.(this.boundWechatNativeTouchStart);
    api.onTouchMove?.(this.boundWechatNativeTouchMove);
    api.onTouchEnd?.(this.boundWechatNativeTouchEnd);
    api.onTouchCancel?.(this.boundWechatNativeTouchEnd);
    api.onMouseDown?.(this.boundWechatNativeMouseDown);
    api.onMouseMove?.(this.boundWechatNativeMouseMove);
    api.onMouseUp?.(this.boundWechatNativeMouseUp);
    this.wechatTouchApi = api;
  }

  private unbindWechatNativeTouches(): void {
    if (!this.wechatTouchApi) {
      return;
    }

    this.wechatTouchApi.offTouchStart?.(this.boundWechatNativeTouchStart);
    this.wechatTouchApi.offTouchMove?.(this.boundWechatNativeTouchMove);
    this.wechatTouchApi.offTouchEnd?.(this.boundWechatNativeTouchEnd);
    this.wechatTouchApi.offTouchCancel?.(this.boundWechatNativeTouchEnd);
    this.wechatTouchApi.offMouseDown?.(this.boundWechatNativeMouseDown);
    this.wechatTouchApi.offMouseMove?.(this.boundWechatNativeMouseMove);
    this.wechatTouchApi.offMouseUp?.(this.boundWechatNativeMouseUp);
    this.wechatTouchApi = null;
  }
}
