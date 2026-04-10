import { _decorator, AudioClip, AudioSource, Component, Enum, EventTouch, Node, Sprite, SpriteFrame, Vec3 } from 'cc';
import { EchoId } from '../core/GameTypes';
import { GameManager } from '../core/GameManager';
import { SceneLoader } from '../core/SceneLoader';
import { PlayerController } from '../player/PlayerController';
import { RectVisual } from '../visual/RectVisual';

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

  @property(SpriteFrame)
  buttonSpriteFrame: SpriteFrame | null = null;

  @property(AudioClip)
  tapClip: AudioClip | null = null;

  @property(AudioClip)
  confirmClip: AudioClip | null = null;

  @property(AudioClip)
  errorClip: AudioClip | null = null;

  @property(AudioClip)
  menuClip: AudioClip | null = null;

  @property
  audioVolume = 1;

  private touchId: number | null = null;
  private initialScale = new Vec3(1, 1, 1);
  private audioSource: AudioSource | null = null;

  protected onLoad(): void {
    this.initialScale = this.node.scale.clone();
    const audioSource = this.getComponent(AudioSource) ?? this.addComponent(AudioSource);
    if (!audioSource) {
      return;
    }
    this.audioSource = audioSource;
    audioSource.playOnAwake = false;
    audioSource.loop = false;
    this.applyButtonSpriteFrame();
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
    const blockedWhenPaused =
      this.command === TouchCommand.Attack ||
      this.command === TouchCommand.PlaceEcho ||
      this.command === TouchCommand.EchoBox ||
      this.command === TouchCommand.EchoFlower ||
      this.command === TouchCommand.EchoBomb ||
      this.command === TouchCommand.EchoPrev ||
      this.command === TouchCommand.EchoNext;
    if (isPaused && blockedWhenPaused) {
      this.playClip(this.errorClip);
      return;
    }
    let clipToPlay: AudioClip | null = null;

    switch (this.command) {
      case TouchCommand.Attack:
        clipToPlay = this.player?.attack() ? (this.confirmClip ?? this.tapClip) : this.errorClip;
        break;
      case TouchCommand.PlaceEcho:
        clipToPlay = this.player?.tryPlaceCurrentEcho() ? (this.confirmClip ?? this.tapClip) : this.errorClip;
        break;
      case TouchCommand.Respawn:
        manager?.resumeGame();
        manager?.requestRespawn();
        clipToPlay = this.confirmClip ?? this.tapClip;
        break;
      case TouchCommand.EchoBox:
        this.player?.echoManager?.selectEcho(EchoId.Box);
        clipToPlay = this.tapClip;
        break;
      case TouchCommand.EchoFlower:
        this.player?.echoManager?.selectEcho(EchoId.SpringFlower);
        clipToPlay = this.tapClip;
        break;
      case TouchCommand.EchoBomb:
        this.player?.echoManager?.selectEcho(EchoId.BombBug);
        clipToPlay = this.tapClip;
        break;
      case TouchCommand.EchoPrev:
        this.player?.echoManager?.cycleSelection(-1);
        clipToPlay = this.tapClip;
        break;
      case TouchCommand.EchoNext:
        this.player?.echoManager?.cycleSelection(1);
        clipToPlay = this.tapClip;
        break;
      case TouchCommand.PauseToggle:
        manager?.togglePause();
        clipToPlay = this.menuClip ?? this.confirmClip ?? this.tapClip;
        break;
      case TouchCommand.Resume:
        manager?.resumeGame();
        clipToPlay = this.confirmClip ?? this.tapClip;
        break;
      case TouchCommand.ReturnToCamp:
        manager?.resumeGame();
        SceneLoader.instance?.switchScene('StartCamp');
        clipToPlay = this.confirmClip ?? this.tapClip;
        break;
      default:
        break;
    }

    this.playClip(clipToPlay);
  }

  private restoreScale(): void {
    this.node.setScale(this.initialScale);
  }

  private playClip(clip: AudioClip | null): void {
    if (!clip || !this.audioSource) {
      return;
    }

    this.audioSource.playOneShot(clip, this.audioVolume);
  }

  private applyButtonSpriteFrame(): void {
    if (!this.buttonSpriteFrame) {
      return;
    }

    const visualNode = this.node.getChildByName(`${this.node.name}-Visual`) ?? this.node.getChildByName('Visual');
    if (!visualNode) {
      return;
    }

    const sprite = visualNode.getComponent(Sprite) ?? visualNode.addComponent(Sprite);
    sprite.spriteFrame = this.buttonSpriteFrame;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;

    const rectVisual = visualNode.getComponent(RectVisual);
    if (rectVisual) {
      rectVisual.drawFill = false;
      rectVisual.drawStroke = false;
      rectVisual.requestRedraw();
    }
  }
}
