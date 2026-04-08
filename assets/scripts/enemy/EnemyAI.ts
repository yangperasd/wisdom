import { _decorator, Component, Enum, Node, Vec3 } from 'cc';
import { GameManager } from '../core/GameManager';

const { ccclass, property } = _decorator;

enum EnemyState {
  Idle,
  Patrol,
  Chase,
}

@ccclass('EnemyAI')
export class EnemyAI extends Component {
  @property({ type: Enum(EnemyState) })
  initialState: EnemyState = EnemyState.Patrol;

  @property
  moveSpeed = 80;

  @property
  chaseDistance = 120;

  @property(Node)
  target: Node | null = null;

  @property([Node])
  patrolPoints: Node[] = [];

  private state = EnemyState.Patrol;
  private patrolIndex = 0;

  protected onLoad(): void {
    this.state = this.initialState;
  }

  protected update(dt: number): void {
    if (GameManager.instance?.isPaused()) {
      return;
    }

    if (this.target) {
      const distanceToTarget = Vec3.distance(this.node.worldPosition, this.target.worldPosition);
      this.state = distanceToTarget <= this.chaseDistance ? EnemyState.Chase : this.initialState;
    }

    switch (this.state) {
      case EnemyState.Chase:
        this.moveTowards(this.target?.worldPosition ?? null, dt);
        break;
      case EnemyState.Patrol:
        this.updatePatrol(dt);
        break;
      default:
        break;
    }
  }

  private updatePatrol(dt: number): void {
    if (this.patrolPoints.length === 0) {
      return;
    }

    const nextPoint = this.patrolPoints[this.patrolIndex];
    this.moveTowards(nextPoint.worldPosition, dt);

    if (Vec3.distance(this.node.worldPosition, nextPoint.worldPosition) < 8) {
      this.patrolIndex = (this.patrolIndex + 1) % this.patrolPoints.length;
    }
  }

  private moveTowards(targetPosition: Readonly<Vec3> | null, dt: number): void {
    if (!targetPosition) {
      return;
    }

    const direction = new Vec3(
      targetPosition.x - this.node.worldPosition.x,
      targetPosition.y - this.node.worldPosition.y,
      0,
    );

    if (direction.lengthSqr() === 0) {
      return;
    }

    direction.normalize();
    const next = this.node.position.clone();
    next.x += direction.x * this.moveSpeed * dt;
    next.y += direction.y * this.moveSpeed * dt;
    this.node.setPosition(next);
  }
}
