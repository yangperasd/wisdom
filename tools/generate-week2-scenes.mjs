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
  const canvasTransform = items[5];
  const canvasComponent = items[6];
  const widgetComponent = items[7];

  canvasNode._name = 'Canvas';
  canvasNode._children = [ref(cameraId)];
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

    return addComponent(nodeId, types['assets/scripts/visual/SceneDressingSkin.ts'], {
      visualRoot: options.visualRootId ? ref(options.visualRootId) : null,
      spriteFrame: imageBinding.spriteFrame,
      texture: imageBinding.texture,
      hideLabelWhenSkinned: options.hideLabelWhenSkinned ?? false,
      tiled: options.tiled ?? true,
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
    return { nodeId };
  };

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
    'PLAYER',
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
    idleSpriteFrame: null,
    idleTexture: playerImageBinding?.texture ?? null,
    moveSpriteFrame: null,
    moveTexture: playerImageBinding?.texture ?? null,
    attackSpriteFrame: null,
    attackTexture: playerImageBinding?.texture ?? null,
    launchSpriteFrame: null,
    launchTexture: playerImageBinding?.texture ?? null,
    hurtSpriteFrame: null,
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

  const hudTopBar = addPanelNode(hudRootId, 'HudTopBar', vec3(0, 278, 0), 930, 88, color(15, 24, 32, 225), color(114, 164, 179, 70), true, 20);
  const hudObjectiveCard = addPanelNode(hudRootId, 'HudObjectiveCard', vec3(0, 216, 0), 930, 52, color(25, 43, 38, 212), color(115, 172, 146, 58), true, 16);
  const hudControlsCard = addPanelNode(hudRootId, 'HudControlsCard', vec3(0, -274, 0), 930, 54, color(19, 26, 34, 188), color(113, 144, 169, 42), true, 16);
  const sceneTitleLabel = addLabel(hudRootId, 'HudSceneTitle', options.sceneTitle, vec3(-340, 278, 0), 260, 34, 24, color(245, 246, 240, 255), true, true, 0, 1);
  const objectiveLabel = addLabel(hudRootId, 'HudObjective', options.objectiveText, vec3(0, 216, 0), 780, 34, 18, color(226, 244, 224, 255), true, false, 1, 1);
  const healthLabel = addLabel(hudRootId, 'HudHealth', '生命 3/3', vec3(20, 278, 0), 150, 28, 18, color(245, 232, 221, 255), true, true, 1, 1);
  const echoLabel = addLabel(hudRootId, 'HudEcho', '当前回响 箱子', vec3(206, 278, 0), 240, 28, 18, color(228, 242, 255, 255), true, false, 1, 1);
  const checkpointLabel = addLabel(hudRootId, 'HudCheckpoint', '检查点 未激活', vec3(384, 278, 0), 220, 28, 16, color(220, 223, 226, 255), true, false, 1, 1);
  const controlsLabel = addLabel(hudRootId, 'HudControls', '左侧摇杆移动，右侧按钮攻击与召唤', vec3(0, -274, 0), 860, 32, 16, color(206, 220, 234, 255), true, false, 1, 1);

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
  addComponent(joystickVisualId, types['assets/scripts/visual/RectVisual.ts'], rectVisualProps(color(18, 28, 34, 176), color(178, 214, 220, 96), 74, 3));
  const joystickKnobId = addNode('Joystick-Knob', joystickNodeId, vec3());
  addComponent(joystickKnobId, 'cc.UITransform', {
    _priority: 0,
    _contentSize: size(62, 62),
    _anchorPoint: vec2(0.5, 0.5),
  });
  addComponent(joystickKnobId, types['assets/scripts/visual/RectVisual.ts'], rectVisualProps(color(111, 183, 194, 255), color(235, 255, 255, 120), 31, 2));
  addComponent(joystickNodeId, types['assets/scripts/input/TouchJoystick.ts'], {
    player: ref(playerControllerId),
    knob: ref(joystickKnobId),
    maxRadius: 56,
    deadzone: 10,
  });

  const touchAttack = addTouchButton('TouchAttack', 'ATTACK', vec3(350, -196, 0), 118, 70, color(31, 18, 12, 255), color(236, 159, 89, 245), color(255, 236, 212, 100), 0);
  const touchPlaceEcho = addTouchButton('TouchPlaceEcho', 'SUMMON', vec3(224, -248, 0), 124, 66, color(18, 27, 16, 255), color(131, 207, 145, 245), color(226, 255, 225, 100), 1);
  const touchRespawn = addTouchButton('TouchRespawn', 'RESET', vec3(390, -286, 0), 94, 46, color(255, 243, 240, 255), color(111, 69, 74, 225), color(255, 219, 208, 100), 2);
  const touchEchoBox = addTouchButton('TouchEchoBox', 'BOX', vec3(182, -154, 0), 82, 42, color(35, 27, 17, 255), color(214, 176, 96, 255), color(255, 236, 186, 100), 3);
  const touchEchoFlower = addTouchButton('TouchEchoFlower', 'FLOWER', vec3(282, -154, 0), 94, 42, color(236, 255, 235, 255), color(67, 146, 88, 255), color(213, 255, 209, 100), 4);
  const touchEchoBomb = addTouchButton('TouchEchoBomb', 'BOMB', vec3(388, -154, 0), 88, 42, color(255, 241, 238, 255), color(156, 68, 66, 255), color(255, 209, 200, 100), 5);
  const touchPause = addTouchButton('TouchPause', 'PAUSE', vec3(414, 278, 0), 102, 42, color(241, 247, 255, 255), color(71, 87, 108, 235), color(220, 235, 255, 96), 8);
  const pausePanel = addPanelNode(hudRootId, 'PausePanel', vec3(0, 0, 0), 430, 286, color(14, 21, 29, 236), color(170, 199, 219, 84), false, 24);
  addLabel(pausePanel.nodeId, 'PauseTitle', 'Paused', vec3(0, 98, 0), 260, 40, 26, color(245, 246, 240, 255), true, true, 1, 1);
  addLabel(pausePanel.nodeId, 'PauseBody', 'Continue, restart from the checkpoint, or return to camp.', vec3(0, 46, 0), 340, 54, 16, color(212, 224, 234, 255), true, false, 1, 1);
  addTouchButton('PauseContinue', 'CONTINUE', vec3(0, -18, 0), 178, 54, color(22, 34, 19, 255), color(131, 207, 145, 245), color(226, 255, 225, 100), 9, pausePanel.nodeId);
  addTouchButton('PauseRestart', 'RESTART', vec3(0, -88, 0), 178, 54, color(255, 243, 240, 255), color(111, 69, 74, 225), color(255, 219, 208, 100), 2, pausePanel.nodeId);
  addTouchButton('PauseCamp', 'RETURN CAMP', vec3(0, -158, 0), 198, 54, color(241, 247, 255, 255), color(71, 87, 108, 235), color(220, 235, 255, 96), 10, pausePanel.nodeId);

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
  const { addNode, addComponent, addLabeledNode, addDynamicBody, getImageBindingProps, resetNodes, refs, types } = builder;
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
    idleSpriteFrame: null,
    idleTexture: commonEnemyBinding?.texture ?? null,
    patrolSpriteFrame: null,
    patrolTexture: commonEnemyBinding?.texture ?? null,
    chaseSpriteFrame: null,
    chaseTexture: commonEnemyBinding?.texture ?? null,
    hurtSpriteFrame: null,
    hurtTexture: commonEnemyBinding?.texture ?? null,
    defeatedSpriteFrame: null,
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
  addSensorBox(checkpointNode.nodeId, 112, 36);
  addComponent(checkpointNode.nodeId, types['assets/scripts/core/CheckpointMarker.ts'], {
    markerId: config.markerId,
    playerNameIncludes: 'Player',
    visualSpriteFrame: checkpointImageBinding?.spriteFrame ?? null,
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
    config.fillColor ?? color(73, 102, 134, 225),
    config.strokeColor ?? color(214, 236, 255, 100),
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
  });
  addAssetBindingTag(portalNode.nodeId, 'portal');
  resetNodes.push(portalNode.nodeId);
  return portalNode;
}

