import { _decorator, Component, Enum, EventTouch, Node, Vec3 } from 'cc';
import { EchoId } from '../core/GameTypes';
import { GameManager } from '../core/GameManager';
import { SceneLoader } from '../core/SceneLoader';
import { PlayerController } from '../player/PlayerController';

const { ccclass, property } = _decorator;

enum TouchCommand {
  Attack,
  PlaceEcho,
  Respawn,
  EchoBox,
  EchoFlower,
  EchoBomb,
  EchoPrev,
  EchoNext,
  PauseToggle,
  Resume,
  ReturnToCamp,
}

@ccclass('TouchCommandButton')
export class TouchCommandButton extends Component {
  @property(PlayerController)
  player: PlayerController | null = null;

  @property({ type: Enum(TouchCommand) })
  command: TouchCommand = TouchCommand.Attack;

  @property
  pressedScale = 0.92;

  private touchId: number | null = null;
  private initialScale = new Vec3(1, 1, 1);

  protected onLoad(): void {
    this.initialScale = this.node.scale.clone();
  }

  protected onEnable(): void {
    this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
    this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
  }

  protected onDisable(): void {
    this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
    this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    this.restoreScale();
  }

  private onTouchStart(event: EventTouch): void {
    if (this.touchId !== null) {
      return;
    }

    this.touchId = event.getID();
    this.node.setScale(
      this.initialScale.x * this.pressedScale,
      this.initialScale.y * this.pressedScale,
      this.initialScale.z,
    );
  }

  private onTouchEnd(event: EventTouch): void {
    if (event.getID() !== this.touchId) {
      return;
    }

    this.touchId = null;
    this.restoreScale();
    this.executeCommand();
  }

  private onTouchCancel(event: EventTouch): void {
    if (event.getID() !== this.touchId) {
      return;
    }

    this.touchId = null;
    this.restoreScale();
  }

  private executeCommand(): void {
    const manager = GameManager.instance;
    const isPaused = manager?.isPaused() ?? false;

    switch (this.command) {
      case TouchCommand.Attack:
        if (isPaused) {
          return;
        }
        this.player?.attack();
        break;
      case TouchCommand.PlaceEcho:
        if (isPaused) {
          return;
        }
        this.player?.tryPlaceCurrentEcho();
        break;
      case TouchCommand.Respawn:
        manager?.resumeGame();
        manager?.requestRespawn();
        break;
      case TouchCommand.EchoBox:
        if (isPaused) {
          return;
        }
        this.player?.echoManager?.selectEcho(EchoId.Box);
        break;
      case TouchCommand.EchoFlower:
        if (isPaused) {
          return;
        }
        this.player?.echoManager?.selectEcho(EchoId.SpringFlower);
        break;
      case TouchCommand.EchoBomb:
        if (isPaused) {
          return;
        }
        this.player?.echoManager?.selectEcho(EchoId.BombBug);
        break;
      case TouchCommand.EchoPrev:
        if (isPaused) {
          return;
        }
        this.player?.echoManager?.cycleSelection(-1);
        break;
      case TouchCommand.EchoNext:
        if (isPaused) {
          return;
        }
        this.player?.echoManager?.cycleSelection(1);
        break;
      case TouchCommand.PauseToggle:
        manager?.togglePause();
        break;
      case TouchCommand.Resume:
        manager?.resumeGame();
        break;
      case TouchCommand.ReturnToCamp:
        manager?.resumeGame();
        SceneLoader.instance?.switchScene('StartCamp');
        break;
      default:
        break;
    }
  }

  private restoreScale(): void {
    this.node.setScale(this.initialScale);
  }
}
