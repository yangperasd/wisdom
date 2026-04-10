import { Label, Node, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';
import { RectVisual } from './RectVisual';

const VISUAL_ART_NODE_NAME = 'SpriteSkin';

function resolveVisualNode(rootOrVisualNode: Node | null): Node | null {
  if (!rootOrVisualNode?.isValid) {
    return null;
  }

  if (rootOrVisualNode.name.endsWith('-Visual')) {
    return rootOrVisualNode;
  }

  const exactChild = rootOrVisualNode.getChildByName(`${rootOrVisualNode.name}-Visual`);
  if (exactChild?.isValid) {
    return exactChild;
  }

  return rootOrVisualNode.children.find((child) => child.name.endsWith('-Visual')) ?? rootOrVisualNode;
}

export function applySpriteFrameToPlaceholderVisual(
  rootOrVisualNode: Node | null,
  spriteFrame: SpriteFrame | null,
  options: {
    spriteType?: number;
  } = {},
): void {
  if (!rootOrVisualNode?.isValid || !spriteFrame) {
    return;
  }

  const visualNode = resolveVisualNode(rootOrVisualNode);
  if (!visualNode?.isValid) {
    return;
  }

  let artNode = visualNode.getChildByName(VISUAL_ART_NODE_NAME);
  if (!artNode?.isValid) {
    artNode = new Node(VISUAL_ART_NODE_NAME);
    artNode.layer = visualNode.layer;
    visualNode.addChild(artNode);
  }

  artNode.setPosition(0, 0, 0);
  artNode.setRotationFromEuler(0, 0, 0);
  artNode.setScale(1, 1, 1);
  artNode.active = true;

  const visualTransform = visualNode.getComponent(UITransform);
  const artTransform = artNode.getComponent(UITransform) ?? artNode.addComponent(UITransform);
  if (visualTransform) {
    artTransform.setContentSize(visualTransform.contentSize);
  }

  const sprite = artNode.getComponent(Sprite) ?? artNode.addComponent(Sprite);
  sprite.type = options.spriteType ?? Sprite.Type.SIMPLE;
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  sprite.spriteFrame = spriteFrame;

  const rectVisual = visualNode.getComponent(RectVisual);
  if (rectVisual) {
    rectVisual.drawFill = false;
    rectVisual.drawStroke = false;
    rectVisual.requestRedraw();
  }
}

export function setPlaceholderLabelVisible(rootNode: Node | null, visible: boolean): void {
  if (!rootNode?.isValid) {
    return;
  }

  const directLabel = rootNode.getComponent(Label);
  if (directLabel) {
    directLabel.enabled = visible;
  }

  for (const child of rootNode.children) {
    if (!child?.isValid) {
      continue;
    }

    if (child.name.endsWith('-Label') || child.getComponent(Label)) {
      child.active = visible;
    }
  }
}

export function setPlaceholderVisualFlipX(rootOrVisualNode: Node | null, flipped: boolean): void {
  const visualNode = resolveVisualNode(rootOrVisualNode);
  if (!visualNode?.isValid) {
    return;
  }

  const artNode = visualNode.getChildByName(VISUAL_ART_NODE_NAME) ?? visualNode;
  if (!artNode?.isValid) {
    return;
  }

  const currentScale = artNode.scale.clone();
  const nextScaleX = Math.abs(currentScale.x || 1) * (flipped ? -1 : 1);
  artNode.setScale(nextScaleX, Math.abs(currentScale.y || 1), currentScale.z || 1);
}

export function resolveTextureBackedSpriteFrame(
  generatedFrames: Map<string, SpriteFrame>,
  cacheKey: string,
  texture: Texture2D | null,
): SpriteFrame | null {
  if (!texture) {
    return null;
  }

  let spriteFrame = generatedFrames.get(cacheKey) ?? null;
  if (!spriteFrame?.isValid) {
    spriteFrame = new SpriteFrame();
    generatedFrames.set(cacheKey, spriteFrame);
  }

  spriteFrame.texture = texture;
  return spriteFrame;
}

export function destroyGeneratedSpriteFrames(generatedFrames: Map<string, SpriteFrame>): void {
  for (const spriteFrame of generatedFrames.values()) {
    if (spriteFrame?.isValid) {
      spriteFrame.destroy();
    }
  }

  generatedFrames.clear();
}
