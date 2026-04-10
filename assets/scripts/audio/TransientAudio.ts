import { AudioClip, AudioSource, Node, director } from 'cc';

export function playTransientClipAtNode(
  referenceNode: Node | null,
  clip: AudioClip | null,
  volume = 1,
  suffix = 'TransientAudio',
): void {
  if (!referenceNode?.isValid || !clip) {
    return;
  }

  const scene = director.getScene();
  if (!scene?.isValid) {
    return;
  }

  const hostNode = new Node(`${referenceNode.name}-${suffix}`);
  hostNode.layer = referenceNode.layer;
  scene.addChild(hostNode);

  const audioSource = hostNode.addComponent(AudioSource);
  if (!audioSource) {
    hostNode.destroy();
    return;
  }

  audioSource.playOnAwake = false;
  audioSource.loop = false;
  audioSource.clip = clip;
  audioSource.playOneShot(clip, volume);

  const cleanupDelayMs = Math.max(clip.getDuration(), 0.25) * 1000 + 150;
  setTimeout(() => {
    if (hostNode.isValid) {
      hostNode.destroy();
    }
  }, cleanupDelayMs);
}
