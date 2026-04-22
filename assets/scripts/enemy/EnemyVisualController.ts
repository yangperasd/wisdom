import { _decorator, Component, Node, SpriteFrame, Texture2D } from 'cc';
import { HEALTH_EVENT_DAMAGED, HEALTH_EVENT_DEPLETED, HealthComponent } from '../combat/HealthComponent';
import { EnemyAI, EnemyState } from './EnemyAI';
import {
  applySpriteFrameToPlaceholderVisual,
  destroyGeneratedSpriteFrames,
  resolveTextureBackedSpriteFrame,
  setPlaceholderLabelVisible,
  setPlaceholderVisualFlipX,
} from '../visual/SpriteVisualSkin';

const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('EnemyVisualController')
@executeInEditMode
export class EnemyVisualController extends Component {
  @property(EnemyAI)
  enemyAI: EnemyAI | null = null;

  @property(HealthComponent)
  health: HealthComponent | null = null;

  @property(Node)
  visualRoot: Node | null = null;

  @property(SpriteFrame)
  idleSpriteFrame: SpriteFrame | null = null;

  @property(Texture2D)
  idleTexture: Texture2D | null = null;

  @property(SpriteFrame)
  patrolSpriteFrame: SpriteFrame | null = null;

  @property(Texture2D)
  patrolTexture: Texture2D | null = null;

  @property(SpriteFrame)
  chaseSpriteFrame: SpriteFrame | null = null;

  @property(Texture2D)
  chaseTexture: Texture2D | null = null;

  @property(SpriteFrame)
  hurtSpriteFrame: SpriteFrame | null = null;

  @property(Texture2D)
  hurtTexture: Texture2D | null = null;

  @property(SpriteFrame)
  defeatedSpriteFrame: SpriteFrame | null = null;

  @property(Texture2D)
  defeatedTexture: Texture2D | null = null;

  @property
  hurtFlashSeconds = 0.18;

  @property
  hideLabelWhenSkinned = true;

  @property
  mirrorFacing = true;

  private hurtTimer = 0;
  private defeated = false;
  private lastFrame: SpriteFrame | null = null;
  private lastFlipX = false;
  private lastLabelVisible = true;
  private readonly generatedFrames = new Map<string, SpriteFrame>();

  protected onLoad(): void {
    this.resolveHealth()?.events?.on(HEALTH_EVENT_DAMAGED, this.onDamaged, this);
    this.resolveHealth()?.events?.on(HEALTH_EVENT_DEPLETED, this.onDepleted, this);
    this.applyVisualState(true);
  }

  protected onEnable(): void {
    this.applyVisualState(true);
  }

  protected onValidate(): void {
    this.applyVisualState(true);
  }

  protected onDestroy(): void {
    this.resolveHealth()?.events?.off(HEALTH_EVENT_DAMAGED, this.onDamaged, this);
    this.resolveHealth()?.events?.off(HEALTH_EVENT_DEPLETED, this.onDepleted, this);
    destroyGeneratedSpriteFrames(this.generatedFrames);
  }

  protected update(dt: number): void {
    if (this.hurtTimer > 0) {
      this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    }

    if (!this.defeated && (this.resolveHealth()?.getCurrentHealth() ?? 1) <= 0) {
      this.defeated = true;
    }

    this.applyVisualState();
  }

  private onDamaged(): void {
    this.hurtTimer = Math.max(this.hurtTimer, this.hurtFlashSeconds);
    this.applyVisualState(true);
  }

  private onDepleted(): void {
    this.defeated = true;
    this.hurtTimer = 0;
    this.applyVisualState(true);
  }

  private applyVisualState(force = false): void {
    const targetNode = this.visualRoot ?? this.node;
    const nextFrame = this.selectFrame();
    const nextLabelVisible = !this.hideLabelWhenSkinned || !nextFrame;
    const facing = this.enemyAI?.getFacingDirection();
    const nextFlipX = this.mirrorFacing && !!facing && facing.x < -0.001;

    if (force || this.lastFrame !== nextFrame) {
      applySpriteFrameToPlaceholderVisual(targetNode, nextFrame);
      this.lastFrame = nextFrame;
    }

    if (force || this.lastLabelVisible !== nextLabelVisible) {
      setPlaceholderLabelVisible(targetNode, nextLabelVisible);
      this.lastLabelVisible = nextLabelVisible;
    }

    if (force || this.lastFlipX !== nextFlipX) {
      setPlaceholderVisualFlipX(targetNode, nextFlipX);
      this.lastFlipX = nextFlipX;
    }
  }

  private selectFrame(): SpriteFrame | null {
    if (this.defeated) {
      return this.getConfiguredFrame('defeated', this.defeatedSpriteFrame, this.defeatedTexture)
        ?? this.getConfiguredFrame('hurt', this.hurtSpriteFrame, this.hurtTexture)
        ?? this.getConfiguredFrame('idle', this.idleSpriteFrame, this.idleTexture)
        ?? this.getConfiguredFrame('patrol', this.patrolSpriteFrame, this.patrolTexture)
        ?? this.getConfiguredFrame('chase', this.chaseSpriteFrame, this.chaseTexture);
    }

    if (this.hurtTimer > 0) {
      return this.getConfiguredFrame('hurt', this.hurtSpriteFrame, this.hurtTexture)
        ?? this.getConfiguredFrame('chase', this.chaseSpriteFrame, this.chaseTexture)
        ?? this.getConfiguredFrame('patrol', this.patrolSpriteFrame, this.patrolTexture)
        ?? this.getConfiguredFrame('idle', this.idleSpriteFrame, this.idleTexture);
    }

    switch (this.enemyAI?.getState() ?? EnemyState.Idle) {
      case EnemyState.Chase:
        return this.getConfiguredFrame('chase', this.chaseSpriteFrame, this.chaseTexture)
          ?? this.getConfiguredFrame('patrol', this.patrolSpriteFrame, this.patrolTexture)
          ?? this.getConfiguredFrame('idle', this.idleSpriteFrame, this.idleTexture);
      case EnemyState.Patrol:
        return this.getConfiguredFrame('patrol', this.patrolSpriteFrame, this.patrolTexture)
          ?? this.getConfiguredFrame('idle', this.idleSpriteFrame, this.idleTexture)
          ?? this.getConfiguredFrame('chase', this.chaseSpriteFrame, this.chaseTexture);
      default:
        return this.getConfiguredFrame('idle', this.idleSpriteFrame, this.idleTexture)
          ?? this.getConfiguredFrame('patrol', this.patrolSpriteFrame, this.patrolTexture)
          ?? this.getConfiguredFrame('chase', this.chaseSpriteFrame, this.chaseTexture);
    }
  }

  private resolveHealth(): HealthComponent | null {
    return this.health ?? this.node.getComponent(HealthComponent);
  }

  private getConfiguredFrame(
    cacheKey: string,
    spriteFrame: SpriteFrame | null,
    texture: Texture2D | null,
  ): SpriteFrame | null {
    return spriteFrame ?? resolveTextureBackedSpriteFrame(this.generatedFrames, cacheKey, texture);
  }
}
