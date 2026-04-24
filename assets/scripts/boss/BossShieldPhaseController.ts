import { _decorator, Color, Component, Node } from 'cc';
import { DamageOnContact } from '../combat/DamageOnContact';
import { HEALTH_EVENT_DEPLETED, HealthComponent } from '../combat/HealthComponent';
import { GameManager } from '../core/GameManager';
import { GAME_EVENT_RESPAWN_REQUESTED } from '../core/GameTypes';
import { EnemyAI } from '../enemy/EnemyAI';
import { BREAKABLE_EVENT_BROKEN, BREAKABLE_EVENT_RESET, BreakableTarget } from '../puzzle/BreakableTarget';
import { RectVisual } from '../visual/RectVisual';

const { ccclass, property } = _decorator;

@ccclass('BossShieldPhaseController')
export class BossShieldPhaseController extends Component {
  @property(BreakableTarget)
  shieldTarget: BreakableTarget | null = null;

  @property(HealthComponent)
  bossHealth: HealthComponent | null = null;

  @property(EnemyAI)
  bossAI: EnemyAI | null = null;

  @property(DamageOnContact)
  bossContactDamage: DamageOnContact | null = null;

  @property
  vulnerableSeconds = 3.2;

  @property
  dangerMoveSpeed = 84;

  @property
  vulnerableMoveSpeed = 22;

  @property([Node])
  activateWhenShieldBroken: Node[] = [];

  @property([Node])
  deactivateWhenShieldBroken: Node[] = [];

  @property([Node])
  activateWhenDanger: Node[] = [];

  @property([Node])
  activateWhenVulnerable: Node[] = [];

  @property
  simplifyPlaceholderVisuals = true;

  private vulnerableTimer = 0;
  private placeholderVisualsSimplified = false;

  protected onLoad(): void {
    const shieldTarget = this.getShieldTarget();
    shieldTarget?.events?.on(BREAKABLE_EVENT_BROKEN, this.onShieldBroken, this);
    shieldTarget?.events?.on(BREAKABLE_EVENT_RESET, this.refreshState, this);
    this.bossHealth?.events?.on(HEALTH_EVENT_DEPLETED, this.onBossDepleted, this);
    this.refreshState();
    this.applyPlaceholderVisuals(true);
  }

  protected onEnable(): void {
    GameManager.instance?.events?.on(GAME_EVENT_RESPAWN_REQUESTED, this.onRespawnRequested, this);
  }

  protected update(dt: number): void {
    if (GameManager.instance?.isPaused()) {
      return;
    }

    if (this.vulnerableTimer <= 0) {
      return;
    }

    this.vulnerableTimer = Math.max(0, this.vulnerableTimer - dt);
    if (this.vulnerableTimer > 0) {
      return;
    }

    const shieldTarget = this.getShieldTarget();
    if (this.isShieldBroken(shieldTarget) && this.isBossAlive()) {
      shieldTarget?.resetState();
      return;
    }

    this.refreshState();
  }

  protected onDisable(): void {
    GameManager.instance?.events?.off(GAME_EVENT_RESPAWN_REQUESTED, this.onRespawnRequested, this);
  }

  protected onDestroy(): void {
    const shieldTarget = this.getShieldTarget();
    shieldTarget?.events?.off(BREAKABLE_EVENT_BROKEN, this.onShieldBroken, this);
    shieldTarget?.events?.off(BREAKABLE_EVENT_RESET, this.refreshState, this);
    this.bossHealth?.events?.off(HEALTH_EVENT_DEPLETED, this.onBossDepleted, this);
  }

  private onShieldBroken(): void {
    this.vulnerableTimer = Math.max(0, this.vulnerableSeconds);
    this.refreshState();
  }

  private onBossDepleted(): void {
    this.vulnerableTimer = 0;
    this.refreshState();
  }

  private onRespawnRequested(): void {
    this.vulnerableTimer = 0;
    this.refreshState();
  }

