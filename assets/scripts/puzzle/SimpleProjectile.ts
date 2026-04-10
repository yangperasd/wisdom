import { _decorator, AudioClip, Collider2D, Component, Contact2DType, IPhysics2DContact, Node, SpriteFrame, Vec3 } from 'cc';
import { playTransientClipAtNode } from '../audio/TransientAudio';
import { GameManager } from '../core/GameManager';
import { applySpriteFrameToPlaceholderVisual, setPlaceholderLabelVisible } from '../visual/SpriteVisualSkin';

const { ccclass, property } = _decorator;

@ccclass('SimpleProjectile')
export class SimpleProjectile extends Component {
  @property
  speed = 260;

  @property
  maxLifetime = 2;

  @property
  destroyOnAnyContact = true;

  @property
  ignoreNodeNameIncludes = '';

  @property
  destroyOnNodeNameIncludes = 'Player';

  @property(Node)
  visualRoot: Node | null = null;

  @property(SpriteFrame)
  visualSpriteFrame: SpriteFrame | null = null;

  @property(AudioClip)
  impactClip: AudioClip | null = null;

  @property
  impactClipVolume = 1;

  @property
  hideLabelWhenSkinned = true;

  @property
  rotateToDirection = true;

  private direction = new Vec3(1, 0, 0);
  private elapsed = 0;
  private collider: Collider2D | null = null;

  protected onLoad(): void {
    applySpriteFrameToPlaceholderVisual(this.visualRoot ?? this.node, this.visualSpriteFrame);
    setPlaceholderLabelVisible(this.node, !this.hideLabelWhenSkinned || !this.visualSpriteFrame);
    this.collider = this.getComponent(Collider2D);
    this.collider?.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
  }

  protected onDestroy(): void {
    this.collider?.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
  }

  protected update(dt: number): void {
    if (GameManager.instance?.isPaused()) {
      return;
    }

    this.elapsed += dt;
    if (this.elapsed >= this.maxLifetime) {
      this.node.destroy();
      return;
    }

    const next = this.node.position.clone();
    next.x += this.direction.x * this.speed * dt;
    next.y += this.direction.y * this.speed * dt;
    this.node.setPosition(next);
  }

  public launch(direction: Readonly<Vec3>): void {
    this.direction.set(direction.x, direction.y, 0);
    if (this.direction.lengthSqr() > 0) {
      this.direction.normalize();
    }

    if (this.rotateToDirection) {
      const targetNode = this.visualRoot ?? this.node;
      const angleDegrees = Math.atan2(this.direction.y, this.direction.x) * 180 / Math.PI;
      targetNode.setRotationFromEuler(0, 0, angleDegrees);
    }
  }

  private onBeginContact(_self: Collider2D, other: Collider2D, _contact?: IPhysics2DContact | null): void {
    if (this.ignoreNodeNameIncludes && other.node.name.includes(this.ignoreNodeNameIncludes)) {
      return;
    }

    if (this.destroyOnAnyContact || !this.destroyOnNodeNameIncludes || other.node.name.includes(this.destroyOnNodeNameIncludes)) {
      playTransientClipAtNode(this.node, this.impactClip, this.impactClipVolume, 'ProjectileImpact');
      this.node.destroy();
    }
  }
}
