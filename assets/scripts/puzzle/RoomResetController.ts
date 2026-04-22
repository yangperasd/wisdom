import { _decorator, Component, Node, Quat, Vec3 } from 'cc';
import { HealthComponent } from '../combat/HealthComponent';
import { GameManager } from '../core/GameManager';
import { GAME_EVENT_RESPAWN_REQUESTED } from '../core/GameTypes';
import { EchoManager } from '../echo/EchoManager';

const { ccclass, property } = _decorator;

type NodeSnapshot = {
  active: boolean;
  position: Vec3;
  rotation: Quat;
  scale: Vec3;
};

@ccclass('RoomResetController')
export class RoomResetController extends Component {
  @property([Node])
  resetNodes: Node[] = [];

  @property(EchoManager)
  echoManager: EchoManager | null = null;

  private snapshots = new Map<string, NodeSnapshot>();

  protected onLoad(): void {
    this.captureInitialState();
  }

  protected onEnable(): void {
    this.bindGameManager();
  }

  protected start(): void {
    this.bindGameManager();
  }

  protected onDisable(): void {
    GameManager.instance?.events?.off(GAME_EVENT_RESPAWN_REQUESTED, this.resetRoom, this);
  }

  public resetRoom(): void {
    for (const node of this.resetNodes) {
      if (!node?.isValid) {
        continue;
      }

      const snapshot = this.snapshots.get(node.uuid);
      if (!snapshot) {
        continue;
      }

      node.active = snapshot.active;
      node.setPosition(snapshot.position);
      node.setRotation(snapshot.rotation);
      node.setScale(snapshot.scale);
      node.getComponent(HealthComponent)?.resetFull();
    }

    this.echoManager?.resetRoomState();
  }

  private captureInitialState(): void {
    for (const node of this.resetNodes) {
      this.snapshots.set(node.uuid, {
        active: node.active,
        position: node.position.clone(),
        rotation: node.rotation.clone(),
        scale: node.scale.clone(),
      });
    }
  }

  private bindGameManager(): void {
    GameManager.instance?.events?.off(GAME_EVENT_RESPAWN_REQUESTED, this.resetRoom, this);
    GameManager.instance?.events?.on(GAME_EVENT_RESPAWN_REQUESTED, this.resetRoom, this);
  }
}