  private refreshState(): void {
    const isVulnerable = this.isDamageWindowOpen();
    const isDanger = this.isBossAlive() && !isVulnerable;
    this.bossHealth?.setDamageAcceptance(isVulnerable);

    if (this.bossAI) {
      this.bossAI.enabled = this.isBossAlive();
      this.bossAI.moveSpeed = isVulnerable ? this.vulnerableMoveSpeed : this.dangerMoveSpeed;
    }

    if (this.bossContactDamage) {
      this.bossContactDamage.enabled = isDanger;
    }

    for (const node of this.activateWhenShieldBroken) {
      if (node?.isValid) {
        node.active = isVulnerable;
      }
    }

    for (const node of this.deactivateWhenShieldBroken) {
      if (node?.isValid) {
        node.active = isDanger;
      }
    }

    for (const node of this.activateWhenDanger) {
      if (node?.isValid) {
        node.active = isDanger;
      }
    }

    for (const node of this.activateWhenVulnerable) {
      if (node?.isValid) {
        node.active = isVulnerable;
      }
    }
  }

  public isBossAlive(): boolean {
    return (this.bossHealth?.getCurrentHealth() ?? 0) > 0;
  }

  public isDamageWindowOpen(): boolean {
    if (!this.isBossAlive() || this.vulnerableTimer <= 0) {
      return false;
    }

    return this.isShieldBroken(this.getShieldTarget());
  }

  public isDangerState(): boolean {
    return this.isBossAlive() && !this.isDamageWindowOpen();
  }

  private getShieldTarget(): BreakableTarget | null {
    const target = this.shieldTarget as BreakableTarget | Node | null;
    if (!target) {
      return null;
    }

    if (typeof (target as BreakableTarget).isCurrentlyBroken === 'function') {
      return target as BreakableTarget;
    }

    return (target as Node).getComponent?.(BreakableTarget) ?? null;
  }

  private isShieldBroken(shieldTarget: BreakableTarget | null): boolean {
    if (typeof shieldTarget?.isCurrentlyBroken === 'function') {
      return shieldTarget.isCurrentlyBroken();
    }

    return (shieldTarget as unknown as { isBroken?: boolean } | null)?.isBroken ?? false;
  }

  private applyPlaceholderVisuals(force = false): void {
    if (this.simplifyPlaceholderVisuals === false) {
      return;
    }

    if (!force && this.placeholderVisualsSimplified) {
      return;
    }

    this.placeholderVisualsSimplified = true;
    const shieldRoots = new Set<Node>();
    const shieldTarget = this.getShieldTarget();
    if (shieldTarget?.node?.isValid) {
      shieldRoots.add(shieldTarget.node);
    }

    for (const node of [
      ...this.activateWhenShieldBroken,
      ...this.deactivateWhenShieldBroken,
      ...this.activateWhenDanger,
      ...this.activateWhenVulnerable,
    ]) {
      if (node?.isValid && /^BossShield-(?:Closed|Open)$/i.test(node.name)) {
        shieldRoots.add(node);
      }
    }

    for (const root of shieldRoots) {
      this.simplifyShieldRoot(root);
    }
  }

  private simplifyShieldRoot(root: Node): void {
    for (const child of root.children) {
      if (!child?.isValid) {
        continue;
      }

      if (/(?:Counterweight|Latch|Spark|Anchor|HingeFin)$/i.test(child.name)) {
        child.active = false;
        continue;
      }

      const rectVisual = child.getComponent(RectVisual);
      if (!rectVisual) {
        continue;
      }

      rectVisual.drawFill = true;
      rectVisual.drawStroke = false;
      rectVisual.strokeColor = new Color(rectVisual.strokeColor.r, rectVisual.strokeColor.g, rectVisual.strokeColor.b, 0);
      rectVisual.gradientStrength = 0.08;
      rectVisual.innerShadow = 0;
      rectVisual.doubleBorder = 0;
      rectVisual.outerGlow = 0;
      rectVisual.hatchStrength = 0;
      rectVisual.stippleStrength = 0;
      rectVisual.requestRedraw();
    }
  }
}
