import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();
const ASSETS_ROOT = path.join(PROJECT_ROOT, 'assets');
const SCRIPTS_ROOT = path.join(ASSETS_ROOT, 'scripts');
const PREFABS_ROOT = path.join(ASSETS_ROOT, 'prefabs');
const SCENES_ROOT = path.join(ASSETS_ROOT, 'scenes');

const TYPESCRIPT_META_VERSION = '4.0.24';
const ASSET_META_VERSION = '1.1.50';
const UI_LAYER = 33554432;
const DEFAULT_LAYER = 1073741824;
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

function createUiTransform(nodeId, width, height, anchorX = 0.5, anchorY = 0.5) {
  return createSceneComponent(nodeId, 'cc.UITransform', {
    _priority: 0,
    _contentSize: size(width, height),
    _anchorPoint: vec2(anchorX, anchorY),
  });
}

function createLabel(nodeId, text, fontSize = 20, horizontalAlign = 1, verticalAlign = 1, tint = color(255, 255, 255, 255)) {
  return createSceneComponent(nodeId, 'cc.Label', {
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
    _lineHeight: fontSize + 12,
    _overflow: 0,
    _enableWrapText: true,
    _font: null,
    _isSystemFontUsed: true,
    _isItalic: false,
    _isBold: false,
    _isUnderline: false,
    _cacheMode: 0,
  });
}

function createRigidBody2D(nodeId, {
  type = 2,
  enabledContactListener = true,
  bullet = false,
  fixedRotation = true,
  gravityScale = 0,
} = {}) {
  return createSceneComponent(nodeId, 'cc.RigidBody2D', {
    _group: 1,
    enabledContactListener,
    bullet,
    _type: type,
    _allowSleep: true,
    _gravityScale: gravityScale,
    _linearDamping: 0,
    _angularDamping: 0,
    _linearVelocity: vec2(),
    _angularVelocity: 0,
    _fixedRotation: fixedRotation,
    awakeOnLoad: true,
  });
}

function createBoxCollider2D(nodeId, width, height, sensor = true) {
  return createSceneComponent(nodeId, 'cc.BoxCollider2D', {
    editing: false,
    tag: 0,
    _group: 1,
    _density: 1,
    _sensor: sensor,
    _friction: 0.2,
    _restitution: 0,
    _offset: vec2(),
    _size: size(width, height),
  });
}

function createCircleCollider2D(nodeId, radius, sensor = true) {
  return createSceneComponent(nodeId, 'cc.CircleCollider2D', {
    editing: false,
    tag: 0,
    _group: 1,
    _density: 1,
    _sensor: sensor,
    _friction: 0.2,
    _restitution: 0,
    _offset: vec2(),
    _radius: radius,
  });
}

function createSafeAreaRootComponents(nodeId, width = 960, height = 640) {
  return [
    createSceneComponent(nodeId, 'cc.UITransform', {
      _priority: 0,
      _contentSize: size(width, height),
      _anchorPoint: vec2(0.5, 0.5),
    }),
    createSceneComponent(nodeId, 'cc.Widget', {
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
    }),
    createSceneComponent(nodeId, 'cc.SafeArea', {
      _symmetric: true,
    }),
  ];
}

