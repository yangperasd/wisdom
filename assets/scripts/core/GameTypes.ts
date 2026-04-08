export enum GameFlowState {
  Boot = 'boot',
  Playing = 'playing',
  Paused = 'paused',
  GameOver = 'game-over',
}

export enum EchoId {
  Box,
  SpringFlower,
  BombBug,
}

export const ECHO_DEBUG_NAME: Record<EchoId, string> = {
  [EchoId.Box]: 'box',
  [EchoId.SpringFlower]: 'spring-flower',
  [EchoId.BombBug]: 'bomb-bug',
};

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export interface CheckpointData {
  sceneName: string;
  markerId: string;
  worldPosition: Vector3Like;
}

export interface SaveSnapshot {
  lastCheckpoint: CheckpointData | null;
  unlockedEchoes: EchoId[];
  selectedEcho: EchoId;
  unlockedShortcuts: string[];
  bossCleared: boolean;
}

export const GAME_EVENT_FLOW_CHANGED = 'game-flow-changed';
export const GAME_EVENT_CHECKPOINT_CHANGED = 'checkpoint-changed';
export const GAME_EVENT_RESPAWN_REQUESTED = 'respawn-requested';
export const GAME_EVENT_FLAGS_CHANGED = 'flags-changed';
