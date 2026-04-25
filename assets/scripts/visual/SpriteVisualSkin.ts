import { Color, Component, Graphics, Label, Mask, Node, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';
import { RectVisual } from './RectVisual';

const VISUAL_ART_NODE_NAME = 'SpriteSkin';
const VISUAL_MASK_NODE_NAME = 'SpriteMask';

export enum PlaceholderSpriteFitMode {
  Stretch = 0,
  Contain = 1,
  Cover = 2,
}

export enum PlaceholderSpriteVerticalAnchor {
  Center = 0,
  Bottom = 1,
}

export enum PlaceholderSpriteMaskShape {
  None = 0,
  Rect = 1,
  Ellipse = 2,
  RoundedRect = 3,
}

type OptionalComponentType<T extends Component> = (new (...args: any[]) => T) | null | undefined;

function getComponentSafely<T extends Component>(
  node: Node,
  componentType: OptionalComponentType<T>,
): T | null {
  if (!componentType) {
    return null;
  }

  return node.getComponent(componentType);
}

function getOrAddComponentSafely<T extends Component>(
  node: Node,
  componentType: OptionalComponentType<T>,
): T | null {
  if (!componentType) {
    return null;
  }

  return node.getComponent(componentType) ?? node.addComponent(componentType);
}

function redrawRoundedRectMask(graphics: Graphics, width: number, height: number, cornerRadius = 0): void {
  const radius = Math.max(0, Math.min(cornerRadius, width * 0.5, height * 0.5));
  const x = -width * 0.5;
  const y = -height * 0.5;
  graphics.clear();
  if (radius > 0) {
    graphics.roundRect(x, y, width, height, radius);
  } else {
    graphics.rect(x, y, width, height);
  }

  graphics.fillColor = new Color(255, 255, 255, 255);
  graphics.fill();
}

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

function resolveArtNode(visualNode: Node | null): Node | null {
  if (!visualNode?.isValid) {
    return null;
  }

  const directArtNode = visualNode.getChildByName(VISUAL_ART_NODE_NAME);
  if (directArtNode?.isValid) {
    return directArtNode;
  }

  const maskNode = visualNode.getChildByName(VISUAL_MASK_NODE_NAME);
  return maskNode?.getChildByName(VISUAL_ART_NODE_NAME) ?? null;
}

function ensureSpriteMaskHost(
  visualNode: Node,
  visualTransform: UITransform | null,
  options: {
    maskShape?: PlaceholderSpriteMaskShape;
    maskEllipseSegments?: number;
    maskCornerRadius?: number;
  },
): Node {
  const maskShape = options.maskShape ?? PlaceholderSpriteMaskShape.None;
  const existingMaskNode = visualNode.getChildByName(VISUAL_MASK_NODE_NAME);
  if (maskShape === PlaceholderSpriteMaskShape.None) {
    if (existingMaskNode?.isValid) {
      existingMaskNode.active = false;
    }

    return visualNode;
  }

  let maskNode = existingMaskNode;
  if (!maskNode?.isValid) {
    maskNode = new Node(VISUAL_MASK_NODE_NAME);
    maskNode.layer = visualNode.layer;
    visualNode.addChild(maskNode);
  }

  maskNode.active = true;
  maskNode.layer = visualNode.layer;
  maskNode.setPosition(0, 0, 0);
  maskNode.setRotationFromEuler(0, 0, 0);
  maskNode.setScale(1, 1, 1);

  const maskTransform = getOrAddComponentSafely(maskNode, UITransform);
  if (!maskTransform) {
    maskNode.active = false;
    return visualNode;
  }

  if (visualTransform) {
    maskTransform.setContentSize(visualTransform.contentSize);
  }

  const mask = getOrAddComponentSafely(maskNode, Mask);
  if (!mask) {
    maskNode.active = false;
    return visualNode;
  }

  if (maskShape === PlaceholderSpriteMaskShape.RoundedRect) {
    mask.type = Mask.Type.GRAPHICS_STENCIL;
    const graphics = getOrAddComponentSafely(maskNode, Graphics);
    if (!graphics) {
      maskNode.active = false;
      return visualNode;
    }

    redrawRoundedRectMask(
      graphics,
      maskTransform.contentSize.width,
      maskTransform.contentSize.height,
      options.maskCornerRadius ?? 0,
    );
  } else {
    mask.type = maskShape === PlaceholderSpriteMaskShape.Ellipse
      ? Mask.Type.GRAPHICS_ELLIPSE
      : Mask.Type.GRAPHICS_RECT;
  }

  if (maskShape === PlaceholderSpriteMaskShape.Ellipse) {
    mask.segments = Math.max(12, options.maskEllipseSegments ?? 48);
  }

  return maskNode;
}

export function applySpriteFrameToPlaceholderVisual(
  rootOrVisualNode: Node | null,
  spriteFrame: SpriteFrame | null,
  options: {
    spriteType?: number;
    fitMode?: PlaceholderSpriteFitMode;
    verticalAnchor?: PlaceholderSpriteVerticalAnchor;
    scaleMultiplier?: number;
    maskShape?: PlaceholderSpriteMaskShape;
    maskEllipseSegments?: number;
    maskCornerRadius?: number;
  } = {},
): void {
  if (!rootOrVisualNode?.isValid || !spriteFrame) {
    return;
  }

  const visualNode = resolveVisualNode(rootOrVisualNode);
  if (!visualNode?.isValid) {
    return;
  }

  const visualTransform = getComponentSafely(visualNode, UITransform);
  const artParent = ensureSpriteMaskHost(visualNode, visualTransform, options);
  let artNode = resolveArtNode(visualNode);
  if (!artNode?.isValid) {
    artNode = new Node(VISUAL_ART_NODE_NAME);
    artNode.layer = visualNode.layer;
    artParent.addChild(artNode);
  } else if (artNode.parent !== artParent) {
    artParent.addChild(artNode);
  }

  artNode.setPosition(0, 0, 0);
  artNode.setRotationFromEuler(0, 0, 0);
  artNode.setScale(1, 1, 1);
  artNode.active = true;

  const artTransform = getOrAddComponentSafely(artNode, UITransform);
  const sprite = getOrAddComponentSafely(artNode, Sprite);
  if (!artTransform || !sprite) {
    return;
  }

  sprite.type = options.spriteType ?? Sprite.Type.SIMPLE;
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  sprite.spriteFrame = spriteFrame;

  if (visualTransform) {
    applySpriteArtLayout(artNode, artTransform, visualTransform, spriteFrame, sprite, options);
  }

  const rectVisual = getComponentSafely(visualNode, RectVisual);
  if (rectVisual) {
    rectVisual.drawFill = false;
    rectVisual.drawStroke = false;
    rectVisual.requestRedraw();
  }
}

function applySpriteArtLayout(
  artNode: Node,
  artTransform: UITransform,
  visualTransform: UITransform,
  spriteFrame: SpriteFrame,
  sprite: Sprite,
  options: {
    spriteType?: number;
    fitMode?: PlaceholderSpriteFitMode;
    verticalAnchor?: PlaceholderSpriteVerticalAnchor;
    scaleMultiplier?: number;
    maskShape?: PlaceholderSpriteMaskShape;
    maskEllipseSegments?: number;
    maskCornerRadius?: number;
  },
): void {
  const visualWidth = Math.max(1, visualTransform.contentSize.width);
  const visualHeight = Math.max(1, visualTransform.contentSize.height);
  const scaleMultiplier = Math.max(0.01, options.scaleMultiplier ?? 1);
  const fitMode = options.fitMode ?? PlaceholderSpriteFitMode.Stretch;

  if (sprite.type === Sprite.Type.TILED || fitMode === PlaceholderSpriteFitMode.Stretch) {
    artTransform.setContentSize(visualTransform.contentSize);
    artNode.setPosition(0, 0, 0);
    artNode.setScale(scaleMultiplier, scaleMultiplier, 1);
    return;
  }

  const frameWidth = Math.max(1, spriteFrame.rect?.width ?? spriteFrame.originalSize?.width ?? visualWidth);
  const frameHeight = Math.max(1, spriteFrame.rect?.height ?? spriteFrame.originalSize?.height ?? visualHeight);
  const widthScale = visualWidth / frameWidth;
  const heightScale = visualHeight / frameHeight;
  const baseScale = fitMode === PlaceholderSpriteFitMode.Contain
    ? Math.min(widthScale, heightScale)
    : Math.max(widthScale, heightScale);
  const appliedScale = Math.max(0.01, baseScale * scaleMultiplier);
  const scaledHeight = frameHeight * appliedScale;
  const verticalAnchor = options.verticalAnchor ?? PlaceholderSpriteVerticalAnchor.Center;
  const anchoredY = verticalAnchor === PlaceholderSpriteVerticalAnchor.Bottom
    ? (scaledHeight - visualHeight) * 0.5
    : 0;

  artTransform.setContentSize(frameWidth, frameHeight);
  artNode.setPosition(0, anchoredY, 0);
  artNode.setScale(appliedScale, appliedScale, 1);
}

function isDeveloperOnlyLabel(node: Node): boolean {
  // Nodes whose names embed "debug", "dev-" or "test-" are scaffolding for
  // developers (placeholder text such as "BOX" / "FLOWER" / ">>"). They are
  // never meant to reach a tester or player even when the visual skin is still
  // in placeholder mode (no spriteFrame bound). Treating them as visible-by-
  // default would re-light DebugLabel children that the prefabs / scenes have
  // explicitly deactivated.
  const name = (node?.name ?? '').toLowerCase();
  return name.includes('debug') || name.includes('dev-') || name.includes('test-');
}

function isPlaceholderLabelNode(node: Node | null): node is Node {
  if (!node?.isValid) {
    return false;
  }

  return node.name.endsWith('-Label')
    || node.name === 'DebugLabel'
    || !!getComponentSafely(node, Label);
}

function setPlaceholderLabelNodeVisible(labelNode: Node, visible: boolean): void {
  const directLabel = getComponentSafely(labelNode, Label);
  if (directLabel) {
    directLabel.enabled = visible;
  }

  labelNode.active = isDeveloperOnlyLabel(labelNode) ? false : visible;
}

export function setPlaceholderLabelVisible(rootNode: Node | null, visible: boolean): void {
  if (!rootNode?.isValid) {
    return;
  }

  if (isPlaceholderLabelNode(rootNode)) {
    setPlaceholderLabelNodeVisible(rootNode, visible);
  }

  const labelNodes = new Set<Node>();

  for (const child of rootNode.children) {
    if (isPlaceholderLabelNode(child)) {
      labelNodes.add(child);
    }
  }

  const shouldInspectSiblingLabels = rootNode.parent?.isValid
    && rootNode.name.toLowerCase().includes('visual');
  if (shouldInspectSiblingLabels) {
    for (const sibling of rootNode.parent!.children) {
      if (sibling === rootNode || !isPlaceholderLabelNode(sibling)) {
        continue;
      }

      labelNodes.add(sibling);
    }
  }

  for (const labelNode of labelNodes) {
    setPlaceholderLabelNodeVisible(labelNode, visible);
  }
}

export function setPlaceholderVisualFlipX(rootOrVisualNode: Node | null, flipped: boolean): void {
  const visualNode = resolveVisualNode(rootOrVisualNode);
  if (!visualNode?.isValid) {
    return;
  }

  const artNode = resolveArtNode(visualNode) ?? visualNode;
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
