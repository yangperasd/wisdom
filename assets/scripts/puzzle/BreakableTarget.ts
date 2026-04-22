import { _decorator, AudioClip, Component, EventTarget, Node, SpriteFrame, Vec3 } from 'cc';
import { playTransientClipAtNode } from '../audio/TransientAudio';
import { GameManager } from '../core/GameManager';
import { GAME_EVENT_RESPAWN_REQUESTED } from '../core/GameTypes';
import { applySpriteFrameToPlaceholderVisual, setPlaceholderLabelVisible } from '../visual/SpriteVisualSkin';

const { ccclass, property, executeInEditMode } = _decorator;

export const BREAKABLE_EVENT_BROKEN = 'breakable-broken';
export const BREAKABLE_EVENT_RESET = 'breakable-reset';

@ccclass('BreakableTarget')
@executeInEditMode
export class BreakableTarget extends Component {
  public readonly events = new EventTarget();

  @property
  startsBroken = false;

  @property([Node])
  activateOnBroken: Node[] = [];

  @property([Node])
  deactivateOnBroken: Node[] = [];

  @property(Node)
  intactVisualNode: Node | null = null;

  @property(Node)
  brokenVisualNode: Node | null = null;

  @property(SpriteFrame)
  intactSpriteFrame: SpriteFrame | null = null;

  @property(SpriteFrame)
  brokenSpriteFrame: SpriteFrame | null = null;

  @property(AudioClip)
  breakClip: AudioClip | null = null;

  @property
  breakClipVolume = 1;

  @property(AudioClip)
  resetClip: AudioClip | null = null;

  @property
  resetClipVolume = 1;

  @property
  hideLabelsWhenSkinned = true;

  private isBroken = false;

  protected onLoad(): void {
    this.isBroken = this.startsBroken;
    this.applyState();
  }

  protected onEnable(): void {
    this.applyState();
    this.bindGameManager();
  }

  protected onValidate(): void {
    this.isBroken = this.startsBroken;
    this.applyState();
  }

  protected start(): void {
    this.bindGameManager();
  }

  protected onDisable(): void {
    GameManager.instance?.events?.off(GAME_EVENT_RESPAWN_REQUESTED, this.resetState, this);
  }

  public applyExplosion(_origin?: Readonly<Vec3>): boolean {
    if (this.isBroken) {
      return false;
    }

    this.isBroken = true;
    this.applyState();
    this.playBreakFeedback();
    this.events.emit(BREAKABLE_EVENT_BROKEN);
    return true;
  }

  public resetState(): void {
    const wasBroken = this.isBroken;
    this.isBroken = this.startsBroken;
    this.applyState();
    if (wasBroken !== this.isBroken) {
      this.playResetFeedback();
    }
    this.events.emit(BREAKABLE_EVENT_RESET, this.isBroken);
  }

  public isCurrentlyBroken(): boolean {
    return this.isBroken;
  }

  private applyState(): void {
    for (const node of this.activateOnBroken) {
      if (node?.isValid) {
        node.active = this.isBroken;
      }
    }

    for (const node of this.deactivateOnBroken) {
      if (node?.isValid) {
        node.active = !this.isBroken;
      }
    }

    this.applyPresentationState();
  }

  private bindGameManager(): void {
    GameManager.instance?.events?.off(GAME_EVENT_RESPAWN_REQUESTED, this.resetState, this);
    GameManager.instance?.events?.on(GAME_EVENT_RESPAWN_REQUESTED, this.resetState, this);
  }

  private applyPresentationState(): void {
    const intactTarget = this.intactVisualNode ?? this.node;
    const brokenTarget = this.brokenVisualNode;

    if (brokenTarget?.isValid) {
      applySpriteFrameToPlaceholderVisual(intactTarget, this.intactSpriteFrame);
      applySpriteFrameToPlaceholderVisual(brokenTarget, this.brokenSpriteFrame);
      this.applyLabelVisibility(intactTarget, this.intactSpriteFrame);
      this.applyLabelVisibility(brokenTarget, this.brokenSpriteFrame);
      return;
    }

    const activeFrame = this.isBroken
      ? (this.brokenSpriteFrame ?? this.intactSpriteFrame)
      : this.intactSpriteFrame;
    applySpriteFrameToPlaceholderVisual(intactTarget, activeFrame);
    this.applyLabelVisibility(intactTarget, activeFrame);
  }

  private applyLabelVisibility(target: Node | null, spriteFrame: SpriteFrame | null): void {
    const shouldHide = this.hideLabelsWhenSkinned && !!spriteFrame;
    setPlaceholderLabelVisible(target, !shouldHide);
  }

  private playBreakFeedback(): void {
    playTransientClipAtNode(this.node, this.breakClip, this.breakClipVolume, 'BreakAudio');
  }

  private playResetFeedback(): void {
    playTransientClipAtNode(this.node, this.resetClip, this.resetClipVolume, 'ResetAudio');
  }
}
