import { _decorator, Component, EventTouch, Node, UITransform, Vec2, Vec3 } from 'cc';
import { GameManager } from '../core/GameManager';
import { PlayerController } from '../player/PlayerController';

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

  private activeTouchId: number | null = null;
  private axis = new Vec2();
  private readonly direction = new Vec2();
  private readonly knobPosition = new Vec3();

  protected onEnable(): void {
    this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
    this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
  }

  protected onDisable(): void {
    this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
    this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    this.resetStick();
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
      this.axis.set(this.direction.x * normalizedStrength, this.direction.y * normalizedStrength);
    }

    this.player?.setMoveInput(this.axis.x, this.axis.y);
  }

  private resetStick(): void {
    this.axis.set(0, 0);
    this.knob?.setPosition(0, 0, 0);
    this.player?.setMoveInput(0, 0);
  }
}
