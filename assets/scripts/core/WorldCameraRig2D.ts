import { _decorator, Color, Component, Node, UITransform, Vec3, view } from 'cc';
import { GameManager } from './GameManager';
import { RectVisual } from '../visual/RectVisual';

const { ccclass, property } = _decorator;
const WORLD_BOUNDS_FRAME_NAME = 'WorldBoundsFrame';

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

  @property
  showWorldBoundsFrame = true;

  @property
  boundsFramePadding = 0;

  protected start(): void {
    this.enforceTargetBounds();
    this.snapToTarget();
    this.refreshWorldBoundsFrame();
    view.on('canvas-resize', this.onViewBoundsChanged, this);
    view.on('design-resolution-changed', this.onViewBoundsChanged, this);
  }

  protected onEnable(): void {
    this.enforceTargetBounds();
    this.refreshWorldBoundsFrame();
  }

  protected onDisable(): void {
    view.off('canvas-resize', this.onViewBoundsChanged, this);
    view.off('design-resolution-changed', this.onViewBoundsChanged, this);
  }

  protected lateUpdate(dt: number): void {
    if (GameManager.instance?.isPaused()) {
      return;
    }

    if (!this.target) {
      return;
    }

    this.enforceTargetBounds();
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

    this.enforceTargetBounds();
    this.node.setPosition(
      this.clamp(-this.target.position.x + this.offsetX, this.minRigX, this.maxRigX),
      this.clamp(-this.target.position.y + this.offsetY, this.minRigY, this.maxRigY),
      this.node.position.z,
    );
  }

  public clampTargetPosition(position: Vec3): Vec3 {
    const bounds = this.getTargetBounds();
    position.x = this.clamp(position.x, bounds.minX, bounds.maxX);
    position.y = this.clamp(position.y, bounds.minY, bounds.maxY);
    return position;
  }

  public getTargetBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    const visibleSize = view.getVisibleSize();
    const halfWidth = visibleSize.width * 0.5;
    const halfHeight = visibleSize.height * 0.5;
    const padding = Math.max(0, this.boundsFramePadding);
    return {
      minX: -halfWidth - this.maxRigX + padding,
      maxX: halfWidth - this.minRigX - padding,
      minY: -halfHeight - this.maxRigY + padding,
      maxY: halfHeight - this.minRigY - padding,
    };
  }

  private onViewBoundsChanged(): void {
    this.enforceTargetBounds();
    this.refreshWorldBoundsFrame();
    this.snapToTarget();
  }

  private enforceTargetBounds(): void {
    if (!this.target?.isValid) {
      return;
    }

    const clampedPosition = this.target.position.clone();
    this.clampTargetPosition(clampedPosition);
    if (clampedPosition.equals(this.target.position)) {
      return;
    }

    this.target.setPosition(clampedPosition);
  }

  private refreshWorldBoundsFrame(): void {
    const existing = this.node.getChildByName(WORLD_BOUNDS_FRAME_NAME);
    if (!this.showWorldBoundsFrame) {
      if (existing?.isValid) {
        existing.active = false;
      }
      return;
    }

    const bounds = this.getTargetBounds();
    const width = Math.max(1, bounds.maxX - bounds.minX);
    const height = Math.max(1, bounds.maxY - bounds.minY);
    const centerX = (bounds.minX + bounds.maxX) * 0.5;
    const centerY = (bounds.minY + bounds.maxY) * 0.5;

    const frameNode = existing?.isValid ? existing : new Node(WORLD_BOUNDS_FRAME_NAME);
    if (!frameNode.parent) {
      frameNode.layer = this.node.layer;
      this.node.addChild(frameNode);
    }

    frameNode.active = true;
    frameNode.layer = this.node.layer;
    frameNode.setSiblingIndex(Math.max(0, this.node.children.length - 1));
    frameNode.setPosition(centerX, centerY, 0);

    const transform = frameNode.getComponent(UITransform) ?? frameNode.addComponent(UITransform);
    transform.setContentSize(width, height);

    const visual = frameNode.getComponent(RectVisual) ?? frameNode.addComponent(RectVisual);
    visual.drawFill = false;
    visual.drawStroke = true;
    visual.strokeWidth = 8;
    visual.cornerRadius = 30;
    visual.strokeColor = new Color(84, 170, 160, 228);
    visual.outerGlow = 0.22;
    visual.outerGlowColor = new Color(248, 233, 176, 122);
    visual.requestRedraw();
  }

  private clamp(value: number, min: number, max: number): number {
    if (min > max) {
      return value;
    }

    return Math.max(min, Math.min(max, value));
  }
}