function makeScriptComponent(nodeId, shortType, props = {}) {
  return createSceneComponent(nodeId, shortType, props);
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

async function buildPrefab(fileName, rootName, buildFn) {
  const prefabPath = path.join(PREFABS_ROOT, fileName);
  const prefabMeta = await ensureMeta(prefabPath, 'prefab', { userData: { syncNodeName: rootName } });
  const items = [];

  const add = (value) => {
    items.push(value);
    return items.length - 1;
  };

  const assetId = add({
    __type__: 'cc.Prefab',
    _name: path.basename(fileName, '.prefab'),
    _objFlags: 0,
    _native: '',
    data: ref(1),
    optimizationPolicy: 0,
    asyncLoadAssets: false,
    persistent: false,
  });

  const nodeId = add({
    __type__: 'cc.Node',
    _name: rootName,
    _objFlags: 0,
    _parent: null,
    _children: [],
    _active: true,
    _components: [],
    _prefab: null,
    _lpos: vec3(),
    _lrot: quat(),
    _lscale: vec3(1, 1, 1),
    _layer: UI_LAYER,
    _euler: vec3(),
    _id: '',
  });

  const addNode = (parentId, name, position = vec3(), active = true, layer = UI_LAYER) => {
    const childId = add({
      __type__: 'cc.Node',
      _name: name,
      _objFlags: 0,
      _parent: ref(parentId),
      _children: [],
      _active: active,
      _components: [],
      _prefab: null,
      _lpos: position,
      _lrot: quat(),
      _lscale: vec3(1, 1, 1),
      _layer: layer,
      _euler: vec3(),
      _id: '',
    });
    items[parentId]._children.push(ref(childId));
    return childId;
  };

  const addComponentToNode = (targetNodeId, type, props = {}) => {
    const componentId = add({
      __type__: type,
      _name: '',
      _objFlags: 0,
      node: ref(targetNodeId),
      _enabled: true,
      __prefab: null,
      ...props,
      _id: '',
    });
    const prefabInfoId = add({
      __type__: 'cc.CompPrefabInfo',
      fileId: randomToken(),
    });
    items[componentId].__prefab = ref(prefabInfoId);
    items[targetNodeId]._components.push(ref(componentId));
    return componentId;
  };

  const addComponent = (type, props = {}) => addComponentToNode(nodeId, type, props);

  buildFn({
    rootId: nodeId,
    addNode,
    addComponent,
    addComponentToNode,
  });

  const prefabInfoId = add({
    __type__: 'cc.PrefabInfo',
    root: ref(nodeId),
    asset: ref(assetId),
    fileId: randomToken(),
    instance: null,
    targetOverrides: null,
    nestedPrefabInstanceRoots: null,
  });
  items[nodeId]._prefab = ref(prefabInfoId);

  await writeJson(prefabPath, items);
  await writeJson(`${prefabPath}.meta`, {
    ...prefabMeta,
    userData: {
      syncNodeName: rootName,
    },
  });

  return prefabMeta;
}

async function generatePrefabs(scriptIds) {
  const simpleProjectileType = scriptIds.get('assets/scripts/puzzle/SimpleProjectile.ts').shortId;
  const damageOnContactType = scriptIds.get('assets/scripts/combat/DamageOnContact.ts').shortId;
  const springFlowerBounceType = scriptIds.get('assets/scripts/echo/SpringFlowerBounce.ts').shortId;
  const bombBugFuseType = scriptIds.get('assets/scripts/echo/BombBugFuse.ts').shortId;
  const rectVisualType = scriptIds.get('assets/scripts/visual/RectVisual.ts').shortId;

  const addPrefabVisual = (api, parentId, name, width, height, fillColorValue, strokeColorValue, cornerRadius = 10) => {
    const visualNodeId = api.addNode(parentId, name, vec3());
    api.addComponentToNode(visualNodeId, 'cc.UITransform', {
      _priority: 0,
      _contentSize: size(width, height),
      _anchorPoint: vec2(0.5, 0.5),
    });
    api.addComponentToNode(
      visualNodeId,
      rectVisualType,
      rectVisualProps(fillColorValue, strokeColorValue, cornerRadius, 2),
    );
    return visualNodeId;
  };

  const addPrefabLabel = (api, parentId, name, text, width, height, fontSize, tint, bold = false) => {
    const labelNodeId = api.addNode(parentId, name, vec3());
    api.addComponentToNode(labelNodeId, 'cc.UITransform', {
      _priority: 0,
      _contentSize: size(width, height),
      _anchorPoint: vec2(0.5, 0.5),
    });
    return api.addComponentToNode(labelNodeId, 'cc.Label', {
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
      _isBold: bold,
      _isUnderline: false,
      _cacheMode: 0,
    });
  };

  const echoBoxMeta = await buildPrefab('EchoBox.prefab', 'Echo-box', ({ rootId, addComponent, addComponentToNode, addNode }) => {
    addComponent('cc.UITransform', {
      _priority: 0,
      _contentSize: size(84, 44),
      _anchorPoint: vec2(0.5, 0.5),
    });
    addComponent('cc.RigidBody2D', {
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
    addComponent('cc.BoxCollider2D', {
      editing: false,
      tag: 0,
      _group: 1,
      _density: 1,
      _sensor: true,
      _friction: 0.2,
      _restitution: 0,
      _offset: vec2(),
      _size: size(84, 44),
    });
    addPrefabVisual({ addNode, addComponentToNode }, rootId, 'Visual', 84, 44, color(214, 176, 96, 255), color(255, 236, 186, 180), 12);
    addPrefabLabel({ addNode, addComponentToNode }, rootId, 'Label', 'BOX', 84, 44, 20, color(32, 24, 16, 255), true);
  });

  const springFlowerMeta = await buildPrefab('EchoSpringFlower.prefab', 'Echo-spring-flower', ({ rootId, addComponent, addComponentToNode, addNode }) => {
    addComponent('cc.UITransform', {
      _priority: 0,
      _contentSize: size(124, 48),
      _anchorPoint: vec2(0.5, 0.5),
    });
    addComponent('cc.RigidBody2D', {
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
    addComponent('cc.BoxCollider2D', {
      editing: false,
      tag: 0,
      _group: 1,
      _density: 1,
      _sensor: true,
      _friction: 0.2,
      _restitution: 0,
      _offset: vec2(),
      _size: size(124, 48),
    });
    addComponent(springFlowerBounceType, {
      directionX: 1,
      directionY: 0.35,
      launchDistance: 190,
      launchDuration: 0.22,
      cooldownSeconds: 0.45,
      playerNameIncludes: 'Player',
    });
    addPrefabVisual({ addNode, addComponentToNode }, rootId, 'Visual', 124, 48, color(67, 146, 88, 255), color(213, 255, 209, 180), 16);
    addPrefabLabel({ addNode, addComponentToNode }, rootId, 'Label', 'FLOWER', 124, 48, 18, color(238, 255, 236, 255), true);
  });

  const bombBugMeta = await buildPrefab('EchoBombBug.prefab', 'Echo-bomb-bug', ({ rootId, addComponent, addComponentToNode, addNode }) => {
    addComponent('cc.UITransform', {
      _priority: 0,
      _contentSize: size(114, 48),
      _anchorPoint: vec2(0.5, 0.5),
    });
    addComponent('cc.RigidBody2D', {
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
    addComponent('cc.BoxCollider2D', {
      editing: false,
      tag: 0,
      _group: 1,
      _density: 1,
      _sensor: true,
      _friction: 0.2,
      _restitution: 0,
      _offset: vec2(),
      _size: size(114, 48),
    });
    addComponent(bombBugFuseType, {
      fuseSeconds: 1.35,
      explosionRadius: 120,
      damage: 1,
      damagePlayer: true,
      damageEnemies: true,
      showCountdown: true,
    });
    addPrefabVisual({ addNode, addComponentToNode }, rootId, 'Visual', 114, 48, color(156, 68, 66, 255), color(255, 209, 200, 180), 16);
    addPrefabLabel({ addNode, addComponentToNode }, rootId, 'Label', 'BOMB', 114, 48, 18, color(255, 243, 238, 255), true);
  });

  const arrowProjectileMeta = await buildPrefab('ArrowProjectile.prefab', 'ArrowProjectile', ({ rootId, addComponent, addComponentToNode, addNode }) => {
    addComponent('cc.UITransform', {
      _priority: 0,
      _contentSize: size(52, 22),
      _anchorPoint: vec2(0.5, 0.5),
    });
    addComponent('cc.RigidBody2D', {
      _group: 1,
      enabledContactListener: true,
      bullet: true,
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
    addComponent('cc.CircleCollider2D', {
      editing: false,
      tag: 0,
      _group: 1,
      _density: 1,
      _sensor: true,
      _friction: 0.2,
      _restitution: 0,
      _offset: vec2(),
      _radius: 12,
    });
    addComponent(simpleProjectileType, {
      speed: 260,
      maxLifetime: 2,
      destroyOnAnyContact: true,
      ignoreNodeNameIncludes: 'Trap',
      destroyOnNodeNameIncludes: 'Player',
    });
    addComponent(damageOnContactType, {
      damage: 1,
      targetNameIncludes: 'Player',
      destroyAfterHit: false,
    });
    addPrefabVisual({ addNode, addComponentToNode }, rootId, 'Visual', 52, 18, color(208, 168, 74, 255), color(255, 238, 188, 180), 8);
    addPrefabLabel({ addNode, addComponentToNode }, rootId, 'Label', '>>', 52, 22, 20, color(40, 28, 8, 255), true);
  });

  return {
    echoBoxUuid: echoBoxMeta.uuid,
    springFlowerUuid: springFlowerMeta.uuid,
    bombBugUuid: bombBugMeta.uuid,
    arrowProjectileUuid: arrowProjectileMeta.uuid,
  };
}

async function generateScene(scriptIds, prefabIds) {
  const scenePath = path.join(SCENES_ROOT, 'MechanicsLab.scene');
  const sceneMeta = await ensureMeta(scenePath, 'scene');
  const template = clone(await readJson(COCOS_TEMPLATE_SCENE));
  template[0]._name = 'MechanicsLab';
  template[1]._name = 'MechanicsLab';
  template[1]._id = sceneMeta.uuid;

  const items = template;
  const add = (value) => {
    items.push(value);
    return items.length - 1;
  };

  const sceneId = 1;
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

  const addSafeAreaRoot = (nodeId, width = 960, height = 640) => {
    for (const component of createSafeAreaRootComponents(nodeId, width, height)) {
      const componentId = add(component);
      items[nodeId]._components.push(ref(componentId));
    }
  };

  const addPanelNode = (parentId, name, position, width, height, fillColorValue, strokeColorValue, active = true, cornerRadius = 18) => {
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
  ) => {
    const nodeId = addNode(name, parentId, position, active);
    const transformId = addComponent(nodeId, 'cc.UITransform', {
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
      _isBold: false,
      _isUnderline: false,
      _cacheMode: 0,
    });
    return { nodeId, transformId, labelId, visualNodeId, labelNodeId };
  };

  const types = Object.fromEntries(
    Array.from(scriptIds.entries()).map(([relativePath, value]) => [relativePath, value.shortId]),
  );

  const persistentRootId = addNode('PersistentRoot', canvasId, vec3(-420, 260, 0));
  const worldRootId = addNode('WorldRoot', canvasId, vec3());
  const hudRootId = addNode('HudRoot', canvasId, vec3());
  const touchHudRootId = addNode('TouchHudRoot', canvasId, vec3());
  addSafeAreaRoot(hudRootId);
  addSafeAreaRoot(touchHudRootId);
  const debugHudNode = addLabeledNode(
    hudRootId,
    'DebugLabel',
    'Loading HUD...',
    vec3(-308, 224, 0),
    332,
    108,
    18,
    color(220, 255, 220, 255),
    true,
    color(21, 32, 39, 220),
    color(129, 182, 161, 120),
    18,
  );

  addPanelNode(worldRootId, 'WorldBackdrop', vec3(120, 6, 0), 1680, 560, color(20, 35, 41, 255), color(86, 118, 118, 70), true, 28);
  addPanelNode(worldRootId, 'PickupStrip', vec3(100, 194, 0), 1660, 104, color(39, 71, 56, 196), color(145, 196, 168, 60), true, 24);
  addPanelNode(worldRootId, 'PlateZone', vec3(-120, -142, 0), 360, 120, color(92, 75, 44, 196), color(219, 196, 143, 60), true, 20);
  addPanelNode(worldRootId, 'TrapZone', vec3(250, 0, 0), 290, 236, color(108, 58, 44, 180), color(241, 179, 129, 56), true, 22);
  addPanelNode(worldRootId, 'BombZone', vec3(760, -10, 0), 336, 226, color(88, 48, 56, 196), color(255, 186, 172, 60), true, 22);
  addPanelNode(worldRootId, 'LandingZone', vec3(430, 130, 0), 200, 86, color(48, 79, 98, 160), color(176, 221, 255, 64), true, 18);

  const playerNode = addLabeledNode(
    worldRootId,
    'Player',
    'PLAYER',
    vec3(-500, -20, 0),
    94,
    48,
    20,
    color(18, 26, 34, 255),
    true,
    color(123, 175, 219, 255),
    color(232, 248, 255, 160),
    14,
  );
  addComponent(playerNode.nodeId, 'cc.RigidBody2D', {
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
  addComponent(playerNode.nodeId, 'cc.BoxCollider2D', {
    editing: false,
    tag: 0,
    _group: 1,
    _density: 1,
    _sensor: true,
    _friction: 0.2,
    _restitution: 0,
    _offset: vec2(),
    _size: size(88, 36),
  });
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
  addComponent(attackAnchorId, 'cc.RigidBody2D', {
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
  addComponent(attackAnchorId, 'cc.BoxCollider2D', {
    editing: false,
    tag: 0,
    _group: 1,
    _density: 1,
    _sensor: true,
    _friction: 0.2,
    _restitution: 0,
    _offset: vec2(),
    _size: size(32, 32),
  });

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
  addComponent(attackAnchorId, types['assets/scripts/player/AttackHitbox.ts'], {
    player: ref(playerControllerId),
    damage: 1,
    targetNameIncludes: 'Enemy',
  });

  addComponent(worldRootId, types['assets/scripts/core/WorldCameraRig2D.ts'], {
    target: ref(playerNode.nodeId),
    followSharpness: 10,
    offsetX: -80,
    offsetY: 0,
    minRigX: -420,
    maxRigX: 260,
    minRigY: -70,
    maxRigY: 80,
  });

  const checkpointNode = addLabeledNode(
    worldRootId,
    'Checkpoint-01',
    'CHECK',
    vec3(-410, -20, 0),
    104,
    42,
    18,
    color(53, 41, 12, 255),
    true,
    color(244, 209, 114, 255),
    color(255, 245, 198, 150),
    12,
  );
  addComponent(checkpointNode.nodeId, 'cc.BoxCollider2D', {
    editing: false,
    tag: 0,
    _group: 1,
    _density: 1,
    _sensor: true,
    _friction: 0.2,
    _restitution: 0,
    _offset: vec2(),
    _size: size(112, 36),
  });
  addComponent(checkpointNode.nodeId, types['assets/scripts/core/CheckpointMarker.ts'], {
    markerId: 'checkpoint-01',
    playerNameIncludes: 'Player',
  });

  const plateNode = addLabeledNode(
    worldRootId,
    'Plate-01',
    'PLATE',
    vec3(-170, -140, 0),
    108,
    38,
    18,
    color(21, 41, 23, 255),
    true,
    color(121, 193, 111, 255),
    color(223, 255, 210, 120),
    12,
  );
  addComponent(plateNode.nodeId, 'cc.RigidBody2D', {
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
  addComponent(plateNode.nodeId, 'cc.BoxCollider2D', {
    editing: false,
    tag: 0,
    _group: 1,
    _density: 1,
    _sensor: true,
    _friction: 0.2,
    _restitution: 0,
    _offset: vec2(),
    _size: size(84, 32),
  });

  const gateClosedNode = addLabeledNode(
    worldRootId,
    'Gate-Closed',
    'GATE CLOSED',
    vec3(16, -140, 0),
    174,
    44,
    18,
    color(255, 241, 239, 255),
    true,
    color(124, 53, 52, 255),
    color(255, 202, 196, 120),
    14,
  );
  const gateOpenNode = addLabeledNode(
    worldRootId,
    'Gate-Open',
    'PATH OPEN',
    vec3(16, -140, 0),
    174,
    44,
    18,
    color(20, 42, 25, 255),
    false,
    color(112, 193, 134, 255),
    color(224, 255, 225, 120),
    14,
  );
  addComponent(plateNode.nodeId, types['assets/scripts/puzzle/PressurePlateSwitch.ts'], {
    allowedNodeNameIncludes: 'Echo-box',
    activateOnPressed: [ref(gateOpenNode.nodeId)],
    deactivateOnPressed: [ref(gateClosedNode.nodeId)],
    startsPressed: false,
  });

  addLabeledNode(
    worldRootId,
    'SpringHint',
    'PLACE FLOWER NEAR TRAP',
    vec3(116, 86, 0),
    260,
    38,
    16,
    color(235, 255, 234, 255),
    true,
    color(58, 115, 74, 180),
    color(214, 255, 214, 70),
    14,
  );
  addLabeledNode(
    worldRootId,
    'SpringLanding',
    'LANDING',
    vec3(430, 130, 0),
    128,
    38,
    16,
    color(229, 245, 255, 255),
    true,
    color(73, 108, 139, 180),
    color(205, 232, 255, 70),
    14,
  );

  const trapNode = addLabeledNode(
    worldRootId,
    'Trap-01',
    'TRAP',
    vec3(240, -20, 0),
    96,
    42,
    18,
    color(58, 27, 10, 255),
    true,
    color(223, 128, 69, 255),
    color(255, 217, 184, 120),
    14,
  );
  const trapSpawnId = addNode('TrapSpawn', trapNode.nodeId, vec3(56, 0, 0));
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
    intervalSeconds: 1.2,
    directionX: 1,
    directionY: 0,
    autoStart: true,
  });

  const patrolPointAId = addNode('PatrolPointA', worldRootId, vec3(520, 70, 0));
  const patrolPointBId = addNode('PatrolPointB', worldRootId, vec3(700, 70, 0));
  const enemyNode = addLabeledNode(
    worldRootId,
    'EnemyA',
    'ENEMY',
    vec3(610, 70, 0),
    100,
    48,
    20,
    color(255, 242, 239, 255),
    true,
    color(145, 63, 73, 255),
    color(255, 206, 211, 120),
    14,
  );
  addComponent(enemyNode.nodeId, 'cc.RigidBody2D', {
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
  addComponent(enemyNode.nodeId, 'cc.BoxCollider2D', {
    editing: false,
    tag: 0,
    _group: 1,
    _density: 1,
    _sensor: true,
    _friction: 0.2,
    _restitution: 0,
    _offset: vec2(),
    _size: size(88, 36),
  });
  const enemyHealthId = addComponent(enemyNode.nodeId, types['assets/scripts/combat/HealthComponent.ts'], {
    maxHealth: 2,
    invulnerableSeconds: 0.2,
    destroyNodeOnDepleted: false,
    deactivateNodeOnDepleted: true,
  });
  addComponent(enemyNode.nodeId, types['assets/scripts/enemy/EnemyAI.ts'], {
    initialState: 1,
    moveSpeed: 80,
    chaseDistance: 120,
    target: ref(playerNode.nodeId),
    patrolPoints: [ref(patrolPointAId), ref(patrolPointBId)],
  });
  addComponent(enemyNode.nodeId, types['assets/scripts/combat/DamageOnContact.ts'], {
    damage: 1,
    targetNameIncludes: 'Player',
    destroyAfterHit: false,
  });

  const flowerPickup = addLabeledNode(
    worldRootId,
    'EchoPickup-Flower',
    'UNLOCK FLOWER',
    vec3(-320, 184, 0),
    174,
    42,
    18,
    color(235, 255, 235, 255),
    true,
    color(66, 128, 80, 255),
    color(203, 255, 215, 100),
    14,
  );
  addComponent(flowerPickup.nodeId, 'cc.BoxCollider2D', {
    editing: false,
    tag: 0,
    _group: 1,
    _density: 1,
    _sensor: true,
    _friction: 0.2,
    _restitution: 0,
    _offset: vec2(),
    _size: size(150, 36),
  });
  addComponent(flowerPickup.nodeId, types['assets/scripts/echo/EchoUnlockPickup.ts'], {
    echoManager: ref(echoManagerId),
    echoId: 1,
    playerNameIncludes: 'Player',
    selectAfterUnlock: true,
    destroyOnPickup: true,
  });

  const bombPickup = addLabeledNode(
    worldRootId,
    'EchoPickup-Bomb',
    'UNLOCK BOMB',
    vec3(500, 184, 0),
    164,
    42,
    18,
    color(255, 239, 236, 255),
    true,
    color(125, 62, 64, 255),
    color(255, 208, 198, 100),
    14,
  );
  addComponent(bombPickup.nodeId, 'cc.BoxCollider2D', {
    editing: false,
    tag: 0,
    _group: 1,
    _density: 1,
    _sensor: true,
    _friction: 0.2,
    _restitution: 0,
    _offset: vec2(),
    _size: size(144, 36),
  });
  addComponent(bombPickup.nodeId, types['assets/scripts/echo/EchoUnlockPickup.ts'], {
    echoManager: ref(echoManagerId),
    echoId: 2,
    playerNameIncludes: 'Player',
    selectAfterUnlock: true,
    destroyOnPickup: true,
  });

  const bombGateRootId = addNode('BombGateRoot', worldRootId, vec3(760, -10, 0));
  addComponent(bombGateRootId, 'cc.UITransform', {
    _priority: 0,
    _contentSize: size(180, 90),
    _anchorPoint: vec2(0.5, 0.5),
  });
  const bombWallClosed = addLabeledNode(
    bombGateRootId,
    'BombWall-Closed',
    'CRACKED WALL',
    vec3(0, 0, 0),
    180,
    46,
    18,
    color(255, 240, 237, 255),
    true,
    color(128, 70, 71, 255),
    color(255, 206, 196, 100),
    16,
  );
  const bombWallOpen = addLabeledNode(
    bombGateRootId,
    'BombWall-Open',
    'WALL OPEN',
    vec3(0, 0, 0),
    180,
    46,
    18,
    color(21, 43, 25, 255),
    false,
    color(114, 197, 138, 255),
    color(219, 255, 226, 100),
    16,
  );
  const bombReward = addLabeledNode(
    bombGateRootId,
    'BombReward',
    'BOMB PATH CLEAR',
    vec3(0, 46, 0),
    194,
    34,
    16,
    color(58, 45, 16, 255),
    false,
    color(245, 210, 121, 255),
    color(255, 244, 196, 100),
    12,
  );
  addComponent(bombGateRootId, types['assets/scripts/puzzle/BreakableTarget.ts'], {
    startsBroken: false,
    activateOnBroken: [ref(bombWallOpen.nodeId), ref(bombReward.nodeId)],
    deactivateOnBroken: [ref(bombWallClosed.nodeId)],
  });

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

  const attackButton = addLabeledNode(
    touchHudRootId,
    'TouchAttack',
    'ATTACK',
    vec3(350, -196, 0),
    118,
    70,
    22,
    color(31, 18, 12, 255),
    true,
    color(236, 159, 89, 245),
    color(255, 236, 212, 100),
    22,
  );
  addComponent(attackButton.nodeId, types['assets/scripts/input/TouchCommandButton.ts'], {
    player: ref(playerControllerId),
    command: 0,
    pressedScale: 0.92,
  });

  const placeButton = addLabeledNode(
    touchHudRootId,
    'TouchPlaceEcho',
    'SUMMON',
    vec3(224, -248, 0),
    124,
    66,
    20,
    color(18, 27, 16, 255),
    true,
    color(131, 207, 145, 245),
    color(226, 255, 225, 100),
    20,
  );
  addComponent(placeButton.nodeId, types['assets/scripts/input/TouchCommandButton.ts'], {
    player: ref(playerControllerId),
    command: 1,
    pressedScale: 0.92,
  });

  const respawnButton = addLabeledNode(
    touchHudRootId,
    'TouchRespawn',
    'RESET',
    vec3(390, -286, 0),
    94,
    46,
    16,
    color(255, 243, 240, 255),
    true,
    color(111, 69, 74, 225),
    color(255, 219, 208, 100),
    16,
  );
  addComponent(respawnButton.nodeId, types['assets/scripts/input/TouchCommandButton.ts'], {
    player: ref(playerControllerId),
    command: 2,
    pressedScale: 0.92,
  });

  const echoBoxButton = addLabeledNode(
    touchHudRootId,
    'TouchEchoBox',
    'BOX',
    vec3(182, -154, 0),
    82,
    42,
    16,
    color(35, 27, 17, 255),
    true,
    color(214, 176, 96, 255),
    color(255, 236, 186, 100),
    14,
  );
  addComponent(echoBoxButton.nodeId, types['assets/scripts/input/TouchCommandButton.ts'], {
    player: ref(playerControllerId),
    command: 3,
    pressedScale: 0.92,
  });

  const echoFlowerButton = addLabeledNode(
    touchHudRootId,
    'TouchEchoFlower',
    'FLOWER',
    vec3(282, -154, 0),
    94,
    42,
    16,
    color(236, 255, 235, 255),
    true,
    color(67, 146, 88, 255),
    color(213, 255, 209, 100),
    14,
  );
  addComponent(echoFlowerButton.nodeId, types['assets/scripts/input/TouchCommandButton.ts'], {
    player: ref(playerControllerId),
    command: 4,
    pressedScale: 0.92,
  });

  const echoBombButton = addLabeledNode(
    touchHudRootId,
    'TouchEchoBomb',
    'BOMB',
    vec3(388, -154, 0),
    88,
    42,
    16,
    color(255, 241, 238, 255),
    true,
    color(156, 68, 66, 255),
    color(255, 209, 200, 100),
    14,
  );
  addComponent(echoBombButton.nodeId, types['assets/scripts/input/TouchCommandButton.ts'], {
    player: ref(playerControllerId),
    command: 5,
    pressedScale: 0.92,
  });

  const gameManagerId = addComponent(persistentRootId, types['assets/scripts/core/GameManager.ts'], {
    playerRoot: ref(playerNode.nodeId),
    persistOnLoad: false,
  });
  const saveSystemId = addComponent(persistentRootId, types['assets/scripts/core/SaveSystem.ts'], {
    storageKey: 'wisdom-mvp-save',
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

  addComponent(worldRootId, types['assets/scripts/puzzle/RoomResetController.ts'], {
    resetNodes: [
      ref(enemyNode.nodeId),
      ref(flowerPickup.nodeId),
      ref(bombPickup.nodeId),
      ref(gateClosedNode.nodeId),
      ref(gateOpenNode.nodeId),
      ref(bombWallClosed.nodeId),
      ref(bombWallOpen.nodeId),
      ref(bombReward.nodeId),
    ],
    echoManager: ref(echoManagerId),
  });

  addComponent(debugHudNode.nodeId, types['assets/scripts/ui/DebugHud.ts'], {
    label: ref(debugHudNode.labelId),
    playerHealth: ref(playerHealthId),
    echoManager: ref(echoManagerId),
    showControls: true,
  });

  await writeJson(scenePath, items);
  await writeJson(`${scenePath}.meta`, sceneMeta);
}

async function main() {
  const scriptIds = await ensureScriptMetas();
  const prefabIds = await generatePrefabs(scriptIds);
  await generateScene(scriptIds, prefabIds);
  console.log('Generated scene and prefabs: MechanicsLab');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
