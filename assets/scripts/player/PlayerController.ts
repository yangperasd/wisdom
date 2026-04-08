import { _decorator, Component, EventTarget, Node, Vec3 } from 'cc';
import { HEALTH_EVENT_DEPLETED, HealthComponent } from '../combat/HealthComponent';
import { EchoManager } from '../echo/EchoManager';
import { GameManager } from '../core/GameManager';

const { ccclass, property } = _decorator;

export const PLAYER_EVENT_ATTACK_STARTED = 'player-attack-started';
export const PLAYER_EVENT_ATTACK_ENDED = 'player-attack-ended';

@ccclass('PlayerController')
export class PlayerController extends Component {
  public readonly events = new EventTarget();

  @property
  moveSpeed = 220;

  @property
  attackDuration = 0.18;

  @property
  attackReach = 18;

  @property(Node)
  attackAnchor: Node | null = null;

  @property(HealthComponent)
  health: HealthComponent | null = null;

  @property(EchoManager)
  echoManager: EchoManager | null = null;

  private moveInput = new Vec3();
  private facingDirection = new Vec3(1, 0, 0);
  private attackTimer = 0;
  private forcedMoveVelocity = new Vec3();
  private forcedMoveTimer = 0;

  protected onLoad(): void {
    this.health?.events.on(HEALTH_EVENT_DEPLETED, this.onHealthDepleted, this);
    this.syncAttackAnchor();
  }

  protected onDestroy(): void {
    this.health?.events.off(HEALTH_EVENT_DEPLETED, this.onHealthDepleted, this);
  }

  protected update(dt: number): void {
    if (GameManager.instance?.isPaused()) {
      return;
    }

    if (this.attackTimer > 0) {
      const nextAttackTimer = Math.max(0, this.attackTimer - dt);
      if (nextAttackTimer === 0 && this.attackTimer > 0) {
        this.events.emit(PLAYER_EVENT_ATTACK_ENDED);
      }

      this.attackTimer = nextAttackTimer;
    }

    const nextPosition = this.node.position.clone();
    if (this.forcedMoveTimer > 0) {
      const step = Math.min(dt, this.forcedMoveTimer);
      nextPosition.x += this.forcedMoveVelocity.x * step;
      nextPosition.y += this.forcedMoveVelocity.y * step;
      this.forcedMoveTimer = Math.max(0, this.forcedMoveTimer - dt);

      if (this.forcedMoveTimer === 0) {
        this.forcedMoveVelocity.set(0, 0, 0);
      }
    } else {
      nextPosition.x += this.moveInput.x * this.moveSpeed * dt;
      nextPosition.y += this.moveInput.y * this.moveSpeed * dt;
    }

    this.node.setPosition(nextPosition);
  }

  public setMoveInput(x: number, y: number): void {
    if (GameManager.instance?.isPaused()) {
      this.moveInput.set(0, 0, 0);
      return;
    }

    this.moveInput.set(x, y, 0);

    if (this.moveInput.lengthSqr() > 1) {
      this.moveInput.normalize();
    }

    if (this.moveInput.lengthSqr() > 0) {
      this.facingDirection.set(this.moveInput.x, this.moveInput.y, 0);
      this.syncAttackAnchor();
    }
  }

  public attack(): boolean {
    if (GameManager.instance?.isPaused()) {
      return false;
    }

    if (this.attackTimer > 0) {
      return false;
    }

    this.attackTimer = this.attackDuration;
    this.events.emit(PLAYER_EVENT_ATTACK_STARTED, this.facingDirection.clone(), this.attackDuration);
    return true;
  }

  public tryPlaceCurrentEcho(): boolean {
    if (GameManager.instance?.isPaused()) {
      return false;
    }

    if (!this.echoManager) {
      return false;
    }

    const spawnPosition = this.attackAnchor
      ? this.attackAnchor.worldPosition.clone()
      : this.node.worldPosition.clone();

    return this.echoManager.spawnCurrentEcho(spawnPosition);
  }

  public launch(direction: Readonly<Vec3>, distance = 180, duration = 0.2): boolean {
    if (GameManager.instance?.isPaused()) {
      return false;
    }

    if (distance <= 0) {
      return false;
    }

    const launchDirection = new Vec3(direction.x, direction.y, 0);
    if (launchDirection.lengthSqr() === 0) {
      return false;
    }

    launchDirection.normalize();
    this.facingDirection.set(launchDirection.x, launchDirection.y, 0);
    this.syncAttackAnchor();

    if (duration <= 0) {
      const nextPosition = this.node.worldPosition.clone();
      nextPosition.x += launchDirection.x * distance;
      nextPosition.y += launchDirection.y * distance;
      this.node.setWorldPosition(nextPosition);
      return true;
    }

    this.forcedMoveVelocity.set(
      (launchDirection.x * distance) / duration,
      (launchDirection.y * distance) / duration,
      0,
    );
    this.forcedMoveTimer = duration;
    return true;
  }

  public respawnAt(worldPosition: Vec3): void {
    this.node.setWorldPosition(worldPosition);
    this.attackTimer = 0;
    this.forcedMoveTimer = 0;
    this.forcedMoveVelocity.set(0, 0, 0);
    this.health?.resetFull();
  }

  public getFacingDirection(): Vec3 {
    return this.facingDirection.clone();
  }

  public isAttacking(): boolean {
    return this.attackTimer > 0;
  }

  public isForcedMoving(): boolean {
    return this.forcedMoveTimer > 0;
  }

  private onHealthDepleted(): void {
    const manager = GameManager.instance;
    if (!manager) {
      return;
    }

    manager.requestRespawn();
    const checkpoint = manager.getCheckpoint();
    if (!checkpoint) {
      return;
    }

    this.respawnAt(
      new Vec3(
        checkpoint.worldPosition.x,
        checkpoint.worldPosition.y,
        checkpoint.worldPosition.z,
      ),
    );
  }

  private syncAttackAnchor(): void {
    if (!this.attackAnchor) {
      return;
    }

    this.attackAnchor.setPosition(
      new Vec3(
        this.facingDirection.x * this.attackReach,
        this.facingDirection.y * this.attackReach,
        this.attackAnchor.position.z,
      ),
    );
  }
}