function addEchoPickup(builder, config) {
  const { addAssetBindingTag, addComponent, addLabeledNode, addSensorBox, refs, resetNodes, types } = builder;
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
    visualSpriteFrame: null,
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
  const { addAssetBindingTag, addComponent, addLabeledNode, addSensorBox, resetNodes, types } = builder;
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
    visualSpriteFrame: null,
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
    cameraBounds: { minX: -420, maxX: 260, minY: -70, maxY: 90 },
    cameraOffsetX: -120,
  });

  const { addPanelNode, addLabeledNode, addComponent, addSceneDressingSkin, addSensorBox, resetNodes, roots, types } = builder;

  const campBackdrop = addPanelNode(roots.worldRootId, 'CampBackdrop', vec3(0, 4, 0), 1560, 560, color(34, 58, 54, 255), color(118, 173, 163, 52), true, 26);
  const campLeftLane = addPanelNode(roots.worldRootId, 'CampLeftLane', vec3(-420, -12, 0), 310, 250, color(45, 71, 60, 210), color(142, 201, 176, 46), true, 20);
  const campPlateZone = addPanelNode(roots.worldRootId, 'CampPlateZone', vec3(80, -82, 0), 420, 160, color(96, 77, 48, 205), color(225, 198, 140, 58), true, 22);
  const campGateZone = addPanelNode(roots.worldRootId, 'CampGateZone', vec3(374, -20, 0), 262, 186, color(61, 48, 55, 196), color(201, 161, 180, 44), true, 20);
  const campTopLane = addPanelNode(roots.worldRootId, 'CampTopLane', vec3(-10, 186, 0), 930, 98, color(26, 50, 42, 180), color(140, 186, 167, 42), true, 18);
  addSceneDressingSkin(campBackdrop.nodeId, 'outdoor_ground_green', { tiled: true });
  addSceneDressingSkin(campLeftLane.nodeId, 'outdoor_ground_flowers', { tiled: true });
  addSceneDressingSkin(campPlateZone.nodeId, 'outdoor_path_cobble', { tiled: true });
  addSceneDressingSkin(campGateZone.nodeId, 'outdoor_wall_standard', { tiled: true });
  addSceneDressingSkin(campTopLane.nodeId, 'outdoor_ground_green', { tiled: true });

  addCheckpoint(builder, {
    name: 'Checkpoint-Camp',
    markerId: 'camp-entry',
    label: '营地篝火',
    position: vec3(-488, -20, 0),
  });

  addCheckpoint(builder, {
    name: 'Checkpoint-CampReturn',
    markerId: 'camp-return',
    label: 'WEST GATE CHECK',
    position: vec3(440, -20, 0),
  });

  const campPlate = addLabeledNode(
    roots.worldRootId,
    'CampPlate',
    'PRESS PLATE',
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
    'WEST GATE',
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
    'WEST OPEN',
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
  addSceneDressingSkin(campGateClosed.nodeId, 'barrier_closed', { tiled: false, hideLabelWhenSkinned: true, addBindingTag: false });
  addSceneDressingSkin(campGateOpen.nodeId, 'barrier_open', { tiled: false, hideLabelWhenSkinned: true, addBindingTag: false });
  const portalFieldWest = addScenePortal(builder, {
    name: 'Portal-FieldWest',
    label: '进入林间小径',
    position: vec3(472, -20, 0),
    targetScene: 'FieldWest',
    targetMarkerId: 'field-west-entry',
    targetPosition: { x: -500, y: -20, z: 0 },
    active: false,
    fillColor: color(82, 117, 153, 232),
    strokeColor: color(220, 240, 255, 112),
  });
  addComponent(campPlate.nodeId, types['assets/scripts/puzzle/PressurePlateSwitch.ts'], {
    allowedNodeNameIncludes: 'Echo-box',
    activateOnPressed: [ref(campGateOpen.nodeId), ref(portalFieldWest.nodeId)],
    deactivateOnPressed: [ref(campGateClosed.nodeId)],
    startsPressed: false,
  });

  addLabeledNode(roots.worldRootId, 'CampHint-Box', '放置箱子压住机关', vec3(110, 12, 0), 208, 38, 16, color(237, 246, 229, 255), true, color(68, 122, 84, 180), color(207, 248, 214, 62), 14, false);
  addLabeledNode(roots.worldRootId, 'CampHint-Move', '先熟悉移动与攻击', vec3(-284, 96, 0), 196, 38, 16, color(235, 241, 255, 255), true, color(54, 81, 111, 180), color(210, 228, 255, 62), 14, false);
  addLabeledNode(roots.worldRootId, 'CampSign', 'BOX TRAINING', vec3(-32, 184, 0), 200, 40, 16, color(255, 247, 232, 255), true, color(121, 90, 54, 180), color(240, 219, 178, 54), 12, false);

  const campVictoryBanner = addLabeledNode(roots.worldRootId, 'CampVictoryBanner', 'TRIAL COMPLETE', vec3(286, 182, 0), 248, 46, 18, color(235, 255, 235, 255), false, color(67, 146, 88, 255), color(213, 255, 209, 100), 16, true);
  const campVictoryHint = addLabeledNode(roots.worldRootId, 'CampVictoryHint', 'You returned with the relic. The camp now marks the route as cleared.', vec3(286, 136, 0), 420, 38, 16, color(235, 255, 235, 255), false, color(58, 115, 74, 180), color(214, 255, 214, 70), 14, false);
  addFlagGateController(builder, {
    name: 'CampVictoryController',
    requiredFlags: ['boss-cleared'],
    activateWhenReady: [campVictoryBanner.nodeId, campVictoryHint.nodeId],
  });

  addEnemy(builder, {
    name: 'CampEnemy',
    label: 'SLIME',
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

  const { addPanelNode, addLabeledNode, addComponent, addNode, addSceneDressingSkin, addSensorBox, resetNodes, roots, types } = builder;

  const fieldBackdrop = addPanelNode(roots.worldRootId, 'FieldBackdrop', vec3(110, 0, 0), 1840, 560, color(24, 40, 46, 255), color(104, 137, 150, 50), true, 26);
  const fieldLane = addPanelNode(roots.worldRootId, 'FieldLane', vec3(-260, -10, 0), 860, 250, color(45, 68, 52, 220), color(144, 193, 162, 42), true, 22);
  const trapLane = addPanelNode(roots.worldRootId, 'TrapLane', vec3(278, 4, 0), 360, 210, color(109, 63, 46, 188), color(242, 184, 144, 50), true, 22);
  const landingLane = addPanelNode(roots.worldRootId, 'LandingLane', vec3(598, 102, 0), 280, 118, color(57, 91, 118, 188), color(197, 224, 255, 58), true, 20);
  const fieldTopStrip = addPanelNode(roots.worldRootId, 'FieldTopStrip', vec3(0, 184, 0), 1460, 102, color(29, 55, 43, 184), color(139, 188, 163, 42), true, 20);
  addSceneDressingSkin(fieldBackdrop.nodeId, 'outdoor_ground_green', { tiled: true });
  addSceneDressingSkin(fieldLane.nodeId, 'outdoor_ground_flowers', { tiled: true });
  addSceneDressingSkin(trapLane.nodeId, 'outdoor_path_cobble', { tiled: true });
  addSceneDressingSkin(landingLane.nodeId, 'outdoor_path_cobble', { tiled: true });
  addSceneDressingSkin(fieldTopStrip.nodeId, 'outdoor_ground_green', { tiled: true });

  addCheckpoint(builder, {
    name: 'Checkpoint-FieldWest',
    markerId: 'field-west-entry',
    label: '林间营火',
    position: vec3(-516, -20, 0),
  });

  addCheckpoint(builder, {
    name: 'Checkpoint-FieldWestReturn',
    markerId: 'field-west-return',
    label: 'RUINS GATE CHECK',
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
    fillColor: color(76, 101, 136, 225),
    strokeColor: color(218, 239, 255, 102),
  });

  addEnemy(builder, {
    name: 'FieldEnemy',
    label: 'SCOUT',
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
  addLabeledNode(roots.worldRootId, 'WestLanding', 'SAFE LANDING', vec3(598, 102, 0), 180, 38, 16, color(229, 245, 255, 255), true, color(73, 108, 139, 180), color(205, 232, 255, 70), 14, false);

  const trapNode = addLabeledNode(
    roots.worldRootId,
    'Trap-West',
    'TRAP',
    vec3(314, -4, 0),
    96,
    42,
    18,
    color(58, 27, 10, 255),
    true,
    color(223, 128, 69, 255),
    color(255, 217, 184, 120),
    14,
    true,
  );
  const trapSpawnId = addNode('Trap-West-Spawn', trapNode.nodeId, vec3(56, 0, 0));
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
    visualSpriteFrame: null,
    fireClip: null,
    fireClipVolume: 1,
    hideLabelWhenSkinned: true,
  });
  addSceneDressingSkin(trapNode.nodeId, 'outdoor_wall_cracked', { tiled: false, hideLabelWhenSkinned: true, addBindingTag: false });

  const ruinsPortal = addScenePortal(builder, {
    name: 'Portal-FieldRuins',
    label: '前往遗迹试炼',
    position: vec3(778, 102, 0),
    targetScene: 'FieldRuins',
    targetMarkerId: 'field-ruins-entry',
    targetPosition: { x: -520, y: -20, z: 0 },
    active: true,
    fillColor: color(92, 124, 166, 232),
    strokeColor: color(226, 240, 255, 110),
    width: 200,
    height: 52,
  });

  resetNodes.push(trapNode.nodeId, ruinsPortal.nodeId);
  await builder.finalize();
}

async function generateFieldRuins(scriptIds, prefabIds) {
  const builder = await createSceneBuilder('FieldRuins', scriptIds, prefabIds, {
    musicCueId: 'field-ruins',
    sceneTitle: 'Ruins Approach',
    objectiveText: 'Unlock BombBug, blast the wall, and enter the trial gate.',
    playerStart: vec3(-520, -20, 0),
    cameraBounds: { minX: -420, maxX: 620, minY: -80, maxY: 110 },
    cameraOffsetX: -120,
  });

  const { addPanelNode, addLabeledNode, addComponent, addSceneDressingSkin, resetNodes, roots, types } = builder;

  const ruinsBackdrop = addPanelNode(roots.worldRootId, 'RuinsBackdrop', vec3(120, 0, 0), 1960, 560, color(28, 34, 44, 255), color(112, 132, 162, 48), true, 26);
  const ruinsLane = addPanelNode(roots.worldRootId, 'RuinsLane', vec3(-220, -10, 0), 900, 260, color(52, 61, 68, 214), color(161, 183, 197, 42), true, 22);
  const ruinsPickupZone = addPanelNode(roots.worldRootId, 'RuinsPickupZone', vec3(20, 170, 0), 420, 120, color(58, 79, 68, 188), color(171, 214, 190, 48), true, 20);
  const crackedWallZone = addPanelNode(roots.worldRootId, 'CrackedWallZone', vec3(404, -14, 0), 320, 220, color(102, 70, 54, 190), color(230, 191, 156, 50), true, 22);
  const dungeonApproachZone = addPanelNode(roots.worldRootId, 'DungeonApproachZone', vec3(724, 88, 0), 310, 118, color(59, 86, 112, 194), color(197, 222, 246, 58), true, 20);
  addSceneDressingSkin(ruinsBackdrop.nodeId, 'outdoor_ground_ruins', { tiled: true });
  addSceneDressingSkin(ruinsLane.nodeId, 'outdoor_path_cobble', { tiled: true });
  addSceneDressingSkin(ruinsPickupZone.nodeId, 'outdoor_ground_flowers', { tiled: true });
  addSceneDressingSkin(crackedWallZone.nodeId, 'outdoor_wall_cracked', { tiled: true });
  addSceneDressingSkin(dungeonApproachZone.nodeId, 'outdoor_wall_broken', { tiled: true });

  addCheckpoint(builder, {
    name: 'Checkpoint-FieldRuins',
    markerId: 'field-ruins-entry',
    label: 'RUINS CHECK',
    position: vec3(-534, -20, 0),
  });

  addScenePortal(builder, {
    name: 'Portal-FieldWestReturn',
    label: 'BACK TO WEST',
    position: vec3(-712, -20, 0),
    targetScene: 'FieldWest',
    targetMarkerId: 'field-west-return',
    targetPosition: { x: 708, y: 102, z: 0 },
    active: true,
    fillColor: color(76, 101, 136, 225),
    strokeColor: color(218, 239, 255, 102),
    width: 196,
  });

  addEnemy(builder, {
    name: 'RuinsEnemy',
    label: 'GUARD',
    position: vec3(-34, 24, 0),
    patrolA: vec3(-148, 24, 0),
    patrolB: vec3(58, 24, 0),
    moveSpeed: 86,
    chaseDistance: 142,
  });

  addEchoPickup(builder, {
    name: 'EchoPickup-Bomb-Ruins',
    label: 'UNLOCK BOMB',
    position: vec3(4, 170, 0),
    width: 180,
    echoId: 2,
    bindingKey: 'echo_bomb_bug',
    fillColor: color(135, 68, 62, 255),
    strokeColor: color(255, 209, 200, 102),
    tint: color(255, 241, 236, 255),
  });

  addLabeledNode(roots.worldRootId, 'RuinsHint-Bomb', 'PLACE BOMB BUG BY THE WALL', vec3(232, 92, 0), 290, 38, 16, color(255, 245, 238, 255), true, color(114, 71, 58, 184), color(255, 214, 200, 70), 14, false);
  addLabeledNode(roots.worldRootId, 'RuinsHint-Dungeon', 'THE TRIAL GATE OPENS AFTER THE BLAST', vec3(724, 166, 0), 330, 38, 16, color(231, 243, 255, 255), true, color(58, 92, 126, 182), color(205, 228, 255, 72), 14, false);
  addLabeledNode(roots.worldRootId, 'RuinsLanding', 'TRIAL PATH', vec3(724, 88, 0), 172, 38, 16, color(229, 245, 255, 255), true, color(73, 108, 139, 180), color(205, 232, 255, 70), 14, false);

  const ruinsWallClosed = addLabeledNode(
    roots.worldRootId,
    'RuinsWall-Closed',
    'CRACKED WALL',
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
    'WALL OPEN',
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
  addSceneDressingSkin(ruinsWallClosed.nodeId, 'outdoor_wall_cracked', { tiled: false, hideLabelWhenSkinned: true, addBindingTag: false });
  addSceneDressingSkin(ruinsWallOpen.nodeId, 'outdoor_wall_broken', { tiled: false, hideLabelWhenSkinned: true, addBindingTag: false });
  const dungeonPortal = addScenePortal(builder, {
    name: 'Portal-DungeonHub',
    label: 'ENTER DUNGEON',
    position: vec3(840, 88, 0),
    targetScene: 'DungeonHub',
    targetMarkerId: 'dungeon-hub-entry',
    targetPosition: { x: -500, y: -20, z: 0 },
    active: false,
    fillColor: color(92, 124, 166, 232),
    strokeColor: color(226, 240, 255, 110),
    width: 210,
    height: 52,
  });
  addComponent(ruinsWallClosed.nodeId, types['assets/scripts/puzzle/BreakableTarget.ts'], {
    startsBroken: false,
    activateOnBroken: [ref(ruinsWallOpen.nodeId), ref(dungeonPortal.nodeId)],
    deactivateOnBroken: [ref(ruinsWallClosed.nodeId)],
    intactVisualNode: ref(ruinsWallClosed.nodeId),
    brokenVisualNode: ref(ruinsWallOpen.nodeId),
    intactSpriteFrame: null,
    brokenSpriteFrame: null,
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
    sceneTitle: 'Trial Hub',
    objectiveText: 'Clear the three chambers to unlock the boss gate.',
    playerStart: vec3(-500, -20, 0),
    cameraBounds: { minX: -420, maxX: 620, minY: -80, maxY: 110 },
    cameraOffsetX: -120,
  });

  const { addPanelNode, addLabeledNode, resetNodes, roots } = builder;

  addPanelNode(roots.worldRootId, 'HubBackdrop', vec3(120, 0, 0), 1940, 560, color(24, 30, 40, 255), color(109, 132, 160, 48), true, 26);
  addPanelNode(roots.worldRootId, 'HubLeftLane', vec3(-270, -10, 0), 760, 250, color(44, 60, 70, 214), color(154, 179, 196, 42), true, 22);
  addPanelNode(roots.worldRootId, 'HubTopStrip', vec3(0, 186, 0), 1560, 104, color(34, 48, 61, 182), color(147, 174, 194, 46), true, 20);
  addPanelNode(roots.worldRootId, 'BossGateZone', vec3(516, -2, 0), 300, 230, color(82, 56, 62, 188), color(217, 177, 185, 52), true, 24);

  addCheckpoint(builder, {
    name: 'Checkpoint-DungeonHub',
    markerId: 'dungeon-hub-entry',
    label: 'HUB CHECK',
    position: vec3(-514, -20, 0),
  });

  addScenePortal(builder, {
    name: 'Portal-FieldRuinsReturn',
    label: 'BACK TO RUINS',
    position: vec3(-706, -20, 0),
    targetScene: 'FieldRuins',
    targetMarkerId: 'field-ruins-entry',
    targetPosition: { x: 760, y: 88, z: 0 },
    active: true,
    fillColor: color(76, 101, 136, 225),
    strokeColor: color(218, 239, 255, 102),
    width: 188,
  });

  addScenePortal(builder, {
    name: 'Portal-DungeonRoomA',
    label: 'ROOM A',
    position: vec3(-110, 122, 0),
    targetScene: 'DungeonRoomA',
    targetMarkerId: 'dungeon-room-a-entry',
    targetPosition: { x: -500, y: -20, z: 0 },
    active: true,
  });
  const roomAStatusPending = addLabeledNode(
    roots.worldRootId,
    'RoomA-StatusPending',
    'PENDING',
    vec3(-110, 78, 0),
    116,
    34,
    14,
    color(255, 243, 238, 255),
    true,
    color(126, 77, 71, 176),
    color(255, 213, 200, 64),
    12,
    true,
  );
  const roomAStatusDone = addLabeledNode(
    roots.worldRootId,
    'RoomA-StatusDone',
    'DONE',
    vec3(-110, 78, 0),
    96,
    34,
    14,
    color(235, 255, 235, 255),
    false,
    color(67, 146, 88, 176),
    color(213, 255, 209, 64),
    12,
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
    label: 'ROOM B',
    position: vec3(110, 122, 0),
    targetScene: 'DungeonRoomB',
    targetMarkerId: 'dungeon-room-b-entry',
    targetPosition: { x: -500, y: -20, z: 0 },
    active: true,
  });
  const roomBStatusPending = addLabeledNode(
    roots.worldRootId,
    'RoomB-StatusPending',
    'PENDING',
    vec3(110, 78, 0),
    116,
    34,
    14,
    color(255, 243, 238, 255),
    true,
    color(126, 77, 71, 176),
    color(255, 213, 200, 64),
    12,
    true,
  );
  const roomBStatusDone = addLabeledNode(
    roots.worldRootId,
    'RoomB-StatusDone',
    'DONE',
    vec3(110, 78, 0),
    96,
    34,
    14,
    color(235, 255, 235, 255),
    false,
    color(67, 146, 88, 176),
    color(213, 255, 209, 64),
    12,
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
    label: 'ROOM C',
    position: vec3(330, 122, 0),
    targetScene: 'DungeonRoomC',
    targetMarkerId: 'dungeon-room-c-entry',
    targetPosition: { x: -500, y: -20, z: 0 },
    active: true,
  });
  const roomCStatusPending = addLabeledNode(
    roots.worldRootId,
    'RoomC-StatusPending',
    'PENDING',
    vec3(330, 78, 0),
    116,
    34,
    14,
    color(255, 243, 238, 255),
    true,
    color(126, 77, 71, 176),
    color(255, 213, 200, 64),
    12,
    true,
  );
  const roomCStatusDone = addLabeledNode(
    roots.worldRootId,
    'RoomC-StatusDone',
    'DONE',
    vec3(330, 78, 0),
    96,
    34,
    14,
    color(235, 255, 235, 255),
    false,
    color(67, 146, 88, 176),
    color(213, 255, 209, 64),
    12,
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
    'BOSS LOCKED',
    vec3(520, -2, 0),
    216,
    60,
    18,
    color(255, 241, 239, 255),
    true,
    color(137, 70, 73, 255),
    color(255, 212, 205, 120),
    18,
    true,
  );
  const bossGateOpen = addLabeledNode(
    roots.worldRootId,
    'BossGate-Open',
    'BOSS OPEN',
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
    label: 'ENTER BOSS',
    position: vec3(708, -2, 0),
    targetScene: 'BossArena',
    targetMarkerId: 'boss-arena-entry',
    targetPosition: { x: -520, y: -20, z: 0 },
    active: false,
    width: 196,
    fillColor: color(98, 126, 168, 232),
    strokeColor: color(226, 240, 255, 110),
  });

  addFlagGateController(builder, {
    name: 'BossGateController',
    requiredFlags: ['room-a-clear', 'room-b-clear', 'room-c-clear'],
    activateWhenReady: [bossGateOpen.nodeId, bossPortal.nodeId],
    deactivateWhenReady: [bossGateClosed.nodeId],
  });

  addLabeledNode(roots.worldRootId, 'HubHint-Rooms', 'Each room teaches one echo. Done badges light up after each clear.', vec3(110, 186, 0), 440, 38, 16, color(236, 244, 255, 255), true, color(56, 82, 116, 184), color(207, 226, 255, 62), 14, false);
  addLabeledNode(roots.worldRootId, 'HubHint-Boss', 'The boss gate opens after three clear relics.', vec3(520, 122, 0), 330, 38, 16, color(255, 241, 239, 255), true, color(92, 63, 76, 184), color(255, 219, 214, 62), 14, false);

  await builder.finalize();
}

