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
const PLAYER_VISIBILITY_HALO_NAME = 'PlayerVisibilityHalo';
const PLAYER_VISIBILITY_BADGE_NAME = 'PlayerVisibilityBadge';
const PLAYER_LEGACY_LOCATOR_BADGE_NAME = 'PlayerLocatorBadge';
const PLAYER_BACKGROUND_LAYER_NAME_PATTERN = /(?:Backdrop|Lane|Zone|Strip|Glow)$/i;
const PLAYER_BACKGROUND_ACCENT_NAME_PATTERN = /Accent-\d+$/i;

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
  private lastKnownWorldSiblingCount = -1;
  private lastResolvedWorldSiblingIndex = -1;
  private readonly generatedFrames = new Map<string, SpriteFrame>();

  protected onLoad(): void {
    this.resolveHealth()?.events?.on(HEALTH_EVENT_DAMAGED, this.onDamaged, this);
    this.player?.events?.on(PLAYER_EVENT_RESPAWNED, this.onRespawned, this);
    this.removeVisibilityMarkers();
    this.applyVisualState(true);
  }

  protected onEnable(): void {
    this.removeVisibilityMarkers();
    this.applyVisualState(true);
  }

  protected onValidate(): void {
    this.removeVisibilityMarkers();
    this.applyVisualState(true);
  }

  protected onDestroy(): void {
    this.resolveHealth()?.events?.off(HEALTH_EVENT_DAMAGED, this.onDamaged, this);
    this.player?.events?.off(PLAYER_EVENT_RESPAWNED, this.onRespawned, this);
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
    this.keepPlayerVisibleInWorldOrder(true);
    this.applyVisualState(true);
  }

  private applyVisualState(force = false): void {
    const targetNode = this.visualRoot ?? this.node;
    this.keepPlayerVisibleInWorldOrder(force);
    this.hideLegacyLocatorBadge();
    this.removeVisibilityMarkers();
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

  private removeVisibilityMarkers(): void {
    const targetNode = this.visualRoot ?? this.node;
    if (!targetNode?.isValid) {
      return;
    }

    this.destroyMarker(targetNode.getChildByName(PLAYER_VISIBILITY_HALO_NAME));
    if (targetNode !== this.node) {
      this.destroyMarker(targetNode.getChildByName(PLAYER_VISIBILITY_BADGE_NAME));
    }
    this.destroyMarker(this.node.getChildByName(PLAYER_VISIBILITY_BADGE_NAME));
  }

  private destroyMarker(node: Node | null): void {
    if (!node?.isValid) {
      return;
    }
    node.removeFromParent();
    node.destroy();
  }

  private keepPlayerVisibleInWorldOrder(force = false): void {
    const parent = this.node.parent;
    if (!parent?.isValid) {
      return;
    }

    const currentSiblingIndex = this.node.getSiblingIndex();
    if (
      !force &&
      parent.children.length === this.lastKnownWorldSiblingCount &&
      currentSiblingIndex === this.lastResolvedWorldSiblingIndex
    ) {
      return;
    }

    const siblings = parent.children.filter((child) => child !== this.node && child?.isValid);
    let lastBackgroundSiblingIndex = -1;
    siblings.forEach((child, siblingIndex) => {
      if (this.isBackgroundSibling(child.name)) {
        lastBackgroundSiblingIndex = siblingIndex;
      }
    });

    if (lastBackgroundSiblingIndex < 0) {
      this.lastKnownWorldSiblingCount = parent.children.length;
      this.lastResolvedWorldSiblingIndex = currentSiblingIndex;
      return;
    }

    const desiredSiblingIndex = Math.min(
      parent.children.length - 1,
      lastBackgroundSiblingIndex + 1,
    );

    if (currentSiblingIndex !== desiredSiblingIndex) {
      this.node.setSiblingIndex(desiredSiblingIndex);
    }

    this.lastKnownWorldSiblingCount = parent.children.length;
    this.lastResolvedWorldSiblingIndex = this.node.getSiblingIndex();
  }

  private hideLegacyLocatorBadge(): void {
    const legacyBadge = this.node.getChildByName(PLAYER_LEGACY_LOCATOR_BADGE_NAME);
    if (legacyBadge?.isValid) {
      legacyBadge.active = false;
    }
  }

  private isBackgroundSibling(name: string): boolean {
    return PLAYER_BACKGROUND_LAYER_NAME_PATTERN.test(name) || PLAYER_BACKGROUND_ACCENT_NAME_PATTERN.test(name);
  }
}
