import { _decorator, Component, Node } from 'cc';
import { GameManager } from './GameManager';

const { ccclass, property } = _decorator;

@ccclass('WorldCameraRig2D')
export class WorldCameraRig2D extends Component {
  @property(Node)
  target: Node | null = null;

  @property
  followSharpness = 10;

  @property
  offsetX = 0;

  @property
  offsetY = 0;

  @property
  minRigX = -220;

  @property
  maxRigX = 260;

  @property
  minRigY = -100;

  @property
  maxRigY = 120;

  protected start(): void {
    this.snapToTarget();
  }

  protected lateUpdate(dt: number): void {
    if (GameManager.instance?.isPaused()) {
      return;
    }

    if (!this.target) {
      return;
    }

    const desiredX = this.clamp(-this.target.position.x + this.offsetX, this.minRigX, this.maxRigX);
    const desiredY = this.clamp(-this.target.position.y + this.offsetY, this.minRigY, this.maxRigY);
    const blend = 1 - Math.exp(-Math.max(0, this.followSharpness) * dt);

    const next = this.node.position.clone();
    next.x += (desiredX - next.x) * blend;
    next.y += (desiredY - next.y) * blend;
    this.node.setPosition(next);
  }

  public snapToTarget(): void {
    if (!this.target) {
      return;
    }

    this.node.setPosition(
      this.clamp(-this.target.position.x + this.offsetX, this.minRigX, this.maxRigX),
      this.clamp(-this.target.position.y + this.offsetY, this.minRigY, this.maxRigY),
      this.node.position.z,
    );
  }

  private clamp(value: number, min: number, max: number): number {
    if (min > max) {
      return value;
    }

    return Math.max(min, Math.min(max, value));
  }
}
