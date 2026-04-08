import { _decorator, Component, Label, Node, Vec3 } from 'cc';
import { HealthComponent } from '../combat/HealthComponent';
import { GameManager } from '../core/GameManager';
import { BreakableTarget } from '../puzzle/BreakableTarget';

const { ccclass, property } = _decorator;

@ccclass('BombBugFuse')
export class BombBugFuse extends Component {
  @property
  fuseSeconds = 1.35;

  @property
  explosionRadius = 120;

  @property
  damage = 1;

  @property
  damagePlayer = true;

  @property
  damageEnemies = true;

  @property
  showCountdown = true;

  private elapsed = 0;
  private exploded = false;
  private label: Label | null = null;

  protected onLoad(): void {
    this.label = this.getComponent(Label);
    this.refreshLabel();
  }

  protected update(dt: number): void {
    if (GameManager.instance?.isPaused()) {
      return;
    }

    if (this.exploded) {
      return;
    }

    this.elapsed += dt;
    this.refreshLabel();

    if (this.elapsed >= this.fuseSeconds) {
      this.explode();
    }
  }

  public explode(): void {
    if (this.exploded) {
      return;
    }

    this.exploded = true;
    const origin = this.node.worldPosition.clone();
    const scene = this.node.scene;
    if (scene) {
      this.visitNode(scene, (target) => this.applyExplosionToNode(target, origin));
    }

    this.node.destroy();
  }

  private refreshLabel(): void {
    if (!this.label || !this.showCountdown) {
      return;
    }

    const remaining = Math.max(0, this.fuseSeconds - this.elapsed);
    this.label.string = `Bomb ${remaining.toFixed(1)}`;
  }

  private applyExplosionToNode(target: Node, origin: Readonly<Vec3>): void {
    if (
      !target.isValid ||
      !target.activeInHierarchy ||
      target === this.node ||
      Vec3.distance(target.worldPosition, origin) > this.explosionRadius
    ) {
      return;
    }

    target.getComponent(BreakableTarget)?.applyExplosion(origin);

    const health = target.getComponent(HealthComponent);
    if (!health || !this.canDamageNode(target)) {
      return;
    }

    health.applyDamage(this.damage);
  }

  private canDamageNode(node: Node): boolean {
    if (node.name.includes('Player')) {
      return this.damagePlayer;
    }

    if (node.name.includes('Enemy')) {
      return this.damageEnemies;
    }

    return false;
  }

  private visitNode(root: Node, visitor: (node: Node) => void): void {
    visitor(root);

    for (const child of root.children) {
      this.visitNode(child, visitor);
    }
  }
}
