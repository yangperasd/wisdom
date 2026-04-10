import { _decorator, AudioClip, AudioSource, Component } from 'cc';
import { GameManager } from '../core/GameManager';
import { GAME_EVENT_FLOW_CHANGED, GameFlowState } from '../core/GameTypes';
import { SCENE_EVENT_WILL_SWITCH, SceneLoader } from '../core/SceneLoader';

const { ccclass, property } = _decorator;

@ccclass('SceneMusicController')
export class SceneMusicController extends Component {
  @property(SceneLoader)
  sceneLoader: SceneLoader | null = null;

  @property
  musicCueId = '';

  @property(AudioClip)
  bgmClip: AudioClip | null = null;

  @property
  volume = 0.72;

  @property
  loop = true;

  @property
  playOnStart = true;

  @property
  stopOnSceneSwitch = true;

  @property
  pauseWithGameFlow = true;

  private audioSource: AudioSource | null = null;
  private shouldResumeAfterPause = false;

  protected onLoad(): void {
    const audioSource = this.getComponent(AudioSource) ?? this.addComponent(AudioSource);
    if (!audioSource) {
      return;
    }

    this.audioSource = audioSource;
    this.syncAudioSource();
  }

  protected onEnable(): void {
    this.resolveSceneLoader()?.events.on(SCENE_EVENT_WILL_SWITCH, this.onSceneWillSwitch, this);
    GameManager.instance?.events.on(GAME_EVENT_FLOW_CHANGED, this.onFlowChanged, this);
  }

  protected start(): void {
    if (this.playOnStart) {
      this.playMusic();
    }
  }

  protected onDisable(): void {
    this.resolveSceneLoader()?.events.off(SCENE_EVENT_WILL_SWITCH, this.onSceneWillSwitch, this);
    GameManager.instance?.events.off(GAME_EVENT_FLOW_CHANGED, this.onFlowChanged, this);
  }

  protected onDestroy(): void {
    this.stopMusic();
  }

  public playMusic(forceRestart = false): void {
    const audioSource = this.audioSource;
    if (!audioSource || !this.bgmClip) {
      return;
    }

    this.syncAudioSource();
    if (this.pauseWithGameFlow && GameManager.instance?.getFlowState() === GameFlowState.Paused) {
      this.shouldResumeAfterPause = true;
      return;
    }

    if (audioSource.playing && !forceRestart) {
      return;
    }

    audioSource.play();
    this.shouldResumeAfterPause = false;
  }

  public stopMusic(): void {
    this.shouldResumeAfterPause = false;
    this.audioSource?.stop();
  }

  private onSceneWillSwitch(): void {
    if (!this.stopOnSceneSwitch) {
      return;
    }

    this.stopMusic();
  }

  private onFlowChanged(nextState: GameFlowState): void {
    if (!this.pauseWithGameFlow) {
      return;
    }

    const audioSource = this.audioSource;
    if (!audioSource) {
      return;
    }

    if (nextState === GameFlowState.Paused) {
      this.shouldResumeAfterPause = audioSource.playing;
      if (audioSource.playing) {
        audioSource.pause();
      }
      return;
    }

    if (nextState === GameFlowState.Playing && this.shouldResumeAfterPause) {
      audioSource.play();
      this.shouldResumeAfterPause = false;
    }
  }

  private syncAudioSource(): void {
    const audioSource = this.audioSource;
    if (!audioSource) {
      return;
    }

    audioSource.playOnAwake = false;
    audioSource.loop = this.loop;
    audioSource.volume = this.volume;
    audioSource.clip = this.bgmClip;
  }

  private resolveSceneLoader(): SceneLoader | null {
    return this.sceneLoader ?? SceneLoader.instance;
  }
}
