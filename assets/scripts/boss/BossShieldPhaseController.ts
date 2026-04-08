import { _decorator, Component, Node } from 'cc';
import { DamageOnContact } from '../combat/DamageOnContact';
import { HEALTH_EVENT_DEPLETED, HealthComponent } from '../combat/HealthComponent';
import { GameManager } from '../core/GameManager';
import { GAME_EVENT_RESPAWN_REQUESTED } from '../core/GameTypes';
import { EnemyAI } from '../enemy/EnemyAI';
import { BREAKABLE_EVENT_BROKEN, BREAKABLE_EVENT_RESET, BreakableTarget } from '../puzzle/BreakableTarget';

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

  private vulnerableTimer = 0;

  protected onLoad(): void {
    this.shieldTarget?.events.on(BREAKABLE_EVENT_BROKEN, this.onShieldBroken, this);
    this.shieldTarget?.events.on(BREAKABLE_EVENT_RESET, this.refreshState, this);
    this.bossHealth?.events.on(HEALTH_EVENT_DEPLETED, this.onBossDepleted, this);
    this.refreshState();
  }

  protected onEnable(): void {
    GameManager.instance?.events.on(GAME_EVENT_RESPAWN_REQUESTED, this.onRespawnRequested, this);
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

    if ((this.shieldTarget?.isCurrentlyBroken() ?? false) && this.isBossAlive()) {
      this.shieldTarget?.resetState();
      return;
    }

    this.refreshState();
  }

  protected onDisable(): void {
    GameManager.instance?.events.off(GAME_EVENT_RESPAWN_REQUESTED, this.onRespawnRequested, this);
  }

  protected onDestroy(): void {
    this.shieldTarget?.events.off(BREAKABLE_EVENT_BROKEN, this.onShieldBroken, this);
    this.shieldTarget?.events.off(BREAKABLE_EVENT_RESET, this.refreshState, this);
    this.bossHealth?.events.off(HEALTH_EVENT_DEPLETED, this.onBossDepleted, this);
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

  private isBossAlive(): boolean {
    return (this.bossHealth?.getCurrentHealth() ?? 0) > 0;
  }

  private isDamageWindowOpen(): boolean {
    return this.isBossAlive() && (this.shieldTarget?.isCurrentlyBroken() ?? false) && this.vulnerableTimer > 0;
  }
}
