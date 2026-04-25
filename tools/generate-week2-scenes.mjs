import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { loadAssetBindingCatalog, resolveAssetBinding, resolveImageAssetReference } from './asset-binding-manifest-utils.mjs';

const PROJECT_ROOT = process.cwd();
const ASSETS_ROOT = path.join(PROJECT_ROOT, 'assets');
const SCRIPTS_ROOT = path.join(ASSETS_ROOT, 'scripts');
const SCENES_ROOT = path.join(ASSETS_ROOT, 'scenes');

const TYPESCRIPT_META_VERSION = '4.0.24';
const ASSET_META_VERSION = '1.1.50';
const UI_LAYER = 33554432;
const SCENE_DRESSING_FIT = {
  STRETCH: 0,
  CONTAIN: 1,
  COVER: 2,
};
const SCENE_DRESSING_VERTICAL_ANCHOR = {
  CENTER: 0,
  BOTTOM: 1,
};
const SCENE_DRESSING_MASK = {
  NONE: 0,
  RECT: 1,
  ELLIPSE: 2,
  ROUNDED_RECT: 3,
};
const COCOS_TEMPLATE_SCENE = path.join(
  'C:',
  'Users',
  'yangp',
  'Apps',
  'CocosCreator',
  '3.8.8',
  'resources',
  'resources',
  '3d',
  'engine',
  'editor',
  'assets',
  'default_file_content',
  'scene',
  'scene-2d.scene',
);

function ref(id) {
  return { __id__: id };
}

function vec2(x = 0, y = 0) {
  return { __type__: 'cc.Vec2', x, y };
}

function vec3(x = 0, y = 0, z = 0) {
  return { __type__: 'cc.Vec3', x, y, z };
}

function quat(x = 0, y = 0, z = 0, w = 1) {
  return { __type__: 'cc.Quat', x, y, z, w };
}

function quatFromZDegrees(zDegrees = 0) {
  const radians = zDegrees * Math.PI / 180;
  const halfRadians = radians * 0.5;
  return quat(0, 0, Math.sin(halfRadians), Math.cos(halfRadians));
}

function size(width, height) {
  return { __type__: 'cc.Size', width, height };
}

function color(r, g, b, a = 255) {
  return { __type__: 'cc.Color', r, g, b, a };
}

function randomToken() {
  return randomUUID().replace(/-/g, '').slice(0, 22);
}

function compressUuid(uuid) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const source = uuid.replace(/-/g, '');
  let output = source.slice(0, 5);

  for (let index = 5; index < source.length; index += 3) {
    const h1 = Number.parseInt(source[index], 16);
    const h2 = Number.parseInt(source[index + 1], 16);
    const h3 = Number.parseInt(source[index + 2], 16);
    output += chars[(h1 << 2) | (h2 >> 2)];
    output += chars[((h2 & 3) << 4) | h3];
  }

  return output;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureMeta(filePath, importer, options = {}) {
  const metaPath = `${filePath}.meta`;
  if (await fileExists(metaPath)) {
    return readJson(metaPath);
  }

  const meta = importer === 'typescript'
    ? {
        ver: TYPESCRIPT_META_VERSION,
        importer,
        imported: true,
        uuid: randomUUID(),
        files: [],
        subMetas: {},
        userData: {},
      }
    : {
        ver: ASSET_META_VERSION,
        importer,
        imported: true,
        uuid: randomUUID(),
        files: ['.json'],
        subMetas: {},
        userData: options.userData ?? {},
      };

  await writeJson(metaPath, meta);
  return meta;
}

async function walkFiles(rootDir, predicate) {
  const result = [];
  const entries = await fs.readdir(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await walkFiles(fullPath, predicate)));
      continue;
    }

    if (predicate(fullPath)) {
      result.push(fullPath);
    }
  }

  return result;
}

