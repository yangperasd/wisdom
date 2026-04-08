import { _decorator, Component, Label } from 'cc';
import { HealthComponent } from '../combat/HealthComponent';
import { ECHO_DEBUG_NAME, EchoId } from '../core/GameTypes';
import { GameManager } from '../core/GameManager';
import { EchoManager } from '../echo/EchoManager';

const { ccclass, property } = _decorator;

@ccclass('DebugHud')
export class DebugHud extends Component {
  @property(Label)
  label: Label | null = null;

  @property(HealthComponent)
  playerHealth: HealthComponent | null = null;

  @property(EchoManager)
  echoManager: EchoManager | null = null;

  @property
  showControls = true;

  protected update(): void {
    if (!this.label) {
      return;
    }

    const currentHealth = this.playerHealth?.getCurrentHealth() ?? 0;
    const maxHealth = this.playerHealth?.maxHealth ?? 0;
    const currentEcho = this.echoManager?.getCurrentEchoId() ?? EchoId.Box;
    const unlockedCount = this.echoManager?.getUnlockedEchoes().length ?? 0;
    const checkpoint = GameManager.instance?.getCheckpoint();

    const lines = [
      `HP ${currentHealth}/${maxHealth}`,
      `Echo ${ECHO_DEBUG_NAME[currentEcho]} (${unlockedCount})`,
      `Checkpoint ${checkpoint?.markerId ?? 'none'}`,
    ];

    if (this.showControls) {
      lines.push('Move WASD/Arrow');
      lines.push('Attack J  Echo K');
      lines.push('Cycle Q/E  Pick 1/2/3');
      lines.push('Respawn R');
    }

    this.label.string = lines.join('\n');
  }
}
