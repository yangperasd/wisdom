import { _decorator, Component, Node, SpriteFrame, Texture2D } from 'cc';
import { HEALTH_EVENT_DAMAGED, HealthComponent } from '../combat/HealthComponent';
import { PLAYER_EVENT_RESPAWNED, PlayerController } from './PlayerController';
import {
  applySpriteFrameToPlaceholderVisual,
  destroyGeneratedSpriteFrames,
  resolveTextureBackedSpriteFrame,
  setPlaceholderLabelVisible,
  setPlaceholderVisualFlipX,
} from '../visual/SpriteVisualSkin';

const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('PlayerVisualController')
@executeInEditMode
export class PlayerVisualController extends Component {
  @property(PlayerController)
  player: PlayerController | null = null;

  @property(HealthComponent)
  health: HealthComponent | null = null;

  @property(Node)
  visualRoot: Node | null = null;

  @property(SpriteFrame)
  idleSpriteFrame: SpriteFrame | null = null;

  @property(Texture2D)
  idleTexture: Texture2D | null = null;

  @property(SpriteFrame)
  moveSpriteFrame: SpriteFrame | null = null;

  @property(Texture2D)
  moveTexture: Texture2D | null = null;

  @property(SpriteFrame)
  attackSpriteFrame: SpriteFrame | null = null;

  @property(Texture2D)
  attackTexture: Texture2D | null = null;

  @property(SpriteFrame)
  launchSpriteFrame: SpriteFrame | null = null;

  @property(Texture2D)
  launchTexture: Texture2D | null = null;

  @property(SpriteFrame)
  hurtSpriteFrame: SpriteFrame | null = null;

  @property(Texture2D)
  hurtTexture: Texture2D | null = null;

  @property
  hurtFlashSeconds = 0.18;

  @property
  hideLabelWhenSkinned = true;

  @property
  mirrorFacing = true;

  private hurtTimer = 0;
  private lastFrame: SpriteFrame | null = null;
  private lastFlipX = false;
  private lastLabelVisible = true;
  private readonly generatedFrames = new Map<string, SpriteFrame>();

  protected onLoad(): void {
    this.resolveHealth()?.events.on(HEALTH_EVENT_DAMAGED, this.onDamaged, this);
    this.player?.events.on(PLAYER_EVENT_RESPAWNED, this.onRespawned, this);
    this.applyVisualState(true);
  }

  protected onEnable(): void {
    this.applyVisualState(true);
  }

  protected onValidate(): void {
    this.applyVisualState(true);
  }

  protected onDestroy(): void {
    this.resolveHealth()?.events.off(HEALTH_EVENT_DAMAGED, this.onDamaged, this);
    this.player?.events.off(PLAYER_EVENT_RESPAWNED, this.onRespawned, this);
    destroyGeneratedSpriteFrames(this.generatedFrames);
  }

  protected update(dt: number): void {
    if (this.hurtTimer > 0) {
      this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    }

    this.applyVisualState();
  }

  private onDamaged(): void {
    this.hurtTimer = Math.max(this.hurtTimer, this.hurtFlashSeconds);
    this.applyVisualState(true);
  }

  private onRespawned(): void {
    this.hurtTimer = 0;
    this.applyVisualState(true);
  }

  private applyVisualState(force = false): void {
    const targetNode = this.visualRoot ?? this.node;
    const nextFrame = this.selectFrame();
    const nextLabelVisible = !this.hideLabelWhenSkinned || !nextFrame;
    const facing = this.player?.getFacingDirection();
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
    const player = this.player;
    if (!player) {
      return this.getConfiguredFrame('idle', this.idleSpriteFrame, this.idleTexture)
        ?? this.getConfiguredFrame('move', this.moveSpriteFrame, this.moveTexture);
    }

    if (this.hurtTimer > 0) {
      return this.getConfiguredFrame('hurt', this.hurtSpriteFrame, this.hurtTexture)
        ?? this.getConfiguredFrame('attack', this.attackSpriteFrame, this.attackTexture)
        ?? this.getConfiguredFrame('launch', this.launchSpriteFrame, this.launchTexture)
        ?? this.getConfiguredFrame('move', this.moveSpriteFrame, this.moveTexture)
        ?? this.getConfiguredFrame('idle', this.idleSpriteFrame, this.idleTexture);
    }

    if (player.isAttacking()) {
      return this.getConfiguredFrame('attack', this.attackSpriteFrame, this.attackTexture)
        ?? this.getConfiguredFrame('move', this.moveSpriteFrame, this.moveTexture)
        ?? this.getConfiguredFrame('idle', this.idleSpriteFrame, this.idleTexture);
    }

    if (player.isForcedMoving()) {
      return this.getConfiguredFrame('launch', this.launchSpriteFrame, this.launchTexture)
        ?? this.getConfiguredFrame('move', this.moveSpriteFrame, this.moveTexture)
        ?? this.getConfiguredFrame('idle', this.idleSpriteFrame, this.idleTexture);
    }

    if (player.isMoving()) {
      return this.getConfiguredFrame('move', this.moveSpriteFrame, this.moveTexture)
        ?? this.getConfiguredFrame('idle', this.idleSpriteFrame, this.idleTexture);
    }

    return this.getConfiguredFrame('idle', this.idleSpriteFrame, this.idleTexture)
      ?? this.getConfiguredFrame('move', this.moveSpriteFrame, this.moveTexture);
  }

  private resolveHealth(): HealthComponent | null {
    return this.health ?? this.player?.health ?? null;
  }

  private getConfiguredFrame(
    cacheKey: string,
    spriteFrame: SpriteFrame | null,
    texture: Texture2D | null,
  ): SpriteFrame | null {
    return spriteFrame ?? resolveTextureBackedSpriteFrame(this.generatedFrames, cacheKey, texture);
  }
}
