import { _decorator, Component, EventKeyboard, input, Input, KeyCode } from 'cc';
import { GameManager } from '../core/GameManager';
import { EchoId } from '../core/GameTypes';
import { PlayerController } from '../player/PlayerController';

const { ccclass, property } = _decorator;

@ccclass('KeyboardInputDriver')
export class KeyboardInputDriver extends Component {
  @property(PlayerController)
  player: PlayerController | null = null;

  private horizontal = 0;
  private vertical = 0;
  private pressedKeys = new Set<KeyCode>();
  private lastAppliedHorizontal = 0;
  private lastAppliedVertical = 0;

  protected onEnable(): void {
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
  }

  protected onDisable(): void {
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
  }

  protected update(): void {
    if (GameManager.instance?.isPaused()) {
      this.player?.setMoveInput(0, 0);
      this.lastAppliedHorizontal = 0;
      this.lastAppliedVertical = 0;
      return;
    }

    if (
      this.horizontal === 0 &&
      this.vertical === 0 &&
      this.lastAppliedHorizontal === 0 &&
      this.lastAppliedVertical === 0
    ) {
      return;
    }

    this.player?.setMoveInput(this.horizontal, this.vertical);
    this.lastAppliedHorizontal = this.horizontal;
    this.lastAppliedVertical = this.vertical;
  }

  private onKeyDown(event: EventKeyboard): void {
    if (event.keyCode === KeyCode.ESCAPE) {
      GameManager.instance?.togglePause();
      return;
    }

    if (GameManager.instance?.isPaused()) {
      return;
    }

    this.pressedKeys.add(event.keyCode);
    this.refreshAxes();

    if (event.keyCode === KeyCode.KEY_J) {
      this.player?.attack();
    }

    if (event.keyCode === KeyCode.KEY_K) {
      this.player?.tryPlaceCurrentEcho();
    }

    if (event.keyCode === KeyCode.KEY_Q) {
      this.player?.echoManager?.cycleSelection(-1);
    }

    if (event.keyCode === KeyCode.KEY_E) {
      this.player?.echoManager?.cycleSelection(1);
    }

    if (event.keyCode === KeyCode.DIGIT_1) {
      this.player?.echoManager?.selectEcho(EchoId.Box);
    }

    if (event.keyCode === KeyCode.DIGIT_2) {
      this.player?.echoManager?.selectEcho(EchoId.SpringFlower);
    }

    if (event.keyCode === KeyCode.DIGIT_3) {
      this.player?.echoManager?.selectEcho(EchoId.BombBug);
    }

    if (event.keyCode === KeyCode.KEY_R) {
      GameManager.instance?.requestRespawn();
    }
  }

  private onKeyUp(event: EventKeyboard): void {
    if (event.keyCode === KeyCode.ESCAPE) {
      return;
    }

    this.pressedKeys.delete(event.keyCode);
    this.refreshAxes();
  }

  private refreshAxes(): void {
    this.horizontal = 0;
    this.vertical = 0;

    if (this.isPressed(KeyCode.KEY_A) || this.isPressed(KeyCode.ARROW_LEFT)) {
      this.horizontal -= 1;
    }

    if (this.isPressed(KeyCode.KEY_D) || this.isPressed(KeyCode.ARROW_RIGHT)) {
      this.horizontal += 1;
    }

    if (this.isPressed(KeyCode.KEY_W) || this.isPressed(KeyCode.ARROW_UP)) {
      this.vertical += 1;
    }

    if (this.isPressed(KeyCode.KEY_S) || this.isPressed(KeyCode.ARROW_DOWN)) {
      this.vertical -= 1;
    }
  }

  private isPressed(keyCode: KeyCode): boolean {
    return this.pressedKeys.has(keyCode);
  }
}