async function ensureScriptMetas() {
  const scripts = await walkFiles(SCRIPTS_ROOT, (filePath) => filePath.endsWith('.ts'));
  const map = new Map();

  for (const scriptPath of scripts) {
    const meta = await ensureMeta(scriptPath, 'typescript');
    const relativePath = path.relative(PROJECT_ROOT, scriptPath).replace(/\\/g, '/');
    map.set(relativePath, {
      uuid: meta.uuid,
      shortId: compressUuid(meta.uuid),
    });
  }

  return map;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createNode(name, parentId, position = vec3(), active = true, layer = UI_LAYER) {
  return {
    __type__: 'cc.Node',
    _name: name,
    _objFlags: 0,
    _parent: parentId === null ? null : ref(parentId),
    _children: [],
    _active: active,
    _components: [],
    _prefab: null,
    _lpos: position,
    _lrot: quat(),
    _lscale: vec3(1, 1, 1),
    _layer: layer,
    _euler: vec3(),
    _id: randomToken(),
  };
}

function createSceneComponent(nodeId, type, props = {}) {
  return {
    __type__: type,
    _name: '',
    _objFlags: 0,
    node: ref(nodeId),
    _enabled: true,
    __prefab: null,
    ...props,
    _id: '',
  };
}

function rectVisualProps(fillColorValue, strokeColorValue, cornerRadius = 10, strokeWidth = 2) {
  return {
    fillColor: fillColorValue,
    strokeColor: strokeColorValue,
    strokeWidth,
    cornerRadius,
    drawFill: true,
    drawStroke: strokeWidth > 0,
  };
}

async function getPrefabIds() {
  const echoBoxMeta = await ensureMeta(path.join(ASSETS_ROOT, 'prefabs', 'EchoBox.prefab'), 'prefab');
  const springFlowerMeta = await ensureMeta(path.join(ASSETS_ROOT, 'prefabs', 'EchoSpringFlower.prefab'), 'prefab');
  const bombBugMeta = await ensureMeta(path.join(ASSETS_ROOT, 'prefabs', 'EchoBombBug.prefab'), 'prefab');
  const arrowProjectileMeta = await ensureMeta(path.join(ASSETS_ROOT, 'prefabs', 'ArrowProjectile.prefab'), 'prefab');

  return {
    echoBoxUuid: echoBoxMeta.uuid,
    springFlowerUuid: springFlowerMeta.uuid,
    bombBugUuid: bombBugMeta.uuid,
    arrowProjectileUuid: arrowProjectileMeta.uuid,
  };
}

async function createSceneBuilder(sceneName, scriptIds, prefabIds, options) {
  const bindingCatalog = options.bindingCatalog ?? await loadAssetBindingCatalog(PROJECT_ROOT);
  const scenePath = path.join(SCENES_ROOT, `${sceneName}.scene`);
  const sceneMeta = await ensureMeta(scenePath, 'scene');
  const template = clone(await readJson(COCOS_TEMPLATE_SCENE));
  template[0]._name = sceneName;
  template[1]._name = sceneName;
  template[1]._id = sceneMeta.uuid;

  const items = template;
  const add = (value) => {
    items.push(value);
    return items.length - 1;
  };

  const canvasId = 2;
  const cameraId = 3;
  const canvasNode = items[canvasId];
  const cameraComponent = items[4];
  const canvasTransform = items[5];
  const canvasComponent = items[6];
  const widgetComponent = items[7];

  canvasNode._name = 'Canvas';
  canvasNode._children = [ref(cameraId)];
  cameraComponent._color = color(247, 242, 221, 255);
  cameraComponent._clearFlags = 7;
  canvasTransform._contentSize = size(960, 640);
  canvasComponent._cameraComponent = ref(4);
  widgetComponent._top = 0;
  widgetComponent._bottom = 0;

  const types = Object.fromEntries(
    Array.from(scriptIds.entries()).map(([relativePath, value]) => [relativePath, value.shortId]),
  );
  const imageBindingPropsCache = new Map();

  const addNode = (name, parentId, position = vec3(), active = true, layer = UI_LAYER) => {
    const nodeId = add(createNode(name, parentId, position, active, layer));
    items[parentId]._children.push(ref(nodeId));
    return nodeId;
  };

  const setNodeRotation = (nodeId, rotationDegrees = 0) => {
    items[nodeId]._euler = vec3(0, 0, rotationDegrees);
    items[nodeId]._lrot = quatFromZDegrees(rotationDegrees);
  };

  const addComponent = (nodeId, type, props = {}) => {
    const componentId = add(createSceneComponent(nodeId, type, props));
    items[nodeId]._components.push(ref(componentId));
    return componentId;
  };

  const addAssetBindingTag = (nodeId, bindingKey) => {
    const binding = resolveAssetBinding(bindingCatalog, bindingKey);
    if (!binding) {
      return null;
    }

    return addComponent(nodeId, types['assets/scripts/core/AssetBindingTag.ts'], {
      bindingKey: binding.bindingKey,
      selectedPath: binding.selectedPath,
      fallbackPath: binding.fallbackPath,
      sourceManifest: binding.sourceManifest,
      bindingStatus: binding.bindingStatus,
    });
  };

  const getImageBindingProps = (bindingKey) => {
    if (!bindingKey) {
      return null;
    }

    if (imageBindingPropsCache.has(bindingKey)) {
      return imageBindingPropsCache.get(bindingKey);
    }

    const binding = resolveAssetBinding(bindingCatalog, bindingKey);
    const initialValue = {
      binding,
      spriteFrame: null,
      texture: null,
    };

    if (!binding?.selectedPath) {
      imageBindingPropsCache.set(bindingKey, initialValue);
      return initialValue;
    }

    const imageAssetReference = resolveImageAssetReference(PROJECT_ROOT, binding.selectedPath);
    if (!imageAssetReference) {
      imageBindingPropsCache.set(bindingKey, initialValue);
      return initialValue;
    }

    const resolvedValue = {
      binding,
      spriteFrame: imageAssetReference.propertyName === 'spriteFrame' ? imageAssetReference.assetRef : null,
      texture: imageAssetReference.propertyName === 'texture' ? imageAssetReference.assetRef : null,
    };
    imageBindingPropsCache.set(bindingKey, resolvedValue);
    return resolvedValue;
  };

  const addSceneDressingSkin = (nodeId, bindingKey, options = {}) => {
    const imageBinding = getImageBindingProps(bindingKey);
    if (!imageBinding) {
      return null;
    }

    if (options.addBindingTag !== false) {
      addAssetBindingTag(nodeId, bindingKey);
    }

    const defaultFitMode = options.tiled === false && bindingKey.startsWith('outdoor_wall_')
      ? SCENE_DRESSING_FIT.COVER
      : options.tiled === false && bindingKey.startsWith('barrier_')
        ? SCENE_DRESSING_FIT.CONTAIN
        : SCENE_DRESSING_FIT.STRETCH;
    const defaultVerticalAnchor = options.tiled === false
      ? SCENE_DRESSING_VERTICAL_ANCHOR.BOTTOM
      : SCENE_DRESSING_VERTICAL_ANCHOR.CENTER;

    return addComponent(nodeId, types['assets/scripts/visual/SceneDressingSkin.ts'], {
      visualRoot: options.visualRootId ? ref(options.visualRootId) : null,
      spriteFrame: imageBinding.spriteFrame,
      texture: imageBinding.texture,
      hideLabelWhenSkinned: options.hideLabelWhenSkinned ?? false,
      tiled: options.tiled ?? true,
      fitMode: options.fitMode ?? defaultFitMode,
      verticalAnchor: options.verticalAnchor ?? defaultVerticalAnchor,
      scaleMultiplier: options.scaleMultiplier ?? (options.tiled === false ? 1.04 : 1),
      maskShape: options.maskShape ?? SCENE_DRESSING_MASK.NONE,
      maskEllipseSegments: options.maskEllipseSegments ?? 48,
      maskCornerRadius: options.maskCornerRadius ?? 0,
    });
  };

  const addHudPanelSkin = (nodeId, bindingKey) => {
    const imageBinding = getImageBindingProps(bindingKey);
    if (!imageBinding) {
      return null;
    }

    addAssetBindingTag(nodeId, bindingKey);
    return addComponent(nodeId, types['assets/scripts/visual/HudPanelSkin.ts'], {
      visualSpriteFrame: imageBinding.spriteFrame,
      visualTexture: imageBinding.texture,
      hideLabelWhenSkinned: true,
    });
  };

  const addSafeAreaRoot = (nodeId, width = 960, height = 640) => {
    addComponent(nodeId, 'cc.UITransform', {
      _priority: 0,
      _contentSize: size(width, height),
      _anchorPoint: vec2(0.5, 0.5),
    });
    addComponent(nodeId, 'cc.Widget', {
      _alignFlags: 45,
      _target: null,
      _left: 0,
      _right: 0,
      _top: 0,
      _bottom: 0,
      _horizontalCenter: 0,
      _verticalCenter: 0,
      _isAbsLeft: true,
      _isAbsRight: true,
      _isAbsTop: true,
      _isAbsBottom: true,
      _isAbsHorizontalCenter: true,
      _isAbsVerticalCenter: true,
      _originalWidth: 0,
      _originalHeight: 0,
      _alignMode: 2,
      _lockFlags: 0,
    });
    addComponent(nodeId, 'cc.SafeArea', {
      _symmetric: true,
    });
  };

  const addPanelNode = (
    parentId,
    name,
    position,
    width,
    height,
    fillColorValue,
    strokeColorValue,
    active = true,
    cornerRadius = 18,
    rotationDegrees = 0,
  ) => {
    const nodeId = addNode(name, parentId, position, active);
    addComponent(nodeId, 'cc.UITransform', {
      _priority: 0,
      _contentSize: size(width, height),
      _anchorPoint: vec2(0.5, 0.5),
    });
    addComponent(
      nodeId,
      types['assets/scripts/visual/RectVisual.ts'],
      rectVisualProps(fillColorValue, strokeColorValue, cornerRadius, 2),
    );
    setNodeRotation(nodeId, rotationDegrees);
    return { nodeId };
  };

  const addDecorPanels = (parentId, prefix, decorations) => decorations.map((decor, index) => addPanelNode(
    parentId,
    `${prefix}-${index + 1}`,
    decor.position,
    decor.width,
    decor.height,
    decor.fillColor,
    decor.strokeColor,
    decor.active ?? true,
    decor.cornerRadius ?? Math.max(10, Math.round(Math.min(decor.width, decor.height) / 2)),
    decor.rotationDegrees ?? 0,
  ));

  const addSkinnedPanelGroup = (parentId, prefix, bindingKey, panels, skinOptions = {}) => panels.map((panel, index) => {
    const panelNode = addPanelNode(
      parentId,
      panel.name ?? `${prefix}-${index + 1}`,
      panel.position,
      panel.width,
      panel.height,
      panel.fillColor,
      panel.strokeColor,
      panel.active ?? true,
      panel.cornerRadius ?? Math.max(12, Math.round(Math.min(panel.width, panel.height) / 5)),
      panel.rotationDegrees ?? 0,
    );
    addSceneDressingSkin(panelNode.nodeId, bindingKey, {
      ...skinOptions,
      ...(panel.skinOptions ?? {}),
      addBindingTag: panel.addBindingTag ?? index === 0,
    });
    return panelNode;
  });

  const addLabel = (
    parentId,
    name,
    text,
    position,
    width,
    height,
    fontSize = 20,
    tint = color(255, 255, 255, 255),
    active = true,
    isBold = false,
    horizontalAlign = 1,
    verticalAlign = 1,
  ) => {
    const nodeId = addNode(name, parentId, position, active);
    addComponent(nodeId, 'cc.UITransform', {
      _priority: 0,
      _contentSize: size(width, height),
      _anchorPoint: vec2(0.5, 0.5),
    });
    const labelId = addComponent(nodeId, 'cc.Label', {
      _srcBlendFactor: 2,
      _dstBlendFactor: 4,
      _color: tint,
      _sharedMaterial: null,
      _useOriginalSize: true,
      _string: text,
      _horizontalAlign: horizontalAlign,
      _verticalAlign: verticalAlign,
      _actualFontSize: fontSize,
      _fontSize: fontSize,
      _fontFamily: 'Arial',
      _lineHeight: fontSize + 10,
      _overflow: 0,
      _enableWrapText: true,
      _font: null,
      _isSystemFontUsed: true,
      _isItalic: false,
      _isBold: isBold,
      _isUnderline: false,
      _cacheMode: 0,
    });
    return { nodeId, labelId };
  };

  const addLabeledNode = (
    parentId,
    name,
    text,
    position,
    width,
    height,
    fontSize = 20,
    tint = color(255, 255, 255, 255),
    active = true,
    panelFillColor = color(56, 70, 80, 255),
    panelStrokeColor = color(255, 255, 255, 72),
    cornerRadius = 14,
    isBold = true,
  ) => {
    const nodeId = addNode(name, parentId, position, active);
    addComponent(nodeId, 'cc.UITransform', {
      _priority: 0,
      _contentSize: size(width, height),
      _anchorPoint: vec2(0.5, 0.5),
    });
    const visualNodeId = addNode(`${name}-Visual`, nodeId, vec3());
    addComponent(visualNodeId, 'cc.UITransform', {
      _priority: 0,
      _contentSize: size(width, height),
      _anchorPoint: vec2(0.5, 0.5),
    });
    addComponent(
      visualNodeId,
      types['assets/scripts/visual/RectVisual.ts'],
      rectVisualProps(panelFillColor, panelStrokeColor, cornerRadius, 2),
    );
    const labelNodeId = addNode(`${name}-Label`, nodeId, vec3());
    addComponent(labelNodeId, 'cc.UITransform', {
      _priority: 0,
      _contentSize: size(width, height),
      _anchorPoint: vec2(0.5, 0.5),
    });
    const labelId = addComponent(labelNodeId, 'cc.Label', {
      _srcBlendFactor: 2,
      _dstBlendFactor: 4,
      _color: tint,
      _sharedMaterial: null,
      _useOriginalSize: true,
      _string: text,
      _horizontalAlign: 1,
      _verticalAlign: 1,
      _actualFontSize: fontSize,
      _fontSize: fontSize,
      _fontFamily: 'Arial',
      _lineHeight: fontSize + 10,
      _overflow: 0,
      _enableWrapText: true,
      _font: null,
      _isSystemFontUsed: true,
      _isItalic: false,
      _isBold: isBold,
      _isUnderline: false,
      _cacheMode: 0,
    });
    return { nodeId, visualNodeId, labelNodeId, labelId };
  };

  const addSensorBox = (nodeId, width, height) => {
    addComponent(nodeId, 'cc.BoxCollider2D', {
      editing: false,
      tag: 0,
      _group: 1,
      _density: 1,
      _sensor: true,
      _friction: 0.2,
      _restitution: 0,
      _offset: vec2(),
      _size: size(width, height),
    });
  };

  const addDynamicBody = (nodeId, width, height) => {
    addComponent(nodeId, 'cc.RigidBody2D', {
      _group: 1,
      enabledContactListener: true,
      bullet: false,
      _type: 2,
      _allowSleep: true,
      _gravityScale: 0,
      _linearDamping: 0,
      _angularDamping: 0,
      _linearVelocity: vec2(),
      _angularVelocity: 0,
      _fixedRotation: true,
      awakeOnLoad: true,
    });
    addSensorBox(nodeId, width, height);
  };

  const persistentRootId = addNode('PersistentRoot', canvasId, vec3(-420, 260, 0));
  const worldRootId = addNode('WorldRoot', canvasId, vec3());
  const hudRootId = addNode('HudRoot', canvasId, vec3());
  const touchHudRootId = addNode('TouchHudRoot', canvasId, vec3());
  addSafeAreaRoot(hudRootId);
  addSafeAreaRoot(touchHudRootId);

  const playerNode = addLabeledNode(
    worldRootId,
    'Player',
    '小勇者',
    options.playerStart ?? vec3(-420, -20, 0),
    94,
    48,
    20,
    color(18, 26, 34, 255),
    true,
    color(123, 175, 219, 255),
    color(232, 248, 255, 160),
    14,
    true,
  );
  addLabeledNode(
    playerNode.nodeId,
    'PlayerLocatorBadge',
    '你',
    vec3(0, 54, 0),
    46,
    30,
    18,
    color(43, 70, 62, 255),
    true,
    color(255, 248, 208, 240),
    color(36, 148, 132, 240),
    15,
    true,
  );
  addDynamicBody(playerNode.nodeId, 88, 36);
  const playerHealthId = addComponent(playerNode.nodeId, types['assets/scripts/combat/HealthComponent.ts'], {
    maxHealth: 3,
    invulnerableSeconds: 0.4,
    destroyNodeOnDepleted: false,
    deactivateNodeOnDepleted: false,
  });

  const attackAnchorId = addNode('AttackAnchor', playerNode.nodeId, vec3(18, 0, 0));
  addComponent(attackAnchorId, 'cc.UITransform', {
    _priority: 0,
    _contentSize: size(32, 32),
    _anchorPoint: vec2(0.5, 0.5),
  });
  addDynamicBody(attackAnchorId, 32, 32);

  const echoRootId = addNode('EchoRoot', worldRootId, vec3());
  const echoManagerId = addComponent(echoRootId, types['assets/scripts/echo/EchoManager.ts'], {
    entries: [],
    boxPrefab: {
      __uuid__: prefabIds.echoBoxUuid,
      __expectedType__: 'cc.Prefab',
    },
    springFlowerPrefab: {
      __uuid__: prefabIds.springFlowerUuid,
      __expectedType__: 'cc.Prefab',
    },
    bombBugPrefab: {
      __uuid__: prefabIds.bombBugUuid,
      __expectedType__: 'cc.Prefab',
    },
    currentEchoId: 0,
    spawnLimit: 2,
  });

  const playerControllerId = addComponent(playerNode.nodeId, types['assets/scripts/player/PlayerController.ts'], {
    moveSpeed: 220,
    attackDuration: 0.18,
    attackReach: 18,
    attackAnchor: ref(attackAnchorId),
    health: ref(playerHealthId),
    echoManager: ref(echoManagerId),
  });
  const playerImageBinding = getImageBindingProps('player');
  addComponent(playerNode.nodeId, types['assets/scripts/player/PlayerVisualController.ts'], {
    player: ref(playerControllerId),
    health: ref(playerHealthId),
    visualRoot: ref(playerNode.visualNodeId),
    idleSpriteFrame: playerImageBinding?.spriteFrame ?? null,
    idleTexture: playerImageBinding?.texture ?? null,
    moveSpriteFrame: playerImageBinding?.spriteFrame ?? null,
    moveTexture: playerImageBinding?.texture ?? null,
    attackSpriteFrame: playerImageBinding?.spriteFrame ?? null,
    attackTexture: playerImageBinding?.texture ?? null,
    launchSpriteFrame: playerImageBinding?.spriteFrame ?? null,
    launchTexture: playerImageBinding?.texture ?? null,
    hurtSpriteFrame: playerImageBinding?.spriteFrame ?? null,
    hurtTexture: playerImageBinding?.texture ?? null,
    hurtFlashSeconds: 0.18,
    hideLabelWhenSkinned: true,
    mirrorFacing: true,
  });
  addComponent(attackAnchorId, types['assets/scripts/player/AttackHitbox.ts'], {
    player: ref(playerControllerId),
    damage: 1,
    targetNameIncludes: 'Enemy',
  });

  addComponent(worldRootId, types['assets/scripts/core/WorldCameraRig2D.ts'], {
    target: ref(playerNode.nodeId),
    followSharpness: 10,
    offsetX: options.cameraOffsetX ?? -100,
    offsetY: options.cameraOffsetY ?? 0,
    minRigX: options.cameraBounds?.minX ?? -420,
    maxRigX: options.cameraBounds?.maxX ?? 320,
    minRigY: options.cameraBounds?.minY ?? -70,
    maxRigY: options.cameraBounds?.maxY ?? 80,
  });

  const hudTopBar = addPanelNode(hudRootId, 'HudTopBar', vec3(0, 278, 0), 930, 88, color(255, 244, 210, 232), color(255, 219, 142, 96), true, 22);
  const hudObjectiveCard = addPanelNode(hudRootId, 'HudObjectiveCard', vec3(0, 216, 0), 930, 52, color(255, 251, 229, 226), color(255, 230, 158, 88), true, 18);
  const hudControlsCard = addPanelNode(hudRootId, 'HudControlsCard', vec3(0, -274, 0), 930, 54, color(231, 248, 218, 210), color(190, 229, 166, 82), true, 18);
  const sceneTitleLabel = addLabel(hudRootId, 'HudSceneTitle', options.sceneTitle, vec3(-340, 278, 0), 260, 34, 24, color(75, 52, 27, 255), true, true, 0, 1);
  const objectiveLabel = addLabel(hudRootId, 'HudObjective', options.objectiveText, vec3(0, 216, 0), 780, 34, 18, color(72, 80, 44, 255), true, false, 1, 1);
  const healthLabel = addLabel(hudRootId, 'HudHealth', '生命 3/3', vec3(20, 278, 0), 150, 28, 18, color(132, 61, 52, 255), true, true, 1, 1);
  const echoLabel = addLabel(hudRootId, 'HudEcho', '回响 箱子', vec3(206, 278, 0), 240, 28, 18, color(48, 96, 106, 255), true, false, 1, 1);
  const checkpointLabel = addLabel(hudRootId, 'HudCheckpoint', '营火 未激活', vec3(384, 278, 0), 220, 28, 16, color(93, 79, 58, 255), true, false, 1, 1);
  const controlsLabel = addLabel(hudRootId, 'HudControls', '左侧摇杆移动，右侧按钮攻击与召唤', vec3(0, -274, 0), 860, 32, 16, color(61, 88, 64, 255), true, false, 1, 1);

  const addTouchButton = (name, text, position, width, height, tint, fill, stroke, command, parentId = touchHudRootId) => {
    const buttonNode = addLabeledNode(
      parentId,
      name,
      text,
      position,
      width,
      height,
      height >= 60 ? 20 : 16,
      tint,
      true,
      fill,
      stroke,
      height >= 60 ? 20 : 14,
      true,
    );
    addComponent(buttonNode.nodeId, types['assets/scripts/input/TouchCommandButton.ts'], {
      player: ref(playerControllerId),
      command,
      pressedScale: 0.92,
    });
    return buttonNode;
  };

  const joystickNodeId = addNode('Joystick', touchHudRootId, vec3(-346, -222, 0));
  addComponent(joystickNodeId, 'cc.UITransform', {
    _priority: 0,
    _contentSize: size(156, 156),
    _anchorPoint: vec2(0.5, 0.5),
  });
  const joystickVisualId = addNode('Joystick-Visual', joystickNodeId, vec3());
  addComponent(joystickVisualId, 'cc.UITransform', {
    _priority: 0,
    _contentSize: size(148, 148),
    _anchorPoint: vec2(0.5, 0.5),
  });
  addComponent(joystickVisualId, types['assets/scripts/visual/RectVisual.ts'], rectVisualProps(color(234, 248, 222, 188), color(185, 226, 170, 116), 74, 3));
  const joystickKnobId = addNode('Joystick-Knob', joystickNodeId, vec3());
  addComponent(joystickKnobId, 'cc.UITransform', {
    _priority: 0,
    _contentSize: size(62, 62),
    _anchorPoint: vec2(0.5, 0.5),
  });
  addComponent(joystickKnobId, types['assets/scripts/visual/RectVisual.ts'], rectVisualProps(color(95, 184, 158, 255), color(235, 255, 235, 136), 31, 2));
  addComponent(joystickNodeId, types['assets/scripts/input/TouchJoystick.ts'], {
    player: ref(playerControllerId),
    knob: ref(joystickKnobId),
    maxRadius: 56,
    deadzone: 10,
  });

  const touchAttack = addTouchButton('TouchAttack', '攻击', vec3(350, -196, 0), 118, 70, color(31, 18, 12, 255), color(236, 159, 89, 245), color(255, 236, 212, 100), 0);
  const touchPlaceEcho = addTouchButton('TouchPlaceEcho', '召唤', vec3(224, -248, 0), 124, 66, color(18, 27, 16, 255), color(131, 207, 145, 245), color(226, 255, 225, 100), 1);
  const touchRespawn = addTouchButton('TouchRespawn', '复活', vec3(390, -286, 0), 94, 46, color(255, 243, 240, 255), color(111, 69, 74, 225), color(255, 219, 208, 100), 2);
  const touchEchoBox = addTouchButton('TouchEchoBox', '箱子', vec3(182, -154, 0), 82, 42, color(35, 27, 17, 255), color(214, 176, 96, 255), color(255, 236, 186, 100), 3);
  const touchEchoFlower = addTouchButton('TouchEchoFlower', '弹花', vec3(282, -154, 0), 94, 42, color(236, 255, 235, 255), color(67, 146, 88, 255), color(213, 255, 209, 100), 4);
  const touchEchoBomb = addTouchButton('TouchEchoBomb', '炸虫', vec3(388, -154, 0), 88, 42, color(255, 241, 238, 255), color(156, 68, 66, 255), color(255, 209, 200, 100), 5);
  const touchPause = addTouchButton('TouchPause', '暂停', vec3(326, 208, 0), 102, 42, color(241, 247, 255, 255), color(71, 87, 108, 235), color(220, 235, 255, 96), 8);
  const pausePanel = addPanelNode(hudRootId, 'PausePanel', vec3(0, 0, 0), 430, 286, color(255, 246, 222, 242), color(255, 218, 148, 112), false, 26);
  addLabel(pausePanel.nodeId, 'PauseTitle', '暂停', vec3(0, 98, 0), 260, 40, 26, color(75, 52, 27, 255), true, true, 1, 1);
  addLabel(pausePanel.nodeId, 'PauseBody', '继续游玩、回到营火，或返回营地。', vec3(0, 46, 0), 340, 54, 16, color(83, 78, 61, 255), true, false, 1, 1);
  addTouchButton('PauseContinue', '继续', vec3(0, -18, 0), 178, 54, color(22, 34, 19, 255), color(131, 207, 145, 245), color(226, 255, 225, 100), 9, pausePanel.nodeId);
  addTouchButton('PauseRestart', '回营火', vec3(0, -88, 0), 178, 54, color(255, 243, 240, 255), color(111, 69, 74, 225), color(255, 219, 208, 100), 2, pausePanel.nodeId);
  addTouchButton('PauseCamp', '回营地', vec3(0, -158, 0), 198, 54, color(241, 247, 255, 255), color(71, 87, 108, 235), color(220, 235, 255, 96), 10, pausePanel.nodeId);

  const gameManagerId = addComponent(persistentRootId, types['assets/scripts/core/GameManager.ts'], {
    playerRoot: ref(playerNode.nodeId),
    persistOnLoad: false,
  });
  const saveSystemId = addComponent(persistentRootId, types['assets/scripts/core/SaveSystem.ts'], {
    storageKey: 'wisdom-mvp-save',
  });
  const sceneLoaderId = addComponent(persistentRootId, types['assets/scripts/core/SceneLoader.ts'], {});
  addComponent(persistentRootId, types['assets/scripts/audio/SceneMusicController.ts'], {
    sceneLoader: ref(sceneLoaderId),
    musicCueId: options.musicCueId ?? sceneName.toLowerCase(),
    bgmClip: null,
    volume: options.musicVolume ?? 0.72,
    loop: true,
    playOnStart: true,
    stopOnSceneSwitch: true,
    pauseWithGameFlow: true,
  });
  addComponent(persistentRootId, types['assets/scripts/core/PhysicsBootstrap.ts'], {
    enableDebugDraw: false,
  });
  addComponent(persistentRootId, types['assets/scripts/input/KeyboardInputDriver.ts'], {
    player: ref(playerControllerId),
  });
  addComponent(persistentRootId, types['assets/scripts/core/GameSession.ts'], {
    gameManager: ref(gameManagerId),
    saveSystem: ref(saveSystemId),
    echoManager: ref(echoManagerId),
    player: ref(playerControllerId),
    respawnPlayerAtSavedCheckpoint: true,
  });

  addComponent(hudRootId, types['assets/scripts/ui/GameHud.ts'], {
    hudTopBar: ref(hudTopBar.nodeId),
    hudObjectiveCard: ref(hudObjectiveCard.nodeId),
    hudControlsCard: ref(hudControlsCard.nodeId),
    hudSceneTitle: ref(sceneTitleLabel.nodeId),
    hudObjectiveLabel: ref(objectiveLabel.nodeId),
    hudHealthLabel: ref(healthLabel.nodeId),
    hudEchoLabel: ref(echoLabel.nodeId),
    hudCheckpointLabel: ref(checkpointLabel.nodeId),
    hudControlsLabel: ref(controlsLabel.nodeId),
    sceneTitleLabel: ref(sceneTitleLabel.labelId),
    objectiveLabel: ref(objectiveLabel.labelId),
    healthLabel: ref(healthLabel.labelId),
    echoLabel: ref(echoLabel.labelId),
    checkpointLabel: ref(checkpointLabel.labelId),
    controlsLabel: ref(controlsLabel.labelId),
    playerHealth: ref(playerHealthId),
    echoManager: ref(echoManagerId),
    joystick: ref(joystickNodeId),
    attackButton: ref(touchAttack.nodeId),
    summonButton: ref(touchPlaceEcho.nodeId),
    resetButton: ref(touchRespawn.nodeId),
    echoBoxButton: ref(touchEchoBox.nodeId),
    echoFlowerButton: ref(touchEchoFlower.nodeId),
    echoBombButton: ref(touchEchoBomb.nodeId),
    pauseButton: ref(touchPause.nodeId),
    sceneTitle: options.sceneTitle,
    objectiveText: options.objectiveText,
    desktopHintText: 'WASD 移动  J 攻击  K 召唤  Q/E 切换',
    mobileHintText: '左侧摇杆移动，右侧按钮攻击与召唤',
  });

  addComponent(hudRootId, types['assets/scripts/ui/PauseMenuController.ts'], {
    panelRoot: ref(pausePanel.nodeId),
    pauseButton: ref(touchPause.nodeId),
    gameplayTouchNodes: [
      ref(joystickNodeId),
      ref(touchAttack.nodeId),
      ref(touchPlaceEcho.nodeId),
      ref(touchRespawn.nodeId),
      ref(touchEchoBox.nodeId),
      ref(touchEchoFlower.nodeId),
      ref(touchEchoBomb.nodeId),
    ],
  });

  const resetNodes = [];

  return {
    scenePath,
    sceneMeta,
    items,
    types,
    addNode,
    addComponent,
    addAssetBindingTag,
    getImageBindingProps,
    addSceneDressingSkin,
    addPanelNode,
    addDecorPanels,
    addSkinnedPanelGroup,
    addLabel,
    addLabeledNode,
    addSensorBox,
    addDynamicBody,
    roots: {
      persistentRootId,
      worldRootId,
      hudRootId,
      touchHudRootId,
      echoRootId,
    },
    refs: {
      playerNode,
      playerHealthId,
      playerControllerId,
      attackAnchorId,
      echoManagerId,
      sceneLoaderId,
      touchEchoBox,
      touchEchoFlower,
      touchEchoBomb,
      touchPlaceEcho,
      touchAttack,
      touchRespawn,
    },
    resetNodes,
    finalize: async () => {
      addComponent(worldRootId, types['assets/scripts/puzzle/RoomResetController.ts'], {
        resetNodes: resetNodes.map((nodeId) => ref(nodeId)),
        echoManager: ref(echoManagerId),
      });
      await writeJson(scenePath, items);
      await writeJson(`${scenePath}.meta`, sceneMeta);
    },
  };
}

function addEnemy(builder, config) {
  const { addNode, addComponent, addLabeledNode, addDynamicBody, addAssetBindingTag, getImageBindingProps, resetNodes, refs, types } = builder;
  const commonEnemyBinding = getImageBindingProps('common_enemy');
  const patrolPointAId = addNode(`${config.name}-PatrolA`, builder.roots.worldRootId, config.patrolA);
  const patrolPointBId = addNode(`${config.name}-PatrolB`, builder.roots.worldRootId, config.patrolB);
  const enemyNode = addLabeledNode(
    builder.roots.worldRootId,
    config.name,
    config.label ?? 'ENEMY',
    config.position,
    100,
    48,
    20,
    color(255, 242, 239, 255),
    true,
    color(145, 63, 73, 255),
    color(255, 206, 211, 120),
    14,
    true,
  );
  addDynamicBody(enemyNode.nodeId, 88, 36);
  addAssetBindingTag(enemyNode.nodeId, 'common_enemy');
  const enemyHealthId = addComponent(enemyNode.nodeId, types['assets/scripts/combat/HealthComponent.ts'], {
    maxHealth: config.maxHealth ?? 2,
    invulnerableSeconds: 0.2,
    destroyNodeOnDepleted: false,
    deactivateNodeOnDepleted: true,
  });
  const enemyAiId = addComponent(enemyNode.nodeId, types['assets/scripts/enemy/EnemyAI.ts'], {
    initialState: 1,
    moveSpeed: config.moveSpeed ?? 80,
    chaseDistance: config.chaseDistance ?? 120,
    target: ref(refs.playerNode.nodeId),
    patrolPoints: [ref(patrolPointAId), ref(patrolPointBId)],
  });
  addComponent(enemyNode.nodeId, types['assets/scripts/enemy/EnemyVisualController.ts'], {
    enemyAI: ref(enemyAiId),
    health: ref(enemyHealthId),
    visualRoot: ref(enemyNode.visualNodeId),
    idleSpriteFrame: commonEnemyBinding?.spriteFrame ?? null,
    idleTexture: commonEnemyBinding?.texture ?? null,
    patrolSpriteFrame: commonEnemyBinding?.spriteFrame ?? null,
    patrolTexture: commonEnemyBinding?.texture ?? null,
    chaseSpriteFrame: commonEnemyBinding?.spriteFrame ?? null,
    chaseTexture: commonEnemyBinding?.texture ?? null,
    hurtSpriteFrame: commonEnemyBinding?.spriteFrame ?? null,
    hurtTexture: commonEnemyBinding?.texture ?? null,
    defeatedSpriteFrame: commonEnemyBinding?.spriteFrame ?? null,
    defeatedTexture: commonEnemyBinding?.texture ?? null,
    hurtFlashSeconds: 0.18,
    hideLabelWhenSkinned: true,
    mirrorFacing: true,
  });
  addComponent(enemyNode.nodeId, types['assets/scripts/combat/DamageOnContact.ts'], {
    damage: 1,
    targetNameIncludes: 'Player',
    destroyAfterHit: false,
  });
  resetNodes.push(enemyNode.nodeId);
  return enemyNode;
}

function addCheckpoint(builder, config) {
  const { addAssetBindingTag, addComponent, addLabeledNode, addSensorBox, getImageBindingProps, resetNodes, types } = builder;
  const checkpointImageBinding = getImageBindingProps('checkpoint');
  const visualOffset = config.visualOffset ?? vec3(0, 58, 0);
  const checkpointNode = addLabeledNode(
    builder.roots.worldRootId,
    config.name,
    config.label ?? 'CHECK',
    config.position,
    116,
    42,
    18,
    color(53, 41, 12, 255),
    true,
    color(244, 209, 114, 255),
    color(255, 245, 198, 150),
    12,
    true,
  );
  builder.items[checkpointNode.visualNodeId]._lpos = visualOffset;
  builder.items[checkpointNode.labelNodeId]._lpos = visualOffset;
  addSensorBox(checkpointNode.nodeId, 112, 36);
  addComponent(checkpointNode.nodeId, types['assets/scripts/core/CheckpointMarker.ts'], {
    markerId: config.markerId,
    playerNameIncludes: 'Player',
    visualSpriteFrame: checkpointImageBinding?.spriteFrame ?? null,
    visualTexture: checkpointImageBinding?.texture ?? null,
  });
  addAssetBindingTag(checkpointNode.nodeId, 'checkpoint');
  resetNodes.push(checkpointNode.nodeId);
  return checkpointNode;
}

function addScenePortal(builder, config) {
  const { addAssetBindingTag, addComponent, addLabeledNode, addSensorBox, getImageBindingProps, refs, resetNodes, types } = builder;
  const portalImageBinding = getImageBindingProps('portal');
  const portalNode = addLabeledNode(
    builder.roots.worldRootId,
    config.name,
    config.label,
    config.position,
    config.width ?? 184,
    config.height ?? 48,
    18,
    color(236, 247, 255, 255),
    config.active ?? true,
    config.fillColor ?? color(195, 149, 112, 228),
    config.strokeColor ?? color(255, 244, 220, 118),
    16,
    true,
  );
  addSensorBox(portalNode.nodeId, config.width ?? 180, config.height ?? 42);
  addComponent(portalNode.nodeId, types['assets/scripts/core/ScenePortal.ts'], {
    sceneLoader: ref(refs.sceneLoaderId),
    targetScene: config.targetScene,
    targetMarkerId: config.targetMarkerId,
    targetPositionX: config.targetPosition.x,
    targetPositionY: config.targetPosition.y,
    targetPositionZ: config.targetPosition.z ?? 0,
    preloadTarget: true,
    playerNameIncludes: 'Player',
    visualSpriteFrame: portalImageBinding?.spriteFrame ?? null,
    visualTexture: portalImageBinding?.texture ?? null,
  });
  addAssetBindingTag(portalNode.nodeId, 'portal');
  resetNodes.push(portalNode.nodeId);
  return portalNode;
}

function addEchoPickup(builder, config) {
  const { addAssetBindingTag, addComponent, addLabeledNode, addSensorBox, getImageBindingProps, refs, resetNodes, types } = builder;
  const imageBinding = config.bindingKey ? getImageBindingProps(config.bindingKey) : null;
  const pickupNode = addLabeledNode(
    builder.roots.worldRootId,
    config.name,
    config.label,
    config.position,
    config.width ?? 176,
    42,
    18,
    config.tint ?? color(235, 255, 235, 255),
    true,
    config.fillColor ?? color(66, 128, 80, 255),
    config.strokeColor ?? color(203, 255, 215, 100),
    14,
    true,
  );
  addSensorBox(pickupNode.nodeId, (config.width ?? 176) - 20, 36);
  addComponent(pickupNode.nodeId, types['assets/scripts/visual/CollectiblePresentation.ts'], {
    visualSpriteFrame: imageBinding?.spriteFrame ?? null,
    visualTexture: imageBinding?.texture ?? null,
    pickupClip: null,
    pickupClipVolume: 1,
    hideLabelWhenSkinned: true,
  });
  addComponent(pickupNode.nodeId, types['assets/scripts/echo/EchoUnlockPickup.ts'], {
    echoManager: ref(refs.echoManagerId),
    echoId: config.echoId,
    playerNameIncludes: 'Player',
    selectAfterUnlock: true,
    destroyOnPickup: true,
  });
  if (config.bindingKey) {
    addAssetBindingTag(pickupNode.nodeId, config.bindingKey);
  }
  resetNodes.push(pickupNode.nodeId);
  return pickupNode;
}

function addProgressFlagPickup(builder, config) {
  const { addAssetBindingTag, addComponent, addLabeledNode, addSensorBox, getImageBindingProps, resetNodes, types } = builder;
  const imageBinding = getImageBindingProps(config.bindingKey ?? 'pickup_relic');
  const pickupNode = addLabeledNode(
    builder.roots.worldRootId,
    config.name,
    config.label,
    config.position,
    config.width ?? 184,
    42,
    18,
    config.tint ?? color(255, 248, 230, 255),
    true,
    config.fillColor ?? color(126, 98, 53, 255),
    config.strokeColor ?? color(255, 232, 184, 100),
    14,
    true,
  );
  addSensorBox(pickupNode.nodeId, (config.width ?? 184) - 20, 36);
  addComponent(pickupNode.nodeId, types['assets/scripts/visual/CollectiblePresentation.ts'], {
    visualSpriteFrame: imageBinding?.spriteFrame ?? null,
    visualTexture: imageBinding?.texture ?? null,
    pickupClip: null,
    pickupClipVolume: 1,
    hideLabelWhenSkinned: true,
  });
  addComponent(pickupNode.nodeId, types['assets/scripts/core/ProgressFlagPickup.ts'], {
    flagId: config.flagId,
    playerNameIncludes: 'Player',
    activateOnCollected: (config.activateOnCollected ?? []).map((nodeId) => ref(nodeId)),
    deactivateOnCollected: (config.deactivateOnCollected ?? []).map((nodeId) => ref(nodeId)),
    destroyOnCollected: config.destroyOnCollected ?? true,
  });
  addAssetBindingTag(pickupNode.nodeId, config.bindingKey ?? 'pickup_relic');
  resetNodes.push(pickupNode.nodeId);
  return pickupNode;
}

function addFlagGateController(builder, config) {
  const controllerNodeId = builder.addNode(
    config.name ?? 'FlagGateController',
    builder.roots.worldRootId,
    config.position ?? vec3(),
  );
  builder.addComponent(controllerNodeId, builder.types['assets/scripts/core/FlagGateController.ts'], {
    requiredFlags: config.requiredFlags ?? [],
    activateWhenReady: (config.activateWhenReady ?? []).map((nodeId) => ref(nodeId)),
    deactivateWhenReady: (config.deactivateWhenReady ?? []).map((nodeId) => ref(nodeId)),
    activeWhenIncomplete: config.activeWhenIncomplete ?? true,
  });
  return { nodeId: controllerNodeId };
}

async function generateStartCamp(scriptIds, prefabIds) {
  const builder = await createSceneBuilder('StartCamp', scriptIds, prefabIds, {
    musicCueId: 'camp',
    sceneTitle: '营地入口',
    objectiveText: '召唤箱子压住机关，打开西侧栅门',
    playerStart: vec3(-480, -20, 0),
    cameraBounds: { minX: -420, maxX: 420, minY: -70, maxY: 90 },
    cameraOffsetX: -80,
  });

  const { addPanelNode, addDecorPanels, addLabeledNode, addComponent, addSceneDressingSkin, addSensorBox, addSkinnedPanelGroup, resetNodes, roots, types } = builder;

  const campBackdrop = addPanelNode(roots.worldRootId, 'CampBackdrop', vec3(24, 0, 0), 2240, 620, color(235, 243, 222, 255), color(249, 244, 228, 54), true, 18);
  const campTopLane = addPanelNode(roots.worldRootId, 'CampTopLane', vec3(212, 188, 0), 1580, 88, color(229, 244, 229, 182), color(248, 252, 237, 42), true, 12);
  addSceneDressingSkin(campBackdrop.nodeId, 'outdoor_ground_flowers', { tiled: true });
  addSceneDressingSkin(campTopLane.nodeId, 'outdoor_wall_standard', { tiled: true });
  addSkinnedPanelGroup(roots.worldRootId, 'CampPath', 'outdoor_path_cobble', [
    {
      name: 'CampPath-0',
      position: vec3(-554, -60, 0),
      width: 182,
      height: 112,
      fillColor: color(249, 232, 198, 210),
      strokeColor: color(255, 243, 212, 58),
      cornerRadius: 70,
      rotationDegrees: -14,
    },
    {
      name: 'CampPath-0B',
      position: vec3(-442, -54, 0),
      width: 170,
      height: 106,
      fillColor: color(249, 232, 198, 200),
      strokeColor: color(255, 243, 212, 56),
      cornerRadius: 64,
      rotationDegrees: 10,
      addBindingTag: false,
    },
    {
      name: 'CampPath-1',
      position: vec3(-324, -46, 0),
      width: 156,
      height: 104,
      fillColor: color(250, 233, 192, 206),
      strokeColor: color(255, 243, 212, 58),
      cornerRadius: 66,
      rotationDegrees: -18,
    },
    {
      name: 'CampPath-2',
      position: vec3(-238, -28, 0),
      width: 144,
      height: 92,
      fillColor: color(249, 232, 198, 194),
      strokeColor: color(255, 243, 212, 54),
      cornerRadius: 56,
      rotationDegrees: 12,
      addBindingTag: false,
    },
    {
      name: 'CampPath-3',
      position: vec3(-146, -36, 0),
      width: 154,
      height: 98,
      fillColor: color(247, 230, 196, 188),
      strokeColor: color(255, 241, 212, 50),
      cornerRadius: 56,
      rotationDegrees: -10,
      addBindingTag: false,
    },
    {
      name: 'CampPath-4',
      position: vec3(-38, -18, 0),
      width: 166,
      height: 104,
      fillColor: color(247, 230, 196, 188),
      strokeColor: color(255, 241, 212, 50),
      cornerRadius: 58,
      rotationDegrees: 17,
      addBindingTag: false,
    },
    {
      name: 'CampPath-5',
      position: vec3(82, -36, 0),
      width: 176,
      height: 108,
      fillColor: color(247, 230, 196, 188),
      strokeColor: color(255, 241, 212, 50),
      cornerRadius: 62,
      rotationDegrees: -14,
      addBindingTag: false,
    },
    {
      name: 'CampPath-6',
      position: vec3(210, -24, 0),
      width: 166,
      height: 100,
      fillColor: color(247, 230, 196, 188),
      strokeColor: color(255, 241, 212, 50),
      cornerRadius: 58,
      rotationDegrees: 11,
      addBindingTag: false,
    },
    {
      name: 'CampPath-7',
      position: vec3(340, -14, 0),
      width: 168,
      height: 102,
      fillColor: color(248, 231, 198, 180),
      strokeColor: color(255, 243, 214, 42),
      cornerRadius: 64,
      rotationDegrees: -13,
      addBindingTag: false,
    },
    {
      name: 'CampPath-8',
      position: vec3(468, -12, 0),
      width: 154,
      height: 92,
      fillColor: color(248, 231, 198, 176),
      strokeColor: color(255, 243, 214, 40),
      cornerRadius: 58,
      rotationDegrees: 9,
      addBindingTag: false,
    },
  ], {
    tiled: true,
    maskShape: SCENE_DRESSING_MASK.ELLIPSE,
    maskEllipseSegments: 56,
  });
  addSkinnedPanelGroup(roots.worldRootId, 'CampWall', 'outdoor_wall_standard', [
    {
      name: 'CampWall-Lintel',
      position: vec3(342, 74, 0),
      width: 298,
      height: 84,
      fillColor: color(244, 227, 214, 198),
      strokeColor: color(253, 238, 230, 44),
      cornerRadius: 12,
    },
    {
      name: 'CampWall-LeftPost',
      position: vec3(214, 6, 0),
      width: 104,
      height: 216,
      fillColor: color(244, 227, 214, 198),
      strokeColor: color(253, 238, 230, 44),
      cornerRadius: 12,
      addBindingTag: false,
    },
    {
      name: 'CampWall-RightPost',
      position: vec3(470, 6, 0),
      width: 108,
      height: 224,
      fillColor: color(244, 227, 214, 198),
      strokeColor: color(253, 238, 230, 44),
      cornerRadius: 12,
      addBindingTag: false,
    },
  ], { tiled: true });
  addDecorPanels(roots.worldRootId, 'CampAccent', [
    { position: vec3(-346, 114, 0), width: 24, height: 24, fillColor: color(255, 243, 211, 220), strokeColor: color(255, 251, 236, 92), cornerRadius: 18 },
    { position: vec3(-314, 80, 0), width: 18, height: 18, fillColor: color(255, 225, 231, 208), strokeColor: color(255, 249, 250, 86), cornerRadius: 14 },
    { position: vec3(-248, 46, 0), width: 22, height: 12, fillColor: color(231, 248, 224, 206), strokeColor: color(248, 255, 246, 82), cornerRadius: 10 },
    { position: vec3(-28, 122, 0), width: 28, height: 16, fillColor: color(255, 247, 226, 184), strokeColor: color(255, 253, 241, 70), cornerRadius: 12 },
    { position: vec3(190, 104, 0), width: 18, height: 18, fillColor: color(233, 244, 255, 200), strokeColor: color(250, 253, 255, 86), cornerRadius: 14 },
  ]);

  addCheckpoint(builder, {
    name: 'Checkpoint-Camp',
    markerId: 'camp-entry',
    label: '营地篝火',
    position: vec3(-488, -20, 0),
  });

  addCheckpoint(builder, {
    name: 'Checkpoint-CampReturn',
    markerId: 'camp-return',
    label: '西门营火',
    position: vec3(440, -20, 0),
  });

  const campPlate = addLabeledNode(
    roots.worldRootId,
    'CampPlate',
    '压住机关',
    vec3(102, -64, 0),
    126,
    42,
    18,
    color(21, 41, 23, 255),
    true,
    color(121, 193, 111, 255),
    color(223, 255, 210, 120),
    12,
    true,
  );
  addComponent(campPlate.nodeId, 'cc.RigidBody2D', {
    _group: 1,
    enabledContactListener: true,
    bullet: false,
    _type: 0,
    _allowSleep: true,
    _gravityScale: 0,
    _linearDamping: 0,
    _angularDamping: 0,
    _linearVelocity: vec2(),
    _angularVelocity: 0,
    _fixedRotation: true,
    awakeOnLoad: true,
  });
  addSensorBox(campPlate.nodeId, 108, 32);

  const campGateClosed = addLabeledNode(
    roots.worldRootId,
    'CampGate-Closed',
    '西侧栅门',
    vec3(316, -20, 0),
    188,
    52,
    18,
    color(255, 241, 239, 255),
    true,
    color(124, 53, 52, 255),
    color(255, 202, 196, 120),
    16,
    true,
  );
  const campGateOpen = addLabeledNode(
    roots.worldRootId,
    'CampGate-Open',
    '栅门已开',
    vec3(316, -20, 0),
    188,
    52,
    18,
    color(20, 42, 25, 255),
    false,
    color(112, 193, 134, 255),
    color(224, 255, 225, 120),
    16,
    true,
  );
  addSceneDressingSkin(campGateClosed.nodeId, 'barrier_closed', {
    tiled: false,
    hideLabelWhenSkinned: true,
    addBindingTag: false,
    maskShape: SCENE_DRESSING_MASK.ROUNDED_RECT,
    maskCornerRadius: 16,
    scaleMultiplier: 1.08,
  });
  addSceneDressingSkin(campGateOpen.nodeId, 'barrier_open', {
    tiled: false,
    hideLabelWhenSkinned: true,
    addBindingTag: false,
    maskShape: SCENE_DRESSING_MASK.ROUNDED_RECT,
    maskCornerRadius: 16,
    scaleMultiplier: 1.08,
  });
  const portalFieldWest = addScenePortal(builder, {
    name: 'Portal-FieldWest',
    label: '进入林间小径',
    position: vec3(472, -20, 0),
    targetScene: 'FieldWest',
    targetMarkerId: 'field-west-entry',
    targetPosition: { x: -500, y: -20, z: 0 },
    active: false,
  });
  addComponent(campPlate.nodeId, types['assets/scripts/puzzle/PressurePlateSwitch.ts'], {
    allowedNodeNameIncludes: 'Echo-box',
    activateOnPressed: [ref(campGateOpen.nodeId), ref(portalFieldWest.nodeId)],
    deactivateOnPressed: [ref(campGateClosed.nodeId)],
    startsPressed: false,
  });

  addLabeledNode(roots.worldRootId, 'CampHint-Box', '放置箱子压住机关', vec3(110, 12, 0), 208, 38, 16, color(237, 246, 229, 255), true, color(68, 122, 84, 180), color(207, 248, 214, 62), 14, false);
  addLabeledNode(roots.worldRootId, 'CampHint-Move', '先熟悉移动与攻击', vec3(-284, 96, 0), 196, 38, 16, color(235, 241, 255, 255), true, color(54, 81, 111, 180), color(210, 228, 255, 62), 14, false);
  addLabeledNode(roots.worldRootId, 'CampSign', '箱子练习', vec3(-32, 184, 0), 200, 40, 16, color(255, 247, 232, 255), true, color(121, 90, 54, 180), color(240, 219, 178, 54), 12, false);

  const campVictoryBanner = addLabeledNode(roots.worldRootId, 'CampVictoryBanner', '试炼完成', vec3(286, 182, 0), 248, 46, 18, color(235, 255, 235, 255), false, color(67, 146, 88, 255), color(213, 255, 209, 100), 16, true);
  const campVictoryHint = addLabeledNode(roots.worldRootId, 'CampVictoryHint', '带回遗物后，营地会点亮回家的路。', vec3(286, 136, 0), 420, 38, 16, color(235, 255, 235, 255), false, color(58, 115, 74, 180), color(214, 255, 214, 70), 14, false);
  addFlagGateController(builder, {
    name: 'CampVictoryController',
    requiredFlags: ['boss-cleared'],
    activateWhenReady: [campVictoryBanner.nodeId, campVictoryHint.nodeId],
  });

  addEnemy(builder, {
    name: 'CampEnemy',
    label: '史莱姆',
    position: vec3(-130, 30, 0),
    patrolA: vec3(-210, 30, 0),
    patrolB: vec3(-60, 30, 0),
    moveSpeed: 72,
    chaseDistance: 110,
  });

  resetNodes.push(campPlate.nodeId, campGateClosed.nodeId, campGateOpen.nodeId);
  await builder.finalize();
}

async function generateFieldWest(scriptIds, prefabIds) {
  const builder = await createSceneBuilder('FieldWest', scriptIds, prefabIds, {
    musicCueId: 'field-west',
    sceneTitle: '林间小径',
    objectiveText: '拾取弹花，穿过陷阱前往遗迹试炼场',
    playerStart: vec3(-500, -20, 0),
    cameraBounds: { minX: -420, maxX: 520, minY: -80, maxY: 100 },
    cameraOffsetX: -110,
  });

  const { addPanelNode, addDecorPanels, addLabeledNode, addComponent, addNode, addSceneDressingSkin, addSensorBox, addSkinnedPanelGroup, getImageBindingProps, resetNodes, roots, types } = builder;

  const fieldBackdrop = addPanelNode(roots.worldRootId, 'FieldBackdrop', vec3(146, 0, 0), 2520, 620, color(214, 236, 200, 255), color(247, 245, 225, 50), true, 18);
  const fieldTopStrip = addPanelNode(roots.worldRootId, 'FieldTopStrip', vec3(318, 186, 0), 1700, 86, color(230, 243, 214, 184), color(248, 251, 232, 42), true, 12);
  addSceneDressingSkin(fieldBackdrop.nodeId, 'outdoor_ground_flowers', { tiled: true });
  addSceneDressingSkin(fieldTopStrip.nodeId, 'outdoor_wall_standard', { tiled: true });
  addSkinnedPanelGroup(roots.worldRootId, 'FieldPath', 'outdoor_path_cobble', [
    {
      name: 'FieldPath-0',
      position: vec3(-604, -60, 0),
      width: 194,
      height: 116,
      fillColor: color(247, 230, 197, 194),
      strokeColor: color(255, 241, 221, 52),
      cornerRadius: 72,
      rotationDegrees: -18,
    },
    {
      name: 'FieldPath-0B',
      position: vec3(-486, -52, 0),
      width: 180,
      height: 110,
      fillColor: color(245, 229, 202, 190),
      strokeColor: color(255, 241, 221, 48),
      cornerRadius: 64,
      rotationDegrees: 12,
      addBindingTag: false,
    },
    {
      name: 'FieldPath-1',
      position: vec3(-358, -42, 0),
      width: 166,
      height: 110,
      fillColor: color(247, 230, 197, 190),
      strokeColor: color(255, 241, 221, 50),
      cornerRadius: 68,
      rotationDegrees: -20,
    },
    {
      name: 'FieldPath-2',
      position: vec3(-268, -22, 0),
      width: 150,
      height: 94,
      fillColor: color(245, 229, 202, 184),
      strokeColor: color(255, 241, 221, 46),
      cornerRadius: 56,
      rotationDegrees: 10,
      addBindingTag: false,
    },
    {
      name: 'FieldPath-3',
      position: vec3(-162, -18, 0),
      width: 156,
      height: 96,
      fillColor: color(245, 229, 202, 184),
      strokeColor: color(255, 241, 221, 46),
      cornerRadius: 56,
      rotationDegrees: -8,
      addBindingTag: false,
    },
    {
      name: 'FieldPath-4',
      position: vec3(-38, -8, 0),
      width: 170,
      height: 98,
      fillColor: color(230, 240, 249, 188),
      strokeColor: color(241, 247, 255, 58),
      cornerRadius: 54,
      rotationDegrees: 16,
      addBindingTag: false,
    },
    {
      name: 'FieldPath-5',
      position: vec3(98, 10, 0),
      width: 178,
      height: 104,
      fillColor: color(245, 229, 202, 184),
      strokeColor: color(255, 241, 221, 46),
      cornerRadius: 54,
      rotationDegrees: -12,
      addBindingTag: false,
    },
    {
      name: 'FieldPath-6',
      position: vec3(244, 30, 0),
      width: 172,
      height: 100,
      fillColor: color(241, 234, 204, 184),
      strokeColor: color(255, 243, 218, 46),
      cornerRadius: 54,
      rotationDegrees: 10,
      addBindingTag: false,
    },
    {
      name: 'FieldPath-7',
      position: vec3(392, 52, 0),
      width: 178,
      height: 104,
      fillColor: color(230, 240, 249, 188),
      strokeColor: color(241, 247, 255, 58),
      cornerRadius: 58,
      rotationDegrees: -14,
      addBindingTag: false,
    },
    {
      name: 'FieldPath-8',
      position: vec3(544, 76, 0),
      width: 170,
      height: 104,
      fillColor: color(230, 240, 249, 188),
      strokeColor: color(241, 247, 255, 58),
      cornerRadius: 62,
      rotationDegrees: 12,
      addBindingTag: false,
    },
    {
      name: 'FieldPath-9',
      position: vec3(694, 100, 0),
      width: 184,
      height: 112,
      fillColor: color(247, 232, 202, 176),
      strokeColor: color(255, 244, 223, 42),
      cornerRadius: 62,
      rotationDegrees: -16,
      addBindingTag: false,
    },
    {
      name: 'FieldPath-10',
      position: vec3(112, 56, 0),
      width: 96,
      height: 62,
      fillColor: color(236, 239, 230, 172),
      strokeColor: color(248, 251, 238, 42),
      cornerRadius: 28,
      rotationDegrees: 18,
      addBindingTag: false,
    },
  ], {
    tiled: true,
    maskShape: SCENE_DRESSING_MASK.ELLIPSE,
    maskEllipseSegments: 56,
  });
  addDecorPanels(roots.worldRootId, 'FieldAccent', [
    { position: vec3(-336, 108, 0), width: 22, height: 22, fillColor: color(255, 241, 206, 216), strokeColor: color(255, 249, 233, 90), cornerRadius: 16 },
    { position: vec3(-292, 78, 0), width: 18, height: 18, fillColor: color(237, 248, 224, 206), strokeColor: color(251, 255, 243, 84), cornerRadius: 14 },
    { position: vec3(-154, 154, 0), width: 26, height: 14, fillColor: color(254, 231, 217, 198), strokeColor: color(255, 248, 244, 74), cornerRadius: 10 },
    { position: vec3(182, 116, 0), width: 20, height: 20, fillColor: color(232, 244, 255, 202), strokeColor: color(250, 253, 255, 86), cornerRadius: 14 },
    { position: vec3(514, 132, 0), width: 24, height: 16, fillColor: color(255, 245, 220, 192), strokeColor: color(255, 251, 241, 74), cornerRadius: 12 },
  ]);

  addCheckpoint(builder, {
    name: 'Checkpoint-FieldWest',
    markerId: 'field-west-entry',
    label: '林间营火',
    position: vec3(-516, -20, 0),
  });

  addCheckpoint(builder, {
    name: 'Checkpoint-FieldWestReturn',
    markerId: 'field-west-return',
    label: '遗迹门营火',
    position: vec3(708, 102, 0),
  });

  addScenePortal(builder, {
    name: 'Portal-StartCamp',
    label: '返回营地',
    position: vec3(-700, -20, 0),
    targetScene: 'StartCamp',
    targetMarkerId: 'camp-return',
    targetPosition: { x: 440, y: -20, z: 0 },
    active: true,
  });

  addEnemy(builder, {
    name: 'FieldEnemy',
    label: '巡逻',
    position: vec3(-72, 36, 0),
    patrolA: vec3(-170, 36, 0),
    patrolB: vec3(30, 36, 0),
    moveSpeed: 82,
    chaseDistance: 128,
  });

  addEchoPickup(builder, {
    name: 'EchoPickup-Flower-West',
    label: '解锁弹花',
    position: vec3(-176, 184, 0),
    width: 170,
    echoId: 1,
    bindingKey: 'echo_spring_flower',
    fillColor: color(66, 128, 80, 255),
    strokeColor: color(203, 255, 215, 100),
  });

  addLabeledNode(roots.worldRootId, 'WestHint-Flower', '在陷阱左侧放下弹花', vec3(150, 92, 0), 240, 38, 16, color(235, 255, 234, 255), true, color(58, 115, 74, 180), color(214, 255, 214, 70), 14, false);
  addLabeledNode(roots.worldRootId, 'WestHint-Ruins', '穿过这里即可进入遗迹试炼场', vec3(598, 178, 0), 280, 38, 16, color(231, 243, 255, 255), true, color(58, 92, 126, 182), color(205, 228, 255, 72), 14, false);
  addLabeledNode(roots.worldRootId, 'WestLanding', '安全落点', vec3(598, 102, 0), 180, 38, 16, color(229, 245, 255, 255), true, color(73, 108, 139, 180), color(205, 232, 255, 70), 14, false);

  const trapNode = addLabeledNode(
    roots.worldRootId,
    'Trap-West',
    '箭台',
    vec3(314, -4, 0),
    116,
    78,
    18,
    color(58, 27, 10, 255),
    true,
    color(223, 128, 69, 255),
    color(255, 217, 184, 120),
    14,
    true,
  );
  const trapSpawnId = addNode('Trap-West-Spawn', trapNode.nodeId, vec3(66, 8, 0));
  addComponent(trapSpawnId, 'cc.UITransform', {
    _priority: 0,
    _contentSize: size(10, 10),
    _anchorPoint: vec2(0.5, 0.5),
  });
  addComponent(trapNode.nodeId, types['assets/scripts/puzzle/ProjectileTrap.ts'], {
    projectilePrefab: {
      __uuid__: prefabIds.arrowProjectileUuid,
      __expectedType__: 'cc.Prefab',
    },
    spawnPoint: ref(trapSpawnId),
    intervalSeconds: 1.15,
    directionX: 1,
    directionY: 0,
    autoStart: true,
    visualSpriteFrame: getImageBindingProps('outdoor_wall_cracked')?.spriteFrame ?? null,
    fireClip: null,
    fireClipVolume: 1,
    hideLabelWhenSkinned: true,
  });
  addSceneDressingSkin(trapNode.nodeId, 'outdoor_wall_cracked', {
    tiled: false,
    hideLabelWhenSkinned: true,
    addBindingTag: false,
    maskShape: SCENE_DRESSING_MASK.ROUNDED_RECT,
    maskCornerRadius: 20,
    scaleMultiplier: 1.12,
  });

  const ruinsPortal = addScenePortal(builder, {
    name: 'Portal-FieldRuins',
    label: '前往遗迹试炼',
    position: vec3(778, 102, 0),
    targetScene: 'FieldRuins',
    targetMarkerId: 'field-ruins-entry',
    targetPosition: { x: -520, y: -20, z: 0 },
    active: true,
    width: 200,
    height: 52,
  });

  resetNodes.push(trapNode.nodeId, ruinsPortal.nodeId);
  await builder.finalize();
}

async function generateFieldRuins(scriptIds, prefabIds) {
  const builder = await createSceneBuilder('FieldRuins', scriptIds, prefabIds, {
    musicCueId: 'field-ruins',
    sceneTitle: '遗迹小径',
    objectiveText: '解锁炸虫，炸开裂墙，进入试炼门',
    playerStart: vec3(-520, -20, 0),
    cameraBounds: { minX: -420, maxX: 620, minY: -80, maxY: 110 },
    cameraOffsetX: -120,
  });

  const { addPanelNode, addDecorPanels, addLabeledNode, addComponent, addSceneDressingSkin, addSkinnedPanelGroup, getImageBindingProps, resetNodes, roots, types } = builder;

  const ruinsBackdrop = addPanelNode(roots.worldRootId, 'RuinsBackdrop', vec3(120, 0, 0), 1960, 560, color(248, 239, 221, 255), color(251, 243, 227, 48), true, 18);
  addSceneDressingSkin(ruinsBackdrop.nodeId, 'outdoor_path_cobble', { tiled: true });
  addSkinnedPanelGroup(roots.worldRootId, 'RuinsFlowerGround', 'outdoor_ground_flowers', [
    {
      name: 'RuinsFlowerGround-1',
      position: vec3(102, 176, 0),
      width: 452,
      height: 120,
      fillColor: color(251, 237, 215, 188),
      strokeColor: color(255, 246, 229, 48),
      cornerRadius: 54,
      rotationDegrees: -8,
    },
    {
      name: 'RuinsFlowerGround-2',
      position: vec3(750, 188, 0),
      width: 384,
      height: 134,
      fillColor: color(251, 237, 215, 180),
      strokeColor: color(255, 246, 229, 44),
      cornerRadius: 58,
      rotationDegrees: 10,
      addBindingTag: false,
    },
  ], {
    tiled: true,
    maskShape: SCENE_DRESSING_MASK.ELLIPSE,
    maskEllipseSegments: 56,
  });
  addSkinnedPanelGroup(roots.worldRootId, 'RuinsWallCracked', 'outdoor_wall_cracked', [
    {
      name: 'RuinsWallCracked-Lintel',
      position: vec3(430, 64, 0),
      width: 340,
      height: 92,
      fillColor: color(244, 224, 206, 192),
      strokeColor: color(252, 237, 226, 50),
      cornerRadius: 12,
    },
    {
      name: 'RuinsWallCracked-LeftPost',
      position: vec3(314, 2, 0),
      width: 96,
      height: 214,
      fillColor: color(244, 224, 206, 192),
      strokeColor: color(252, 237, 226, 50),
      cornerRadius: 12,
      addBindingTag: false,
    },
    {
      name: 'RuinsWallCracked-RightPost',
      position: vec3(546, 2, 0),
      width: 102,
      height: 214,
      fillColor: color(244, 224, 206, 192),
      strokeColor: color(252, 237, 226, 50),
      cornerRadius: 12,
      addBindingTag: false,
    },
  ], { tiled: true });
  addSkinnedPanelGroup(roots.worldRootId, 'RuinsWallBroken', 'outdoor_wall_broken', [
    {
      name: 'RuinsWallBroken-Lintel',
      position: vec3(742, 138, 0),
      width: 316,
      height: 78,
      fillColor: color(235, 240, 249, 194),
      strokeColor: color(246, 249, 255, 58),
      cornerRadius: 12,
    },
    {
      name: 'RuinsWallBroken-LeftPost',
      position: vec3(636, 88, 0),
      width: 106,
      height: 118,
      fillColor: color(235, 240, 249, 194),
      strokeColor: color(246, 249, 255, 58),
      cornerRadius: 12,
      addBindingTag: false,
    },
    {
      name: 'RuinsWallBroken-RightPost',
      position: vec3(852, 88, 0),
      width: 108,
      height: 118,
      fillColor: color(235, 240, 249, 194),
      strokeColor: color(246, 249, 255, 58),
      cornerRadius: 12,
      addBindingTag: false,
    },
  ], { tiled: true });
  addDecorPanels(roots.worldRootId, 'RuinsAccent', [
    { position: vec3(-348, 110, 0), width: 24, height: 24, fillColor: color(255, 241, 214, 216), strokeColor: color(255, 250, 238, 90), cornerRadius: 18 },
    { position: vec3(-304, 76, 0), width: 18, height: 18, fillColor: color(241, 233, 252, 204), strokeColor: color(251, 247, 255, 84), cornerRadius: 14 },
    { position: vec3(-124, 146, 0), width: 26, height: 14, fillColor: color(255, 231, 219, 200), strokeColor: color(255, 248, 244, 74), cornerRadius: 10 },
    { position: vec3(198, 106, 0), width: 20, height: 20, fillColor: color(236, 246, 228, 204), strokeColor: color(251, 255, 245, 86), cornerRadius: 14 },
    { position: vec3(560, 132, 0), width: 22, height: 16, fillColor: color(255, 240, 222, 194), strokeColor: color(255, 250, 241, 74), cornerRadius: 12 },
  ]);

  addCheckpoint(builder, {
    name: 'Checkpoint-FieldRuins',
    markerId: 'field-ruins-entry',
    label: '遗迹营火',
    position: vec3(-534, -20, 0),
  });

  addScenePortal(builder, {
    name: 'Portal-FieldWestReturn',
    label: '返回西径',
    position: vec3(-712, -20, 0),
    targetScene: 'FieldWest',
    targetMarkerId: 'field-west-return',
    targetPosition: { x: 708, y: 102, z: 0 },
    active: true,
    width: 196,
  });

  addEnemy(builder, {
    name: 'RuinsEnemy',
    label: '守卫',
    position: vec3(-34, 24, 0),
    patrolA: vec3(-148, 24, 0),
    patrolB: vec3(58, 24, 0),
    moveSpeed: 86,
    chaseDistance: 142,
  });

  addEchoPickup(builder, {
    name: 'EchoPickup-Bomb-Ruins',
    label: '解锁炸虫',
    position: vec3(4, 170, 0),
    width: 180,
    echoId: 2,
    bindingKey: 'echo_bomb_bug',
    fillColor: color(135, 68, 62, 255),
    strokeColor: color(255, 209, 200, 102),
    tint: color(255, 241, 236, 255),
  });

  addLabeledNode(roots.worldRootId, 'RuinsHint-Bomb', '把炸虫放到裂墙旁', vec3(232, 92, 0), 290, 38, 16, color(255, 245, 238, 255), true, color(114, 71, 58, 184), color(255, 214, 200, 70), 14, false);
  addLabeledNode(roots.worldRootId, 'RuinsHint-Dungeon', '裂墙炸开后通往试炼', vec3(724, 166, 0), 330, 38, 16, color(231, 243, 255, 255), true, color(58, 92, 126, 182), color(205, 228, 255, 72), 14, false);
  addLabeledNode(roots.worldRootId, 'RuinsLanding', '试炼入口', vec3(724, 88, 0), 172, 38, 16, color(229, 245, 255, 255), true, color(73, 108, 139, 180), color(205, 232, 255, 70), 14, false);

  const ruinsWallClosed = addLabeledNode(
    roots.worldRootId,
    'RuinsWall-Closed',
    '裂墙',
    vec3(434, -14, 0),
    196,
    56,
    18,
    color(255, 241, 239, 255),
    true,
    color(137, 78, 67, 255),
    color(255, 211, 201, 120),
    16,
    true,
  );
  const ruinsWallOpen = addLabeledNode(
    roots.worldRootId,
    'RuinsWall-Open',
    '通路已开',
    vec3(434, -14, 0),
    196,
    56,
    18,
    color(20, 42, 25, 255),
    false,
    color(112, 193, 134, 255),
    color(224, 255, 225, 120),
    16,
    true,
  );
  addSceneDressingSkin(ruinsWallClosed.nodeId, 'outdoor_wall_cracked', {
    tiled: false,
    hideLabelWhenSkinned: true,
    addBindingTag: false,
    maskShape: SCENE_DRESSING_MASK.ROUNDED_RECT,
    maskCornerRadius: 16,
    scaleMultiplier: 1.08,
  });
  addSceneDressingSkin(ruinsWallOpen.nodeId, 'outdoor_wall_broken', {
    tiled: false,
    hideLabelWhenSkinned: true,
    addBindingTag: false,
    maskShape: SCENE_DRESSING_MASK.ROUNDED_RECT,
    maskCornerRadius: 16,
    scaleMultiplier: 1.08,
  });
  const dungeonPortal = addScenePortal(builder, {
    name: 'Portal-DungeonHub',
    label: '进入试炼厅',
    position: vec3(840, 88, 0),
    targetScene: 'DungeonHub',
    targetMarkerId: 'dungeon-hub-entry',
    targetPosition: { x: -500, y: -20, z: 0 },
    active: false,
    width: 210,
    height: 52,
  });
  addComponent(ruinsWallClosed.nodeId, types['assets/scripts/puzzle/BreakableTarget.ts'], {
    startsBroken: false,
    activateOnBroken: [ref(ruinsWallOpen.nodeId), ref(dungeonPortal.nodeId)],
    deactivateOnBroken: [ref(ruinsWallClosed.nodeId)],
    intactVisualNode: ref(ruinsWallClosed.nodeId),
    brokenVisualNode: ref(ruinsWallOpen.nodeId),
    intactSpriteFrame: getImageBindingProps('breakable_target')?.spriteFrame ?? null,
    intactTexture: getImageBindingProps('breakable_target')?.texture ?? null,
    brokenSpriteFrame: getImageBindingProps('barrier_open')?.spriteFrame ?? null,
    brokenTexture: getImageBindingProps('barrier_open')?.texture ?? null,
    breakClip: null,
    breakClipVolume: 1,
    resetClip: null,
    resetClipVolume: 1,
    hideLabelsWhenSkinned: true,
  });
  builder.addAssetBindingTag(ruinsWallClosed.nodeId, 'breakable_target');
  builder.addAssetBindingTag(ruinsWallOpen.nodeId, 'barrier_open');

  resetNodes.push(ruinsWallClosed.nodeId, ruinsWallOpen.nodeId, dungeonPortal.nodeId);
  await builder.finalize();
}

async function generateDungeonHub(scriptIds, prefabIds) {
  const builder = await createSceneBuilder('DungeonHub', scriptIds, prefabIds, {
    musicCueId: 'dungeon-hub',
    sceneTitle: '试炼大厅',
    objectiveText: '完成三个小房间，打开首领门',
    playerStart: vec3(-500, -20, 0),
    cameraBounds: { minX: -420, maxX: 620, minY: -80, maxY: 110 },
    cameraOffsetX: -120,
  });

  const { addPanelNode, addLabeledNode, resetNodes, roots } = builder;

  addPanelNode(roots.worldRootId, 'HubBackdrop', vec3(120, 0, 0), 1940, 560, color(235, 232, 243, 255), color(246, 241, 228, 56), true, 28);
  addPanelNode(roots.worldRootId, 'HubLeftLane', vec3(-270, -10, 0), 760, 250, color(225, 239, 216, 214), color(248, 244, 226, 46), true, 24);
  addPanelNode(roots.worldRootId, 'HubTopStrip', vec3(0, 186, 0), 1560, 104, color(239, 236, 246, 182), color(247, 242, 232, 50), true, 22);
  addPanelNode(roots.worldRootId, 'BossGateZone', vec3(516, -2, 0), 300, 230, color(247, 225, 198, 188), color(251, 236, 216, 56), true, 26);

  addCheckpoint(builder, {
    name: 'Checkpoint-DungeonHub',
    markerId: 'dungeon-hub-entry',
    label: '大厅营火',
    position: vec3(-514, -20, 0),
  });

  addScenePortal(builder, {
    name: 'Portal-FieldRuinsReturn',
    label: '返回遗迹',
    position: vec3(-706, -20, 0),
    targetScene: 'FieldRuins',
    targetMarkerId: 'field-ruins-entry',
    targetPosition: { x: 760, y: 88, z: 0 },
    active: true,
    width: 188,
  });

  addScenePortal(builder, {
    name: 'Portal-DungeonRoomA',
    label: '箱子间',
    position: vec3(-110, 122, 0),
    targetScene: 'DungeonRoomA',
    targetMarkerId: 'dungeon-room-a-entry',
    targetPosition: { x: -500, y: -20, z: 0 },
    active: true,
  });
  const roomAStatusPending = addLabeledNode(
    roots.worldRootId,
    'RoomA-StatusPending',
    '○',
    vec3(-110, 78, 0),
    44,
    30,
    18,
    color(166, 104, 91, 255),
    true,
    color(255, 232, 214, 184),
    color(255, 246, 232, 96),
    15,
    true,
  );
  const roomAStatusDone = addLabeledNode(
    roots.worldRootId,
    'RoomA-StatusDone',
    '✓',
    vec3(-110, 78, 0),
    44,
    30,
    18,
    color(58, 116, 72, 255),
    false,
    color(221, 250, 201, 188),
    color(247, 255, 229, 98),
    15,
    true,
  );
  addFlagGateController(builder, {
    name: 'RoomA-StatusController',
    requiredFlags: ['room-a-clear'],
    activateWhenReady: [roomAStatusDone.nodeId],
    deactivateWhenReady: [roomAStatusPending.nodeId],
  });
  addScenePortal(builder, {
    name: 'Portal-DungeonRoomB',
    label: '弹花间',
    position: vec3(110, 122, 0),
    targetScene: 'DungeonRoomB',
    targetMarkerId: 'dungeon-room-b-entry',
    targetPosition: { x: -500, y: -20, z: 0 },
    active: true,
  });
  const roomBStatusPending = addLabeledNode(
    roots.worldRootId,
    'RoomB-StatusPending',
    '○',
    vec3(110, 78, 0),
    44,
    30,
    18,
    color(166, 104, 91, 255),
    true,
    color(255, 232, 214, 184),
    color(255, 246, 232, 96),
    15,
    true,
  );
  const roomBStatusDone = addLabeledNode(
    roots.worldRootId,
    'RoomB-StatusDone',
    '✓',
    vec3(110, 78, 0),
    44,
    30,
    18,
    color(58, 116, 72, 255),
    false,
    color(221, 250, 201, 188),
    color(247, 255, 229, 98),
    15,
    true,
  );
  addFlagGateController(builder, {
    name: 'RoomB-StatusController',
    requiredFlags: ['room-b-clear'],
    activateWhenReady: [roomBStatusDone.nodeId],
    deactivateWhenReady: [roomBStatusPending.nodeId],
  });
  addScenePortal(builder, {
    name: 'Portal-DungeonRoomC',
    label: '炸虫间',
    position: vec3(330, 122, 0),
    targetScene: 'DungeonRoomC',
    targetMarkerId: 'dungeon-room-c-entry',
    targetPosition: { x: -500, y: -20, z: 0 },
    active: true,
  });
  const roomCStatusPending = addLabeledNode(
    roots.worldRootId,
    'RoomC-StatusPending',
    '○',
    vec3(330, 78, 0),
    44,
    30,
    18,
    color(166, 104, 91, 255),
    true,
    color(255, 232, 214, 184),
    color(255, 246, 232, 96),
    15,
    true,
  );
  const roomCStatusDone = addLabeledNode(
    roots.worldRootId,
    'RoomC-StatusDone',
    '✓',
    vec3(330, 78, 0),
    44,
    30,
    18,
    color(58, 116, 72, 255),
    false,
    color(221, 250, 201, 188),
    color(247, 255, 229, 98),
    15,
    true,
  );
  addFlagGateController(builder, {
    name: 'RoomC-StatusController',
    requiredFlags: ['room-c-clear'],
    activateWhenReady: [roomCStatusDone.nodeId],
    deactivateWhenReady: [roomCStatusPending.nodeId],
  });

  const bossGateClosed = addLabeledNode(
    roots.worldRootId,
    'BossGate-Closed',
    '首领门未开',
    vec3(520, -2, 0),
    216,
    60,
    18,
    color(255, 241, 239, 255),
    true,
    color(176, 104, 92, 255),
    color(255, 221, 209, 112),
    20,
    true,
  );
  const bossGateOpen = addLabeledNode(
    roots.worldRootId,
    'BossGate-Open',
    '首领门已开',
    vec3(520, -2, 0),
    216,
    60,
    18,
    color(20, 42, 25, 255),
    false,
    color(112, 193, 134, 255),
    color(224, 255, 225, 120),
    18,
    true,
  );
  const bossPortal = addScenePortal(builder, {
    name: 'Portal-BossArena',
    label: '挑战首领',
    position: vec3(708, -2, 0),
    targetScene: 'BossArena',
    targetMarkerId: 'boss-arena-entry',
    targetPosition: { x: -520, y: -20, z: 0 },
    active: false,
    width: 196,
  });

  addFlagGateController(builder, {
    name: 'BossGateController',
    requiredFlags: ['room-a-clear', 'room-b-clear', 'room-c-clear'],
    activateWhenReady: [bossGateOpen.nodeId, bossPortal.nodeId],
    deactivateWhenReady: [bossGateClosed.nodeId],
  });

  addLabeledNode(roots.worldRootId, 'HubHint-Rooms', '每个房间教会一种回响，完成后徽章会亮起。', vec3(110, 186, 0), 440, 38, 16, color(236, 244, 255, 255), true, color(56, 82, 116, 184), color(207, 226, 255, 62), 14, false);
  addLabeledNode(roots.worldRootId, 'HubHint-Boss', '收齐三枚遗物后，首领门会打开。', vec3(520, 122, 0), 330, 38, 16, color(255, 241, 239, 255), true, color(92, 63, 76, 184), color(255, 219, 214, 62), 14, false);

  await builder.finalize();
}

async function generateDungeonRoomA(scriptIds, prefabIds) {
  const builder = await createSceneBuilder('DungeonRoomA', scriptIds, prefabIds, {
    musicCueId: 'dungeon-room',
    sceneTitle: '箱子房',
    objectiveText: '召唤箱子压住机关，拿到房间遗物',
    playerStart: vec3(-500, -20, 0),
    cameraBounds: { minX: -420, maxX: 360, minY: -80, maxY: 90 },
    cameraOffsetX: -120,
  });

  const { addPanelNode, addLabeledNode, addComponent, addSceneDressingSkin, addSensorBox, resetNodes, roots, types } = builder;

  const roomABackdrop = addPanelNode(roots.worldRootId, 'RoomABackdrop', vec3(0, 0, 0), 1500, 520, color(244, 238, 229, 255), color(247, 238, 219, 48), true, 28);
  const roomAChallengeZone = addPanelNode(roots.worldRootId, 'RoomAChallengeZone', vec3(120, -18, 0), 500, 180, color(247, 228, 191, 205), color(255, 241, 211, 60), true, 24);
  addSceneDressingSkin(roomABackdrop.nodeId, 'outdoor_ground_green', { tiled: true });
  addSceneDressingSkin(roomAChallengeZone.nodeId, 'outdoor_path_cobble', { tiled: true });

  addCheckpoint(builder, {
    name: 'Checkpoint-DungeonRoomA',
    markerId: 'dungeon-room-a-entry',
    label: '箱子房营火',
    position: vec3(-514, -20, 0),
  });
  addScenePortal(builder, {
    name: 'Portal-DungeonHubReturn-A',
    label: '返回大厅',
    position: vec3(-698, -20, 0),
    targetScene: 'DungeonHub',
    targetMarkerId: 'dungeon-hub-entry',
    targetPosition: { x: -320, y: -20, z: 0 },
    active: true,
    width: 188,
  });

  const roomAPlate = addLabeledNode(
    roots.worldRootId,
    'RoomA-Plate',
    '机关',
    vec3(86, -50, 0),
    112,
    42,
    18,
    color(21, 41, 23, 255),
    true,
    color(121, 193, 111, 255),
    color(223, 255, 210, 120),
    12,
    true,
  );
  addComponent(roomAPlate.nodeId, 'cc.RigidBody2D', {
    _group: 1,
    enabledContactListener: true,
    bullet: false,
    _type: 0,
    _allowSleep: true,
    _gravityScale: 0,
    _linearDamping: 0,
    _angularDamping: 0,
    _linearVelocity: vec2(),
    _angularVelocity: 0,
    _fixedRotation: true,
    awakeOnLoad: true,
  });
  addSensorBox(roomAPlate.nodeId, 102, 32);

  const roomAGateClosed = addLabeledNode(roots.worldRootId, 'RoomA-GateClosed', '小门', vec3(266, -18, 0), 156, 52, 18, color(255, 241, 239, 255), true, color(124, 53, 52, 255), color(255, 202, 196, 120), 16, true);
  const roomAGateOpen = addLabeledNode(roots.worldRootId, 'RoomA-GateOpen', '已开', vec3(266, -18, 0), 156, 52, 18, color(20, 42, 25, 255), false, color(112, 193, 134, 255), color(224, 255, 225, 120), 16, true);
  addSceneDressingSkin(roomAGateClosed.nodeId, 'barrier_closed', {
    tiled: false,
    hideLabelWhenSkinned: true,
    addBindingTag: false,
    maskShape: SCENE_DRESSING_MASK.ROUNDED_RECT,
    maskCornerRadius: 16,
    scaleMultiplier: 1.08,
  });
  addSceneDressingSkin(roomAGateOpen.nodeId, 'barrier_open', {
    tiled: false,
    hideLabelWhenSkinned: true,
    addBindingTag: false,
    maskShape: SCENE_DRESSING_MASK.ROUNDED_RECT,
    maskCornerRadius: 16,
    scaleMultiplier: 1.08,
  });
  const roomAGateBarrier = addLabeledNode(
    roots.worldRootId,
    'RoomA-GateBarrier',
    '阻挡',
    vec3(356, -18, 0),
    86,
    180,
    16,
    color(255, 241, 239, 255),
    true,
    color(124, 53, 52, 118),
    color(255, 202, 196, 62),
    18,
    true,
  );
  addSensorBox(roomAGateBarrier.nodeId, 82, 176);
  addComponent(roomAGateBarrier.nodeId, types['assets/scripts/puzzle/PlayerBarrierZone.ts'], {
    playerNameIncludes: 'Player',
  });
  const roomAClearRelic = addProgressFlagPickup(builder, {
    name: 'RoomA-ClearRelic',
    label: '拿取箱子遗物',
    flagId: 'room-a-clear',
    position: vec3(446, -18, 0),
    width: 196,
    destroyOnCollected: true,
  });
  builder.addComponent(roomAPlate.nodeId, types['assets/scripts/puzzle/PressurePlateSwitch.ts'], {
    allowedNodeNameIncludes: 'Echo-box',
    activateOnPressed: [ref(roomAGateOpen.nodeId), ref(roomAClearRelic.nodeId)],
    deactivateOnPressed: [ref(roomAGateClosed.nodeId), ref(roomAGateBarrier.nodeId)],
    startsPressed: false,
  });
  roomAClearRelic.nodeId && (builder.items[roomAClearRelic.nodeId]._active = false);

  addLabeledNode(roots.worldRootId, 'RoomAHint', '只有箱子能稳稳压住机关。', vec3(104, 84, 0), 280, 38, 16, color(255, 246, 231, 255), true, color(113, 88, 58, 184), color(240, 219, 178, 54), 14, false);
  addEnemy(builder, {
    name: 'RoomA-Enemy',
    label: '看守',
    position: vec3(-108, 34, 0),
    patrolA: vec3(-170, 34, 0),
    patrolB: vec3(-20, 34, 0),
    moveSpeed: 74,
    chaseDistance: 100,
  });

  resetNodes.push(roomAPlate.nodeId, roomAGateClosed.nodeId, roomAGateOpen.nodeId, roomAGateBarrier.nodeId);
  await builder.finalize();
}

async function generateDungeonRoomB(scriptIds, prefabIds) {
  const builder = await createSceneBuilder('DungeonRoomB', scriptIds, prefabIds, {
    musicCueId: 'dungeon-room',
    sceneTitle: '弹花房',
    objectiveText: '用弹花越过陷阱，拿到房间遗物',
    playerStart: vec3(-500, -20, 0),
    cameraBounds: { minX: -420, maxX: 520, minY: -90, maxY: 110 },
    cameraOffsetX: -120,
  });

  const { addPanelNode, addLabeledNode, addComponent, addNode, addSceneDressingSkin, addSensorBox, getImageBindingProps, resetNodes, roots, types } = builder;

  const roomBBackdrop = addPanelNode(roots.worldRootId, 'RoomBBackdrop', vec3(80, 0, 0), 1720, 520, color(243, 235, 224, 255), color(247, 239, 221, 48), true, 28);
  const roomBTrapLane = addPanelNode(roots.worldRootId, 'RoomBTrapLane', vec3(180, -10, 0), 420, 240, color(246, 220, 191, 188), color(255, 235, 216, 54), true, 24);
  const roomBLandingZone = addPanelNode(roots.worldRootId, 'RoomBLandingZone', vec3(536, 84, 0), 250, 110, color(223, 237, 248, 188), color(238, 246, 255, 60), true, 22);
  addSceneDressingSkin(roomBBackdrop.nodeId, 'outdoor_ground_green', { tiled: true });
  addSceneDressingSkin(roomBTrapLane.nodeId, 'outdoor_ground_ruins', { tiled: true });
  addSceneDressingSkin(roomBLandingZone.nodeId, 'outdoor_ground_flowers', { tiled: true });
  const roomBTopBarrier = addPanelNode(
    roots.worldRootId,
    'RoomB-TopBarrier',
    vec3(170, 184, 0),
    1280,
    44,
    color(239, 247, 255, 126),
    color(216, 234, 255, 54),
    true,
    22,
  );
  addSensorBox(roomBTopBarrier.nodeId, 1270, 60);
  addComponent(roomBTopBarrier.nodeId, types['assets/scripts/puzzle/PlayerBarrierZone.ts'], {
    playerNameIncludes: 'Player',
  });
  const roomBBottomBarrier = addPanelNode(
    roots.worldRootId,
    'RoomB-BottomBarrier',
    vec3(170, -204, 0),
    1280,
    44,
    color(239, 247, 255, 126),
    color(216, 234, 255, 54),
    true,
    22,
  );
  addSensorBox(roomBBottomBarrier.nodeId, 1270, 60);
  addComponent(roomBBottomBarrier.nodeId, types['assets/scripts/puzzle/PlayerBarrierZone.ts'], {
    playerNameIncludes: 'Player',
  });

  addCheckpoint(builder, {
    name: 'Checkpoint-DungeonRoomB',
    markerId: 'dungeon-room-b-entry',
    label: '弹花房营火',
    position: vec3(-514, -20, 0),
  });
  addScenePortal(builder, {
    name: 'Portal-DungeonHubReturn-B',
    label: '返回大厅',
    position: vec3(-698, -20, 0),
    targetScene: 'DungeonHub',
    targetMarkerId: 'dungeon-hub-entry',
    targetPosition: { x: -120, y: -20, z: 0 },
    active: true,
    width: 188,
  });

  const roomBTrap = addLabeledNode(roots.worldRootId, 'RoomB-Trap', '箭台', vec3(220, -6, 0), 96, 42, 18, color(58, 27, 10, 255), true, color(223, 128, 69, 255), color(255, 217, 184, 120), 14, true);
  addSceneDressingSkin(roomBTrap.nodeId, 'outdoor_wall_cracked', {
    tiled: false,
    hideLabelWhenSkinned: true,
    addBindingTag: false,
    maskShape: SCENE_DRESSING_MASK.ROUNDED_RECT,
    maskCornerRadius: 18,
    scaleMultiplier: 1.1,
  });
  const roomBTrapSpawn = addNode('RoomB-Trap-Spawn', roomBTrap.nodeId, vec3(56, 0, 0));
  addComponent(roomBTrapSpawn, 'cc.UITransform', {
    _priority: 0,
    _contentSize: size(10, 10),
    _anchorPoint: vec2(0.5, 0.5),
  });
  addComponent(roomBTrap.nodeId, types['assets/scripts/puzzle/ProjectileTrap.ts'], {
    projectilePrefab: {
      __uuid__: prefabIds.arrowProjectileUuid,
      __expectedType__: 'cc.Prefab',
    },
    spawnPoint: ref(roomBTrapSpawn),
    intervalSeconds: 1.05,
    directionX: 1,
    directionY: 0,
    autoStart: true,
    visualSpriteFrame: getImageBindingProps('outdoor_wall_cracked')?.spriteFrame ?? null,
    fireClip: null,
    fireClipVolume: 1,
    hideLabelWhenSkinned: true,
  });
  const roomBGapHazard = addLabeledNode(
    roots.worldRootId,
    'RoomB-GapHazard',
    '缺口',
    vec3(388, -10, 0),
    260,
    250,
    18,
    color(255, 245, 238, 255),
    true,
    color(122, 63, 58, 166),
    color(255, 214, 200, 76),
    18,
    true,
  );
  addSceneDressingSkin(roomBGapHazard.nodeId, 'outdoor_ground_ruins', { tiled: true, hideLabelWhenSkinned: true, addBindingTag: false });
  addSensorBox(roomBGapHazard.nodeId, 252, 242);
  addComponent(roomBGapHazard.nodeId, types['assets/scripts/puzzle/PlayerRespawnZone.ts'], {
    playerNameIncludes: 'Player',
    ignoreWhileForcedMoving: true,
  });

  addLabeledNode(roots.worldRootId, 'RoomBHint', '弹花起跳', vec3(128, 84, 0), 154, 34, 15, color(55, 108, 63, 255), true, color(226, 251, 211, 206), color(247, 255, 230, 82), 17, true);
  const roomBClearRelic = addProgressFlagPickup(builder, {
    name: 'RoomB-ClearRelic',
    label: '拿取弹花遗物',
    flagId: 'room-b-clear',
    position: vec3(706, 84, 0),
    width: 210,
    destroyOnCollected: true,
  });

  addEnemy(builder, {
    name: 'RoomB-Enemy',
    label: '巡逻',
    position: vec3(-108, 34, 0),
    patrolA: vec3(-170, 34, 0),
    patrolB: vec3(-20, 34, 0),
    moveSpeed: 76,
    chaseDistance: 110,
  });

  resetNodes.push(
    roomBTrap.nodeId,
    roomBClearRelic.nodeId,
    roomBGapHazard.nodeId,
    roomBTopBarrier.nodeId,
    roomBBottomBarrier.nodeId,
  );
  await builder.finalize();
}

async function generateDungeonRoomC(scriptIds, prefabIds) {
  const builder = await createSceneBuilder('DungeonRoomC', scriptIds, prefabIds, {
    musicCueId: 'dungeon-room',
    sceneTitle: '炸虫房',
    objectiveText: '把炸虫放到裂墙旁，露出房间遗物',
    playerStart: vec3(-500, -20, 0),
    cameraBounds: { minX: -420, maxX: 480, minY: -90, maxY: 100 },
    cameraOffsetX: -120,
  });

  const { addPanelNode, addLabeledNode, addComponent, addSceneDressingSkin, getImageBindingProps, resetNodes, roots, types } = builder;

  const roomCBackdrop = addPanelNode(roots.worldRootId, 'RoomCBackdrop', vec3(60, 0, 0), 1680, 520, color(243, 237, 218, 255), color(255, 240, 204, 64), true, 28);
  const roomCBombZone = addPanelNode(roots.worldRootId, 'RoomCBombZone', vec3(230, -10, 0), 360, 220, color(250, 222, 188, 204), color(255, 236, 208, 82), true, 24);
  addSceneDressingSkin(roomCBackdrop.nodeId, 'outdoor_ground_ruins', { tiled: true });
  addSceneDressingSkin(roomCBombZone.nodeId, 'outdoor_path_cobble', { tiled: true });
  const roomCTopBarrier = addPanelNode(
    roots.worldRootId,
    'RoomC-TopBarrier',
    vec3(140, 184, 0),
    1240,
    44,
    color(244, 247, 230, 126),
    color(232, 244, 205, 58),
    true,
    22,
  );
  builder.addSensorBox(roomCTopBarrier.nodeId, 1230, 60);
  addComponent(roomCTopBarrier.nodeId, types['assets/scripts/puzzle/PlayerBarrierZone.ts'], {
    playerNameIncludes: 'Player',
  });
  const roomCBottomBarrier = addPanelNode(
    roots.worldRootId,
    'RoomC-BottomBarrier',
    vec3(140, -204, 0),
    1240,
    44,
    color(244, 247, 230, 126),
    color(232, 244, 205, 58),
    true,
    22,
  );
  builder.addSensorBox(roomCBottomBarrier.nodeId, 1230, 60);
  addComponent(roomCBottomBarrier.nodeId, types['assets/scripts/puzzle/PlayerBarrierZone.ts'], {
    playerNameIncludes: 'Player',
  });

  addCheckpoint(builder, {
    name: 'Checkpoint-DungeonRoomC',
    markerId: 'dungeon-room-c-entry',
    label: '炸虫房营火',
    position: vec3(-514, -20, 0),
  });
  addScenePortal(builder, {
    name: 'Portal-DungeonHubReturn-C',
    label: '返回大厅',
    position: vec3(-698, -20, 0),
    targetScene: 'DungeonHub',
    targetMarkerId: 'dungeon-hub-entry',
    targetPosition: { x: 120, y: -20, z: 0 },
    active: true,
    width: 188,
  });

  const roomCWallClosed = addLabeledNode(roots.worldRootId, 'RoomC-WallClosed', '裂墙', vec3(250, -10, 0), 196, 56, 18, color(255, 241, 239, 255), true, color(137, 78, 67, 255), color(255, 211, 201, 120), 16, true);
  const roomCWallOpen = addLabeledNode(roots.worldRootId, 'RoomC-WallOpen', '通路已开', vec3(250, -10, 0), 196, 56, 18, color(20, 42, 25, 255), false, color(112, 193, 134, 255), color(224, 255, 225, 120), 16, true);
  addSceneDressingSkin(roomCWallClosed.nodeId, 'outdoor_wall_cracked', {
    tiled: false,
    hideLabelWhenSkinned: true,
    addBindingTag: false,
    maskShape: SCENE_DRESSING_MASK.ROUNDED_RECT,
    maskCornerRadius: 16,
    scaleMultiplier: 1.08,
  });
  addSceneDressingSkin(roomCWallOpen.nodeId, 'outdoor_wall_broken', {
    tiled: false,
    hideLabelWhenSkinned: true,
    addBindingTag: false,
    maskShape: SCENE_DRESSING_MASK.ROUNDED_RECT,
    maskCornerRadius: 16,
    scaleMultiplier: 1.08,
  });
  const roomCWallBarrier = addLabeledNode(
    roots.worldRootId,
    'RoomC-WallBarrier',
    '阻挡',
    vec3(336, -10, 0),
    92,
    180,
    16,
    color(255, 241, 239, 255),
    true,
    color(137, 78, 67, 118),
    color(255, 211, 201, 60),
    18,
    true,
  );
  builder.addSensorBox(roomCWallBarrier.nodeId, 88, 176);
  addComponent(roomCWallBarrier.nodeId, types['assets/scripts/puzzle/PlayerBarrierZone.ts'], {
    playerNameIncludes: 'Player',
  });
  const roomCClearRelic = addProgressFlagPickup(builder, {
    name: 'RoomC-ClearRelic',
    label: '拿取炸虫遗物',
    flagId: 'room-c-clear',
    position: vec3(446, -10, 0),
    width: 200,
    destroyOnCollected: true,
  });
  builder.items[roomCClearRelic.nodeId]._active = false;
  addComponent(roomCWallClosed.nodeId, types['assets/scripts/puzzle/BreakableTarget.ts'], {
    startsBroken: false,
    activateOnBroken: [ref(roomCWallOpen.nodeId), ref(roomCClearRelic.nodeId)],
    deactivateOnBroken: [ref(roomCWallClosed.nodeId), ref(roomCWallBarrier.nodeId)],
    intactVisualNode: ref(roomCWallClosed.nodeId),
    brokenVisualNode: ref(roomCWallOpen.nodeId),
    intactSpriteFrame: getImageBindingProps('outdoor_wall_cracked')?.spriteFrame ?? null,
    intactTexture: getImageBindingProps('outdoor_wall_cracked')?.texture ?? null,
    brokenSpriteFrame: getImageBindingProps('outdoor_wall_broken')?.spriteFrame ?? null,
    brokenTexture: getImageBindingProps('outdoor_wall_broken')?.texture ?? null,
    breakClip: null,
    breakClipVolume: 1,
    resetClip: null,
    resetClipVolume: 1,
    hideLabelsWhenSkinned: true,
  });

  addLabeledNode(roots.worldRootId, 'RoomCHint', '炸虫开墙', vec3(128, 84, 0), 154, 34, 15, color(126, 70, 56, 255), true, color(255, 232, 214, 206), color(255, 247, 230, 82), 17, true);
  addEnemy(builder, {
    name: 'RoomC-Enemy',
    label: '守卫',
    position: vec3(-108, 34, 0),
    patrolA: vec3(-170, 34, 0),
    patrolB: vec3(-20, 34, 0),
    moveSpeed: 80,
    chaseDistance: 116,
  });

  resetNodes.push(
    roomCWallClosed.nodeId,
    roomCWallOpen.nodeId,
    roomCWallBarrier.nodeId,
    roomCClearRelic.nodeId,
    roomCTopBarrier.nodeId,
    roomCBottomBarrier.nodeId,
  );
  await builder.finalize();
}

async function generateBossArena(scriptIds, prefabIds) {
  const builder = await createSceneBuilder('BossArena', scriptIds, prefabIds, {
    musicCueId: 'boss-arena',
    sceneTitle: '首领庭院',
    objectiveText: '先破盾，再趁窗口输出；胜利后回营地。',
    playerStart: vec3(-520, -20, 0),
    cameraBounds: { minX: -420, maxX: 520, minY: -90, maxY: 100 },
    cameraOffsetX: -120,
  });

  const { addAssetBindingTag, addPanelNode, addLabeledNode, addDynamicBody, addComponent, addNode, addSceneDressingSkin, addSkinnedPanelGroup, getImageBindingProps, items, refs, resetNodes, roots, types } = builder;

  const bossBackdrop = addPanelNode(roots.worldRootId, 'BossBackdrop', vec3(100, 0, 0), 1800, 540, color(245, 235, 220, 255), color(255, 238, 204, 64), true, 28);
  addSceneDressingSkin(bossBackdrop.nodeId, 'outdoor_wall_standard', { tiled: true });
  const bossArenaFloor = addSkinnedPanelGroup(roots.worldRootId, 'BossArenaFloor', 'outdoor_wall_cracked', [
    {
      position: vec3(138, -12, 0),
      width: 620,
      height: 188,
      fillColor: color(243, 214, 176, 204),
      strokeColor: color(255, 234, 205, 76),
      cornerRadius: 28,
    },
    {
      position: vec3(346, -12, 0),
      width: 286,
      height: 140,
      fillColor: color(243, 214, 176, 184),
      strokeColor: color(255, 234, 205, 68),
      cornerRadius: 22,
      addBindingTag: false,
    },
  ], { tiled: true });
  const worldChildren = items[roots.worldRootId]._children;
  const playerChildIndex = worldChildren.findIndex((child) => child.__id__ === refs.playerNode.nodeId);
  const lastFloorNodeId = bossArenaFloor[bossArenaFloor.length - 1]?.nodeId ?? null;
  const lastFloorIndex = lastFloorNodeId === null
    ? -1
    : worldChildren.findIndex((child) => child.__id__ === lastFloorNodeId);
  if (playerChildIndex >= 0 && lastFloorIndex >= 0 && playerChildIndex < lastFloorIndex) {
    const [playerChild] = worldChildren.splice(playerChildIndex, 1);
    worldChildren.splice(lastFloorIndex, 0, playerChild);
  }

  addCheckpoint(builder, {
    name: 'Checkpoint-BossArena',
    markerId: 'boss-arena-entry',
    label: '首领营火',
    position: vec3(-534, -20, 0),
  });

  const bossCore = addLabeledNode(
    roots.worldRootId,
    'BossEnemy-Core',
    '',
    vec3(240, -10, 0),
    132,
    120,
    18,
    color(255, 246, 230, 255),
    true,
    color(219, 132, 98, 226),
    color(255, 232, 206, 132),
    58,
    true,
  );
  const bossCoreInnerId = addNode('BossEnemy-Core-Inner', bossCore.nodeId, vec3(0, 0, 0));
  addComponent(bossCoreInnerId, 'cc.UITransform', {
    _priority: 0,
    _contentSize: size(92, 88),
    _anchorPoint: vec2(0.5, 0.5),
  });
  addComponent(
    bossCoreInnerId,
    types['assets/scripts/visual/RectVisual.ts'],
    rectVisualProps(color(255, 192, 142, 244), color(255, 246, 216, 152), 44, 2),
  );
  const bossCoreOrbId = addNode('BossEnemy-Core-Orb', bossCore.visualNodeId, vec3(0, 4, 0), false);
  addComponent(bossCoreOrbId, 'cc.UITransform', {
    _priority: 0,
    _contentSize: size(68, 68),
    _anchorPoint: vec2(0.5, 0.5),
  });
  addComponent(
    bossCoreOrbId,
    types['assets/scripts/visual/RectVisual.ts'],
    rectVisualProps(color(255, 236, 176, 242), color(255, 255, 234, 150), 34, 2),
  );
  const bossCoreBaseId = addNode('BossEnemy-Core-Base', bossCore.visualNodeId, vec3(0, -40, 0), false);
  addComponent(bossCoreBaseId, 'cc.UITransform', {
    _priority: 0,
    _contentSize: size(86, 18),
    _anchorPoint: vec2(0.5, 0.5),
  });
  addComponent(
    bossCoreBaseId,
    types['assets/scripts/visual/RectVisual.ts'],
    rectVisualProps(color(181, 122, 96, 228), color(255, 234, 214, 90), 9, 1),
  );
  const bossCoreEyeLeftId = addNode('BossEnemy-Core-EyeLeft', bossCore.visualNodeId, vec3(-18, 10, 0));
  addComponent(bossCoreEyeLeftId, 'cc.UITransform', {
    _priority: 0,
    _contentSize: size(12, 16),
    _anchorPoint: vec2(0.5, 0.5),
  });
  addComponent(
    bossCoreEyeLeftId,
    types['assets/scripts/visual/RectVisual.ts'],
    rectVisualProps(color(81, 66, 63, 255), color(255, 255, 248, 82), 6, 1),
  );
  const bossCoreEyeRightId = addNode('BossEnemy-Core-EyeRight', bossCore.visualNodeId, vec3(18, 10, 0));
  addComponent(bossCoreEyeRightId, 'cc.UITransform', {
    _priority: 0,
    _contentSize: size(12, 16),
    _anchorPoint: vec2(0.5, 0.5),
  });
  addComponent(
    bossCoreEyeRightId,
    types['assets/scripts/visual/RectVisual.ts'],
    rectVisualProps(color(81, 66, 63, 255), color(255, 255, 248, 82), 6, 1),
  );
  const bossCoreShineId = addNode('BossEnemy-Core-Shine', bossCore.nodeId, vec3(22, 24, 0), false);
  addComponent(bossCoreShineId, 'cc.UITransform', {
    _priority: 0,
    _contentSize: size(28, 16),
    _anchorPoint: vec2(0.5, 0.5),
  });
  addComponent(
    bossCoreShineId,
    types['assets/scripts/visual/RectVisual.ts'],
    rectVisualProps(color(255, 255, 242, 198), color(255, 255, 255, 72), 8, 1),
  );
  addDynamicBody(bossCore.nodeId, 150, 60);
  addAssetBindingTag(bossCore.nodeId, 'boss_core');
  const bossHealth = addComponent(bossCore.nodeId, types['assets/scripts/combat/HealthComponent.ts'], {
    maxHealth: 8,
    invulnerableSeconds: 0.12,
    destroyNodeOnDepleted: false,
    deactivateNodeOnDepleted: false,
    acceptDamage: false,
  });
  const addShieldPart = (parentId, name, position, width, height, fillColorValue, strokeColorValue, cornerRadius, active = true) =>
    addPanelNode(parentId, name, position, width, height, fillColorValue, strokeColorValue, active, cornerRadius);

  const bossShieldClosedNodeId = addNode('BossShield-Closed', roots.worldRootId, vec3(240, -10, 0), true);
  addComponent(bossShieldClosedNodeId, 'cc.UITransform', {
    _priority: 0,
    _contentSize: size(184, 118),
    _anchorPoint: vec2(0.5, 0.5),
  });
  addShieldPart(
    bossShieldClosedNodeId,
    'BossShield-Closed-ShellLobe',
    vec3(-20, 6, 0),
    82,
    50,
    color(255, 241, 217, 250),
    color(255, 231, 195, 120),
    22,
  );
  addShieldPart(
    bossShieldClosedNodeId,
    'BossShield-Closed-HingeFin',
    vec3(-60, -14, 0),
    18,
    58,
    color(214, 151, 109, 236),
    color(255, 236, 214, 96),
    11,
    false,
  );
  addShieldPart(
    bossShieldClosedNodeId,
    'BossShield-Closed-CharmCore',
    vec3(20, 2, 0),
    42,
    40,
    color(255, 226, 170, 255),
    color(255, 245, 220, 154),
    20,
  );
  addShieldPart(
    bossShieldClosedNodeId,
    'BossShield-Closed-Counterweight',
    vec3(50, -22, 0),
    24,
    18,
    color(178, 118, 92, 236),
    color(255, 234, 214, 88),
    7,
    false,
  );
  addShieldPart(
    bossShieldClosedNodeId,
    'BossShield-Closed-Latch',
    vec3(34, 26, 0),
    16,
    10,
    color(255, 249, 228, 210),
    color(255, 255, 255, 72),
    5,
    false,
  );
  addShieldPart(
    bossShieldClosedNodeId,
    'BossShield-Closed-Spark',
    vec3(0, 30, 0),
    14,
    10,
    color(255, 255, 242, 208),
    color(255, 255, 255, 66),
    5,
    false,
  );
  addShieldPart(
    bossShieldClosedNodeId,
    'BossShield-Closed-Anchor',
    vec3(-34, -28, 0),
    24,
    16,
    color(170, 120, 92, 232),
    color(255, 236, 214, 92),
    8,
    false,
  );

  const bossShieldOpenNodeId = addNode('BossShield-Open', roots.worldRootId, vec3(240, -10, 0), false);
  addComponent(bossShieldOpenNodeId, 'cc.UITransform', {
    _priority: 0,
    _contentSize: size(188, 118),
    _anchorPoint: vec2(0.5, 0.5),
  });
  addShieldPart(
    bossShieldOpenNodeId,
    'BossShield-Open-ShellLobe',
    vec3(-28, -2, 0),
    76,
    44,
    color(235, 255, 241, 246),
    color(255, 247, 231, 114),
    20,
  );
  addShieldPart(
    bossShieldOpenNodeId,
    'BossShield-Open-HingeFin',
    vec3(-64, 10, 0),
    18,
    52,
    color(168, 198, 133, 228),
    color(245, 255, 226, 82),
    10,
    false,
  );
  addShieldPart(
    bossShieldOpenNodeId,
    'BossShield-Open-CharmCore',
    vec3(12, -4, 0),
    38,
    36,
    color(212, 244, 187, 248),
    color(240, 255, 226, 148),
    17,
  );
  addShieldPart(
    bossShieldOpenNodeId,
    'BossShield-Open-Counterweight',
    vec3(50, 14, 0),
    22,
    16,
    color(132, 184, 124, 228),
    color(246, 255, 223, 84),
    7,
    false,
  );
  addShieldPart(
    bossShieldOpenNodeId,
    'BossShield-Open-Latch',
    vec3(22, 28, 0),
    14,
    10,
    color(255, 255, 246, 196),
    color(255, 255, 255, 72),
    5,
    false,
  );
  addShieldPart(
    bossShieldOpenNodeId,
    'BossShield-Open-Spark',
    vec3(38, 20, 0),
    14,
    10,
    color(255, 255, 249, 192),
    color(255, 255, 255, 66),
    5,
    false,
  );
  addShieldPart(
    bossShieldOpenNodeId,
    'BossShield-Open-Anchor',
    vec3(-34, -24, 0),
    22,
    16,
    color(126, 177, 121, 226),
    color(246, 255, 223, 82),
    8,
    false,
  );
  const bossShieldBreakable = addComponent(bossShieldClosedNodeId, types['assets/scripts/puzzle/BreakableTarget.ts'], {
    startsBroken: false,
    activateOnBroken: [ref(bossShieldOpenNodeId)],
    deactivateOnBroken: [ref(bossShieldClosedNodeId)],
    intactVisualNode: ref(bossShieldClosedNodeId),
    brokenVisualNode: ref(bossShieldOpenNodeId),
    intactSpriteFrame: getImageBindingProps('boss_shield_closed')?.spriteFrame ?? null,
    intactTexture: getImageBindingProps('boss_shield_closed')?.texture ?? null,
    brokenSpriteFrame: getImageBindingProps('boss_shield_open')?.spriteFrame ?? null,
    brokenTexture: getImageBindingProps('boss_shield_open')?.texture ?? null,
    breakClip: null,
    breakClipVolume: 1,
    resetClip: null,
    resetClipVolume: 1,
    hideLabelsWhenSkinned: true,
  });
  addAssetBindingTag(bossShieldClosedNodeId, 'boss_shield_closed');
  addAssetBindingTag(bossShieldOpenNodeId, 'boss_shield_open');
  const bossPatrolA = addNode('BossEnemy-PatrolA', roots.worldRootId, vec3(120, -10, 0));
  const bossPatrolB = addNode('BossEnemy-PatrolB', roots.worldRootId, vec3(340, -10, 0));
  const bossAi = addComponent(bossCore.nodeId, types['assets/scripts/enemy/EnemyAI.ts'], {
    initialState: 1,
    moveSpeed: 84,
    chaseDistance: 190,
    target: ref(builder.refs.playerNode.nodeId),
    patrolPoints: [ref(bossPatrolA), ref(bossPatrolB)],
  });
  const bossVisualId = addComponent(bossCore.nodeId, types['assets/scripts/boss/BossVisualController.ts'], {
    health: ref(bossHealth),
    bossAI: ref(bossAi),
    shieldController: null,
    visualRoot: ref(bossCore.visualNodeId),
    dangerSpriteFrame: getImageBindingProps('boss_core')?.spriteFrame ?? null,
    dangerTexture: getImageBindingProps('boss_core')?.texture ?? null,
    vulnerableSpriteFrame: getImageBindingProps('boss_core')?.spriteFrame ?? null,
    vulnerableTexture: getImageBindingProps('boss_core')?.texture ?? null,
    hurtSpriteFrame: getImageBindingProps('boss_core')?.spriteFrame ?? null,
    hurtTexture: getImageBindingProps('boss_core')?.texture ?? null,
    defeatedSpriteFrame: getImageBindingProps('boss_core')?.spriteFrame ?? null,
    defeatedTexture: getImageBindingProps('boss_core')?.texture ?? null,
    hurtFlashSeconds: 0.22,
    hideLabelWhenSkinned: true,
    mirrorFacing: true,
  });
  const bossContactDamage = addComponent(bossCore.nodeId, types['assets/scripts/combat/DamageOnContact.ts'], {
    damage: 1,
    targetNameIncludes: 'Player',
    destroyAfterHit: false,
  });

  const bossExitPortal = addScenePortal(builder, {
    name: 'Portal-BossVictory',
    label: '回营地',
    position: vec3(706, -10, 0),
    targetScene: 'StartCamp',
    targetMarkerId: 'camp-entry',
    targetPosition: { x: -360, y: -20, z: 0 },
    active: false,
    width: 188,
  });
  const victoryBanner = addLabeledNode(roots.worldRootId, 'BossVictoryBanner', '回营地', vec3(516, 90, 0), 136, 36, 16, color(54, 112, 69, 255), false, color(224, 251, 204, 224), color(247, 255, 229, 106), 18, true);
  const bossStatus = addLabeledNode(roots.worldRootId, 'BossStatusBanner', '破盾', vec3(516, 90, 0), 112, 36, 16, color(142, 76, 62, 255), true, color(255, 229, 210, 224), color(255, 247, 230, 106), 18, true);
  const bossWindowBanner = addLabeledNode(roots.worldRootId, 'BossWindowBanner', '快打', vec3(516, 90, 0), 112, 36, 16, color(54, 112, 69, 255), false, color(224, 251, 204, 224), color(247, 255, 229, 106), 18, true);

  const bossController = addNode('BossEncounterControllerNode', roots.worldRootId, vec3());
  addComponent(bossController, types['assets/scripts/boss/BossEncounterController.ts'], {
    bossHealth: ref(bossHealth),
    bossRoot: ref(bossCore.nodeId),
    clearFlagId: 'boss-cleared',
    activateOnCleared: [ref(bossExitPortal.nodeId), ref(victoryBanner.nodeId)],
    deactivateOnCleared: [ref(bossStatus.nodeId), ref(bossWindowBanner.nodeId), ref(bossShieldClosedNodeId), ref(bossShieldOpenNodeId)],
  });
  const bossShieldController = addNode('BossShieldControllerNode', roots.worldRootId, vec3());
  const bossShieldControllerComponent = addComponent(bossShieldController, types['assets/scripts/boss/BossShieldPhaseController.ts'], {
    shieldTarget: ref(bossShieldBreakable),
    bossHealth: ref(bossHealth),
    bossAI: ref(bossAi),
    bossContactDamage: ref(bossContactDamage),
    vulnerableSeconds: 3.2,
    dangerMoveSpeed: 84,
    vulnerableMoveSpeed: 22,
    activateWhenShieldBroken: [ref(bossShieldOpenNodeId)],
    deactivateWhenShieldBroken: [ref(bossShieldClosedNodeId)],
    activateWhenDanger: [ref(bossStatus.nodeId)],
    activateWhenVulnerable: [ref(bossWindowBanner.nodeId)],
  });
  items[bossVisualId].shieldController = ref(bossShieldControllerComponent);
  await builder.finalize();
}

async function main() {
  const scriptIds = await ensureScriptMetas();
  const prefabIds = await getPrefabIds();
  await generateStartCamp(scriptIds, prefabIds);
  await generateFieldWest(scriptIds, prefabIds);
  await generateFieldRuins(scriptIds, prefabIds);
  await generateDungeonHub(scriptIds, prefabIds);
  await generateDungeonRoomA(scriptIds, prefabIds);
  await generateDungeonRoomB(scriptIds, prefabIds);
  await generateDungeonRoomC(scriptIds, prefabIds);
  await generateBossArena(scriptIds, prefabIds);
  console.log('Generated scenes: StartCamp, FieldWest, FieldRuins, DungeonHub, DungeonRoomA, DungeonRoomB, DungeonRoomC, BossArena');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
