import { _decorator, Component, EventTarget } from 'cc';
import { GameManager } from '../core/GameManager';

const { ccclass, property } = _decorator;

export const HEALTH_EVENT_CHANGED = 'health-changed';
export const HEALTH_EVENT_DEPLETED = 'health-depleted';

@ccclass('HealthComponent')
export class HealthComponent extends Component {
  public readonly events = new EventTarget();

  @property
  maxHealth = 3;

  @property
  invulnerableSeconds = 0.4;

  @property
  destroyNodeOnDepleted = false;

  @property
  deactivateNodeOnDepleted = false;

  @property
  acceptDamage = true;

  private currentHealth = 0;
  private invulnerableTimer = 0;

  protected onLoad(): void {
    this.currentHealth = this.maxHealth;
  }

  protected update(dt: number): void {
    if (GameManager.instance?.isPaused()) {
      return;
    }

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    }
  }

  public getCurrentHealth(): number {
    return this.currentHealth;
  }

  public resetFull(): void {
    this.currentHealth = this.maxHealth;
    this.invulnerableTimer = 0;
    this.events.emit(HEALTH_EVENT_CHANGED, this.currentHealth, this.maxHealth);
  }

  public applyDamage(amount = 1): boolean {
    if (amount <= 0 || !this.acceptDamage || this.invulnerableTimer > 0 || this.currentHealth <= 0) {
      return false;
    }

    this.currentHealth = Math.max(0, this.currentHealth - amount);
    this.invulnerableTimer = this.invulnerableSeconds;
    this.events.emit(HEALTH_EVENT_CHANGED, this.currentHealth, this.maxHealth);

    if (this.currentHealth === 0) {
      this.events.emit(HEALTH_EVENT_DEPLETED);

      if (this.deactivateNodeOnDepleted) {
        this.node.active = false;
      }

      if (this.destroyNodeOnDepleted) {
        this.node.destroy();
      }
    }

    return true;
  }

  public heal(amount = 1): void {
    if (amount <= 0) {
      return;
    }

    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    this.events.emit(HEALTH_EVENT_CHANGED, this.currentHealth, this.maxHealth);
  }

  public setDamageAcceptance(acceptDamage: boolean): void {
    this.acceptDamage = acceptDamage;
  }
}