async function generateDungeonRoomA(scriptIds, prefabIds) {
  const builder = await createSceneBuilder('DungeonRoomA', scriptIds, prefabIds, {
    musicCueId: 'dungeon-room',
    sceneTitle: 'Room A - Box',
    objectiveText: 'Summon a box to hold the plate and claim the relic.',
    playerStart: vec3(-500, -20, 0),
    cameraBounds: { minX: -420, maxX: 360, minY: -80, maxY: 90 },
    cameraOffsetX: -120,
  });

  const { addPanelNode, addLabeledNode, addComponent, addSceneDressingSkin, addSensorBox, resetNodes, roots, types } = builder;

  const roomABackdrop = addPanelNode(roots.worldRootId, 'RoomABackdrop', vec3(0, 0, 0), 1500, 520, color(34, 48, 56, 255), color(130, 157, 174, 42), true, 24);
  const roomAChallengeZone = addPanelNode(roots.worldRootId, 'RoomAChallengeZone', vec3(120, -18, 0), 500, 180, color(96, 77, 48, 205), color(225, 198, 140, 58), true, 22);
  addSceneDressingSkin(roomABackdrop.nodeId, 'outdoor_ground_green', { tiled: true });
  addSceneDressingSkin(roomAChallengeZone.nodeId, 'outdoor_path_cobble', { tiled: true });

  addCheckpoint(builder, {
    name: 'Checkpoint-DungeonRoomA',
    markerId: 'dungeon-room-a-entry',
    label: 'ROOM A CHECK',
    position: vec3(-514, -20, 0),
  });
  addScenePortal(builder, {
    name: 'Portal-DungeonHubReturn-A',
    label: 'BACK TO HUB',
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
    'PLATE',
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

  const roomAGateClosed = addLabeledNode(roots.worldRootId, 'RoomA-GateClosed', 'GATE', vec3(266, -18, 0), 156, 52, 18, color(255, 241, 239, 255), true, color(124, 53, 52, 255), color(255, 202, 196, 120), 16, true);
  const roomAGateOpen = addLabeledNode(roots.worldRootId, 'RoomA-GateOpen', 'OPEN', vec3(266, -18, 0), 156, 52, 18, color(20, 42, 25, 255), false, color(112, 193, 134, 255), color(224, 255, 225, 120), 16, true);
  addSceneDressingSkin(roomAGateClosed.nodeId, 'barrier_closed', { tiled: false, hideLabelWhenSkinned: true, addBindingTag: false });
  addSceneDressingSkin(roomAGateOpen.nodeId, 'barrier_open', { tiled: false, hideLabelWhenSkinned: true, addBindingTag: false });
  const roomAGateBarrier = addLabeledNode(
    roots.worldRootId,
    'RoomA-GateBarrier',
    'LOCK',
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
    label: 'CLAIM BOX RELIC',
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

  addLabeledNode(roots.worldRootId, 'RoomAHint', 'Only the box can keep this plate held down.', vec3(104, 84, 0), 280, 38, 16, color(255, 246, 231, 255), true, color(113, 88, 58, 184), color(240, 219, 178, 54), 14, false);
  addEnemy(builder, {
    name: 'RoomA-Enemy',
    label: 'WARDEN',
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
    sceneTitle: 'Room B - Flower',
    objectiveText: 'Use SpringFlower to cross the trap lane and claim the relic.',
    playerStart: vec3(-500, -20, 0),
    cameraBounds: { minX: -420, maxX: 520, minY: -90, maxY: 110 },
    cameraOffsetX: -120,
  });

  const { addPanelNode, addLabeledNode, addComponent, addNode, addSceneDressingSkin, addSensorBox, resetNodes, roots, types } = builder;

  const roomBBackdrop = addPanelNode(roots.worldRootId, 'RoomBBackdrop', vec3(80, 0, 0), 1720, 520, color(30, 48, 40, 255), color(132, 178, 156, 42), true, 24);
  const roomBTrapLane = addPanelNode(roots.worldRootId, 'RoomBTrapLane', vec3(180, -10, 0), 420, 240, color(109, 63, 46, 188), color(242, 184, 144, 50), true, 22);
  const roomBLandingZone = addPanelNode(roots.worldRootId, 'RoomBLandingZone', vec3(536, 84, 0), 250, 110, color(57, 91, 118, 188), color(197, 224, 255, 58), true, 20);
  addSceneDressingSkin(roomBBackdrop.nodeId, 'outdoor_ground_green', { tiled: true });
  addSceneDressingSkin(roomBTrapLane.nodeId, 'outdoor_ground_ruins', { tiled: true });
  addSceneDressingSkin(roomBLandingZone.nodeId, 'outdoor_ground_flowers', { tiled: true });
  const roomBTopBarrier = addLabeledNode(
    roots.worldRootId,
    'RoomB-TopBarrier',
    'BOUNDARY',
    vec3(170, 184, 0),
    1280,
    64,
    14,
    color(232, 240, 255, 255),
    true,
    color(64, 83, 108, 128),
    color(200, 224, 255, 44),
    12,
    true,
  );
  addSensorBox(roomBTopBarrier.nodeId, 1270, 60);
  addComponent(roomBTopBarrier.nodeId, types['assets/scripts/puzzle/PlayerBarrierZone.ts'], {
    playerNameIncludes: 'Player',
  });
  const roomBBottomBarrier = addLabeledNode(
    roots.worldRootId,
    'RoomB-BottomBarrier',
    'BOUNDARY',
    vec3(170, -204, 0),
    1280,
    64,
    14,
    color(232, 240, 255, 255),
    true,
    color(64, 83, 108, 128),
    color(200, 224, 255, 44),
    12,
    true,
  );
  addSensorBox(roomBBottomBarrier.nodeId, 1270, 60);
  addComponent(roomBBottomBarrier.nodeId, types['assets/scripts/puzzle/PlayerBarrierZone.ts'], {
    playerNameIncludes: 'Player',
  });

  addCheckpoint(builder, {
    name: 'Checkpoint-DungeonRoomB',
    markerId: 'dungeon-room-b-entry',
    label: 'ROOM B CHECK',
    position: vec3(-514, -20, 0),
  });
  addScenePortal(builder, {
    name: 'Portal-DungeonHubReturn-B',
    label: 'BACK TO HUB',
    position: vec3(-698, -20, 0),
    targetScene: 'DungeonHub',
    targetMarkerId: 'dungeon-hub-entry',
    targetPosition: { x: -120, y: -20, z: 0 },
    active: true,
    width: 188,
  });

  const roomBTrap = addLabeledNode(roots.worldRootId, 'RoomB-Trap', 'TRAP', vec3(220, -6, 0), 96, 42, 18, color(58, 27, 10, 255), true, color(223, 128, 69, 255), color(255, 217, 184, 120), 14, true);
  addSceneDressingSkin(roomBTrap.nodeId, 'outdoor_wall_cracked', { tiled: false, hideLabelWhenSkinned: true, addBindingTag: false });
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
    visualSpriteFrame: null,
    fireClip: null,
    fireClipVolume: 1,
    hideLabelWhenSkinned: true,
  });
  const roomBGapHazard = addLabeledNode(
    roots.worldRootId,
    'RoomB-GapHazard',
    'GAP',
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

  addLabeledNode(roots.worldRootId, 'RoomBHint', 'Place the flower near the trap and ride the launch.', vec3(140, 94, 0), 330, 38, 16, color(235, 255, 234, 255), true, color(58, 115, 74, 180), color(214, 255, 214, 70), 14, false);
  addLabeledNode(roots.worldRootId, 'RoomBLaunchHint', 'FLOWER SPOT', vec3(126, -56, 0), 166, 34, 14, color(235, 255, 234, 255), true, color(67, 146, 88, 172), color(213, 255, 209, 66), 12, true);
  const roomBClearRelic = addProgressFlagPickup(builder, {
    name: 'RoomB-ClearRelic',
    label: 'CLAIM FLOWER RELIC',
    flagId: 'room-b-clear',
    position: vec3(706, 84, 0),
    width: 210,
    destroyOnCollected: true,
  });
  addLabeledNode(roots.worldRootId, 'RoomBLanding', 'LANDING', vec3(536, 84, 0), 156, 38, 16, color(229, 245, 255, 255), true, color(73, 108, 139, 180), color(205, 232, 255, 70), 14, false);

  addEnemy(builder, {
    name: 'RoomB-Enemy',
    label: 'SCOUT',
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
    sceneTitle: 'Room C - Bomb',
    objectiveText: 'Place BombBug by the cracked wall to reveal the relic.',
    playerStart: vec3(-500, -20, 0),
    cameraBounds: { minX: -420, maxX: 480, minY: -90, maxY: 100 },
    cameraOffsetX: -120,
  });

  const { addPanelNode, addLabeledNode, addComponent, addSceneDressingSkin, resetNodes, roots, types } = builder;

  const roomCBackdrop = addPanelNode(roots.worldRootId, 'RoomCBackdrop', vec3(60, 0, 0), 1680, 520, color(36, 36, 44, 255), color(158, 148, 172, 42), true, 24);
  const roomCBombZone = addPanelNode(roots.worldRootId, 'RoomCBombZone', vec3(230, -10, 0), 360, 220, color(102, 70, 54, 190), color(230, 191, 156, 50), true, 22);
  addSceneDressingSkin(roomCBackdrop.nodeId, 'outdoor_ground_ruins', { tiled: true });
  addSceneDressingSkin(roomCBombZone.nodeId, 'outdoor_path_cobble', { tiled: true });
  const roomCTopBarrier = addLabeledNode(
    roots.worldRootId,
    'RoomC-TopBarrier',
    'BOUNDARY',
    vec3(140, 184, 0),
    1240,
    64,
    14,
    color(232, 240, 255, 255),
    true,
    color(73, 74, 101, 128),
    color(208, 212, 255, 44),
    12,
    true,
  );
  builder.addSensorBox(roomCTopBarrier.nodeId, 1230, 60);
  addComponent(roomCTopBarrier.nodeId, types['assets/scripts/puzzle/PlayerBarrierZone.ts'], {
    playerNameIncludes: 'Player',
  });
  const roomCBottomBarrier = addLabeledNode(
    roots.worldRootId,
    'RoomC-BottomBarrier',
    'BOUNDARY',
    vec3(140, -204, 0),
    1240,
    64,
    14,
    color(232, 240, 255, 255),
    true,
    color(73, 74, 101, 128),
    color(208, 212, 255, 44),
    12,
    true,
  );
  builder.addSensorBox(roomCBottomBarrier.nodeId, 1230, 60);
  addComponent(roomCBottomBarrier.nodeId, types['assets/scripts/puzzle/PlayerBarrierZone.ts'], {
    playerNameIncludes: 'Player',
  });

  addCheckpoint(builder, {
    name: 'Checkpoint-DungeonRoomC',
    markerId: 'dungeon-room-c-entry',
    label: 'ROOM C CHECK',
    position: vec3(-514, -20, 0),
  });
  addScenePortal(builder, {
    name: 'Portal-DungeonHubReturn-C',
    label: 'BACK TO HUB',
    position: vec3(-698, -20, 0),
    targetScene: 'DungeonHub',
    targetMarkerId: 'dungeon-hub-entry',
    targetPosition: { x: 120, y: -20, z: 0 },
    active: true,
    width: 188,
  });

  const roomCWallClosed = addLabeledNode(roots.worldRootId, 'RoomC-WallClosed', 'CRACKED WALL', vec3(250, -10, 0), 196, 56, 18, color(255, 241, 239, 255), true, color(137, 78, 67, 255), color(255, 211, 201, 120), 16, true);
  const roomCWallOpen = addLabeledNode(roots.worldRootId, 'RoomC-WallOpen', 'WALL OPEN', vec3(250, -10, 0), 196, 56, 18, color(20, 42, 25, 255), false, color(112, 193, 134, 255), color(224, 255, 225, 120), 16, true);
  addSceneDressingSkin(roomCWallClosed.nodeId, 'outdoor_wall_cracked', { tiled: false, hideLabelWhenSkinned: true, addBindingTag: false });
  addSceneDressingSkin(roomCWallOpen.nodeId, 'outdoor_wall_broken', { tiled: false, hideLabelWhenSkinned: true, addBindingTag: false });
  const roomCWallBarrier = addLabeledNode(
    roots.worldRootId,
    'RoomC-WallBarrier',
    'LOCK',
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
    label: 'CLAIM BOMB RELIC',
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
    intactSpriteFrame: null,
    brokenSpriteFrame: null,
    breakClip: null,
    breakClipVolume: 1,
    resetClip: null,
    resetClipVolume: 1,
    hideLabelsWhenSkinned: true,
  });

  addLabeledNode(roots.worldRootId, 'RoomCHint', 'BombBug is the only echo that can break this wall.', vec3(144, 92, 0), 340, 38, 16, color(255, 245, 238, 255), true, color(114, 71, 58, 184), color(255, 214, 200, 70), 14, false);
  addLabeledNode(roots.worldRootId, 'RoomCBombHint', 'BOMB SPOT', vec3(130, -52, 0), 146, 34, 14, color(255, 245, 238, 255), true, color(135, 68, 62, 172), color(255, 209, 200, 66), 12, true);
  addEnemy(builder, {
    name: 'RoomC-Enemy',
    label: 'GUARD',
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
    sceneTitle: 'Boss Arena',
    objectiveText: 'Defeat the trial core and claim the route forward.',
    playerStart: vec3(-520, -20, 0),
    cameraBounds: { minX: -420, maxX: 520, minY: -90, maxY: 100 },
    cameraOffsetX: -120,
  });

  const { addAssetBindingTag, addPanelNode, addLabeledNode, addDynamicBody, addComponent, addNode, addSceneDressingSkin, getImageBindingProps, items, resetNodes, roots, types } = builder;

  const bossBackdrop = addPanelNode(roots.worldRootId, 'BossBackdrop', vec3(100, 0, 0), 1800, 540, color(40, 30, 38, 255), color(170, 132, 156, 42), true, 26);
  const bossLane = addPanelNode(roots.worldRootId, 'BossLane', vec3(140, -10, 0), 860, 260, color(70, 46, 56, 196), color(218, 177, 190, 46), true, 24);
  addSceneDressingSkin(bossBackdrop.nodeId, 'outdoor_wall_standard', { tiled: true });
  addSceneDressingSkin(bossLane.nodeId, 'outdoor_wall_cracked', { tiled: true });

  addCheckpoint(builder, {
    name: 'Checkpoint-BossArena',
    markerId: 'boss-arena-entry',
    label: 'BOSS CHECK',
    position: vec3(-534, -20, 0),
  });

  const bossCore = addLabeledNode(
    roots.worldRootId,
    'BossEnemy-Core',
    'TRIAL CORE',
    vec3(240, -10, 0),
    180,
    72,
    22,
    color(255, 244, 239, 255),
    true,
    color(148, 63, 78, 255),
    color(255, 211, 218, 120),
    20,
    true,
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
  const bossShieldClosed = addLabeledNode(
    roots.worldRootId,
    'BossShield-Closed',
    'BOMB TO BREAK',
    vec3(240, -10, 0),
    228,
    92,
    18,
    color(255, 245, 238, 255),
    true,
    color(114, 71, 58, 188),
    color(255, 214, 200, 78),
    22,
    true,
  );
  const bossShieldOpen = addLabeledNode(
    roots.worldRootId,
    'BossShield-Open',
    'SHIELD DOWN',
    vec3(240, -10, 0),
    228,
    92,
    18,
    color(235, 255, 235, 255),
    false,
    color(67, 146, 88, 188),
    color(213, 255, 209, 80),
    22,
    true,
  );
  addComponent(bossShieldClosed.nodeId, types['assets/scripts/puzzle/BreakableTarget.ts'], {
    startsBroken: false,
    activateOnBroken: [ref(bossShieldOpen.nodeId)],
    deactivateOnBroken: [ref(bossShieldClosed.nodeId)],
    intactVisualNode: ref(bossShieldClosed.nodeId),
    brokenVisualNode: ref(bossShieldOpen.nodeId),
    intactSpriteFrame: null,
    brokenSpriteFrame: null,
    breakClip: null,
    breakClipVolume: 1,
    resetClip: null,
    resetClipVolume: 1,
    hideLabelsWhenSkinned: true,
  });
  addAssetBindingTag(bossShieldClosed.nodeId, 'boss_shield_closed');
  addAssetBindingTag(bossShieldOpen.nodeId, 'boss_shield_open');
  addSceneDressingSkin(bossShieldClosed.nodeId, 'outdoor_wall_cracked', { tiled: false, hideLabelWhenSkinned: true, addBindingTag: false });
  addSceneDressingSkin(bossShieldOpen.nodeId, 'outdoor_wall_broken', { tiled: false, hideLabelWhenSkinned: true, addBindingTag: false });
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
    dangerSpriteFrame: null,
    dangerTexture: getImageBindingProps('boss_core')?.texture ?? null,
    vulnerableSpriteFrame: null,
    vulnerableTexture: getImageBindingProps('boss_core')?.texture ?? null,
    hurtSpriteFrame: null,
    hurtTexture: getImageBindingProps('boss_core')?.texture ?? null,
    defeatedSpriteFrame: null,
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
    label: 'RETURN TO CAMP',
    position: vec3(706, -10, 0),
    targetScene: 'StartCamp',
    targetMarkerId: 'camp-entry',
    targetPosition: { x: -360, y: -20, z: 0 },
    active: false,
    width: 188,
  });
  const victoryBanner = addLabeledNode(roots.worldRootId, 'BossVictoryBanner', 'TRIAL CLEARED', vec3(516, 96, 0), 240, 46, 18, color(235, 255, 235, 255), false, color(67, 146, 88, 255), color(213, 255, 209, 100), 16, true);
  const bossStatus = addLabeledNode(roots.worldRootId, 'BossStatusBanner', 'DANGER: BREAK SHIELD', vec3(516, 96, 0), 268, 46, 18, color(255, 241, 239, 255), true, color(148, 63, 78, 255), color(255, 211, 218, 100), 16, true);
  const bossWindowBanner = addLabeledNode(roots.worldRootId, 'BossWindowBanner', 'WINDOW: ATTACK NOW', vec3(516, 96, 0), 268, 46, 18, color(235, 255, 235, 255), false, color(67, 146, 88, 255), color(213, 255, 209, 100), 16, true);
  const bossReturnHint = addLabeledNode(roots.worldRootId, 'BossReturnHint', 'Take the exit and return the relic to camp.', vec3(516, 142, 0), 330, 38, 16, color(235, 255, 235, 255), false, color(58, 115, 74, 180), color(214, 255, 214, 70), 14, false);

  const bossController = addNode('BossEncounterControllerNode', roots.worldRootId, vec3());
  addComponent(bossController, types['assets/scripts/boss/BossEncounterController.ts'], {
    bossHealth: ref(bossHealth),
    bossRoot: ref(bossCore.nodeId),
    clearFlagId: 'boss-cleared',
    activateOnCleared: [ref(bossExitPortal.nodeId), ref(victoryBanner.nodeId), ref(bossReturnHint.nodeId)],
    deactivateOnCleared: [ref(bossStatus.nodeId), ref(bossWindowBanner.nodeId), ref(bossShieldClosed.nodeId), ref(bossShieldOpen.nodeId)],
  });
  const bossShieldController = addNode('BossShieldControllerNode', roots.worldRootId, vec3());
  const bossShieldControllerComponent = addComponent(bossShieldController, types['assets/scripts/boss/BossShieldPhaseController.ts'], {
    shieldTarget: ref(bossShieldClosed.nodeId),
    bossHealth: ref(bossHealth),
    bossAI: ref(bossAi),
    bossContactDamage: ref(bossContactDamage),
    vulnerableSeconds: 3.2,
    dangerMoveSpeed: 84,
    vulnerableMoveSpeed: 22,
    activateWhenShieldBroken: [ref(bossShieldOpen.nodeId)],
    deactivateWhenShieldBroken: [ref(bossShieldClosed.nodeId)],
    activateWhenDanger: [ref(bossStatus.nodeId)],
    activateWhenVulnerable: [ref(bossWindowBanner.nodeId)],
  });
  items[bossVisualId].shieldController = ref(bossShieldControllerComponent);

  addLabeledNode(roots.worldRootId, 'BossHint', 'Break the shield with BombBug, then use the short attack window before it reforms.', vec3(172, 184, 0), 520, 38, 16, color(255, 245, 238, 255), true, color(114, 71, 58, 184), color(255, 214, 200, 70), 14, false);

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
