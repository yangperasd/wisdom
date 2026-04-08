import { _decorator, Collider2D, Component, Contact2DType, IPhysics2DContact, Node } from 'cc';
import { GameManager } from '../core/GameManager';
import { GAME_EVENT_RESPAWN_REQUESTED } from '../core/GameTypes';

const { ccclass, property } = _decorator;

@ccclass('PressurePlateSwitch')
export class PressurePlateSwitch extends Component {
  @property
  allowedNodeNameIncludes = 'Echo-box';

  @property([Node])
  activateOnPressed: Node[] = [];

  @property([Node])
  deactivateOnPressed: Node[] = [];

  @property
  startsPressed = false;

  private collider: Collider2D | null = null;
  private activeBodies = new Set<string>();
  private isPressed = false;

  protected onLoad(): void {
    this.collider = this.getComponent(Collider2D);
    this.collider?.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
    this.collider?.on(Contact2DType.END_CONTACT, this.onEndContact, this);
    this.isPressed = this.startsPressed;
    this.applyState();
  }

  protected onEnable(): void {
    GameManager.instance?.events.on(GAME_EVENT_RESPAWN_REQUESTED, this.resetState, this);
  }

  protected onDisable(): void {
    GameManager.instance?.events.off(GAME_EVENT_RESPAWN_REQUESTED, this.resetState, this);
  }

  protected onDestroy(): void {
    this.collider?.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
    this.collider?.off(Contact2DType.END_CONTACT, this.onEndContact, this);
  }

  public resetState(): void {
    this.activeBodies.clear();
    this.isPressed = this.startsPressed;
    this.applyState();
  }

  private onBeginContact(_self: Collider2D, other: Collider2D, _contact?: IPhysics2DContact | null): void {
    if (!this.matchesAllowedNode(other.node)) {
      return;
    }

    this.activeBodies.add(other.node.uuid);
    this.updatePressedState();
  }

  private onEndContact(_self: Collider2D, other: Collider2D, _contact?: IPhysics2DContact | null): void {
    if (!this.matchesAllowedNode(other.node)) {
      return;
    }

    this.activeBodies.delete(other.node.uuid);
    this.updatePressedState();
  }

  private matchesAllowedNode(node: Node): boolean {
    return !this.allowedNodeNameIncludes || node.name.includes(this.allowedNodeNameIncludes);
  }

  private updatePressedState(): void {
    this.isPressed = this.activeBodies.size > 0;
    this.applyState();
  }

  private applyState(): void {
    for (const node of this.activateOnPressed) {
      node.active = this.isPressed;
    }

    for (const node of this.deactivateOnPressed) {
      node.active = !this.isPressed;
    }
  }
}
