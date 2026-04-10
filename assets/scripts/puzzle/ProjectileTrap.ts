import { _decorator, AudioClip, Component, instantiate, Node, Prefab, SpriteFrame, Vec3 } from 'cc';
import { playTransientClipAtNode } from '../audio/TransientAudio';
import { GameManager } from '../core/GameManager';
import { GAME_EVENT_RESPAWN_REQUESTED } from '../core/GameTypes';
import { applySpriteFrameToPlaceholderVisual, setPlaceholderLabelVisible } from '../visual/SpriteVisualSkin';
import { SimpleProjectile } from './SimpleProjectile';

const { ccclass, property } = _decorator;

@ccclass('ProjectileTrap')
export class ProjectileTrap extends Component {
  @property(Prefab)
  projectilePrefab: Prefab | null = null;

  @property(Node)
  spawnPoint: Node | null = null;

  @property
  intervalSeconds = 1.2;

  @property
  directionX = 1;

  @property
  directionY = 0;

  @property
  autoStart = true;

  @property(SpriteFrame)
  visualSpriteFrame: SpriteFrame | null = null;

  @property(AudioClip)
  fireClip: AudioClip | null = null;

  @property
  fireClipVolume = 1;

  @property
  hideLabelWhenSkinned = true;

  private timer = 0;
  private spawnedProjectiles: Node[] = [];

  protected onLoad(): void {
    applySpriteFrameToPlaceholderVisual(this.node, this.visualSpriteFrame);
    setPlaceholderLabelVisible(this.node, !this.hideLabelWhenSkinned || !this.visualSpriteFrame);
  }

  protected onEnable(): void {
    GameManager.instance?.events.on(GAME_EVENT_RESPAWN_REQUESTED, this.resetTrap, this);
  }

  protected onDisable(): void {
    GameManager.instance?.events.off(GAME_EVENT_RESPAWN_REQUESTED, this.resetTrap, this);
  }

  protected update(dt: number): void {
    if (GameManager.instance?.isPaused()) {
      return;
    }

    if (!this.autoStart || !this.projectilePrefab) {
      return;
    }

    this.timer += dt;
    if (this.timer < this.intervalSeconds) {
      return;
    }

    this.timer = 0;
    this.fire();
    this.cleanupDestroyedProjectiles();
  }

  public fire(): void {
    if (!this.projectilePrefab) {
      return;
    }

    const projectile = instantiate(this.projectilePrefab);
    projectile.setParent(this.node.parent ?? this.node.scene);
    projectile.setWorldPosition(this.spawnPoint?.worldPosition ?? this.node.worldPosition);

    const projectileComponent = projectile.getComponent(SimpleProjectile);
    projectileComponent?.launch(new Vec3(this.directionX, this.directionY, 0));
    playTransientClipAtNode(this.node, this.fireClip, this.fireClipVolume, 'TrapFire');
    this.spawnedProjectiles.push(projectile);
  }

  public resetTrap(): void {
    this.timer = 0;
    for (const projectile of this.spawnedProjectiles) {
      if (projectile.isValid) {
        projectile.destroy();
      }
    }

    this.spawnedProjectiles.length = 0;
  }

  private cleanupDestroyedProjectiles(): void {
    this.spawnedProjectiles = this.spawnedProjectiles.filter((node) => node.isValid);
  }
}
