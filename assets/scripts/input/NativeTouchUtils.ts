import { Node, UITransform, Vec2, view } from 'cc';

export interface NativeTouchLike {
  identifier?: number;
  clientX?: number;
  clientY?: number;
  pageX?: number;
  pageY?: number;
}

export interface NativeTouchEventLike {
  changedTouches?: NativeTouchLike[];
  touches?: NativeTouchLike[];
}

export interface NativeMouseEventLike {
  identifier?: number;
  clientX?: number;
  clientY?: number;
  pageX?: number;
  pageY?: number;
  x?: number;
  y?: number;
  button?: number;
}

export interface WechatTouchApi {
  onTouchStart?: (handler: (event: NativeTouchEventLike) => void) => void;
  onTouchMove?: (handler: (event: NativeTouchEventLike) => void) => void;
  onTouchEnd?: (handler: (event: NativeTouchEventLike) => void) => void;
  onTouchCancel?: (handler: (event: NativeTouchEventLike) => void) => void;
  onMouseDown?: (handler: (event: NativeMouseEventLike) => void) => void;
  onMouseMove?: (handler: (event: NativeMouseEventLike) => void) => void;
  onMouseUp?: (handler: (event: NativeMouseEventLike) => void) => void;
  offTouchStart?: (handler: (event: NativeTouchEventLike) => void) => void;
  offTouchMove?: (handler: (event: NativeTouchEventLike) => void) => void;
  offTouchEnd?: (handler: (event: NativeTouchEventLike) => void) => void;
  offTouchCancel?: (handler: (event: NativeTouchEventLike) => void) => void;
  offMouseDown?: (handler: (event: NativeMouseEventLike) => void) => void;
  offMouseMove?: (handler: (event: NativeMouseEventLike) => void) => void;
  offMouseUp?: (handler: (event: NativeMouseEventLike) => void) => void;
  getSystemInfoSync?: () => {
    pixelRatio?: number;
    windowHeight?: number;
  };
}

export type NativeTouchEventType = 'start' | 'move' | 'end' | 'cancel';
type NativeTouchHandler = (event: NativeTouchEventLike) => void;

const nativeTouchHandlers: Record<NativeTouchEventType, Set<NativeTouchHandler>> = {
  start: new Set(),
  move: new Set(),
  end: new Set(),
  cancel: new Set(),
};

export function getWechatTouchApi(): WechatTouchApi | null {
  const candidate = (globalThis as { wx?: WechatTouchApi }).wx;
  const hasTouchApi = Boolean(candidate?.onTouchStart || candidate?.onTouchEnd);
  const hasMouseApi = Boolean(candidate?.onMouseDown || candidate?.onMouseUp);
  if (!candidate || (!hasTouchApi && !hasMouseApi)) {
    return null;
  }

  return {
    onTouchStart: (handler) => {
      nativeTouchHandlers.start.add(handler);
      candidate.onTouchStart?.(handler);
    },
    onTouchMove: (handler) => {
      nativeTouchHandlers.move.add(handler);
      candidate.onTouchMove?.(handler);
    },
    onTouchEnd: (handler) => {
      nativeTouchHandlers.end.add(handler);
      candidate.onTouchEnd?.(handler);
    },
    onTouchCancel: (handler) => {
      nativeTouchHandlers.cancel.add(handler);
      candidate.onTouchCancel?.(handler);
    },
    onMouseDown: candidate.onMouseDown ? (handler) => candidate.onMouseDown?.(handler) : undefined,
    onMouseMove: candidate.onMouseMove ? (handler) => candidate.onMouseMove?.(handler) : undefined,
    onMouseUp: candidate.onMouseUp ? (handler) => candidate.onMouseUp?.(handler) : undefined,
    offTouchStart: (handler) => {
      nativeTouchHandlers.start.delete(handler);
      candidate.offTouchStart?.(handler);
    },
    offTouchMove: (handler) => {
      nativeTouchHandlers.move.delete(handler);
      candidate.offTouchMove?.(handler);
    },
    offTouchEnd: (handler) => {
      nativeTouchHandlers.end.delete(handler);
      candidate.offTouchEnd?.(handler);
    },
    offTouchCancel: (handler) => {
      nativeTouchHandlers.cancel.delete(handler);
      candidate.offTouchCancel?.(handler);
    },
    offMouseDown: candidate.offMouseDown ? (handler) => candidate.offMouseDown?.(handler) : undefined,
    offMouseMove: candidate.offMouseMove ? (handler) => candidate.offMouseMove?.(handler) : undefined,
    offMouseUp: candidate.offMouseUp ? (handler) => candidate.offMouseUp?.(handler) : undefined,
    getSystemInfoSync: candidate.getSystemInfoSync,
  };
}

export function getNativeTouchId(touch: NativeTouchLike, fallbackId = 0): number {
  return Number.isFinite(touch.identifier) ? Number(touch.identifier) : fallbackId;
}

export function getNativeChangedTouches(event: NativeTouchEventLike): NativeTouchLike[] {
  if (Array.isArray(event.changedTouches)) {
    return event.changedTouches;
  }

  return Array.isArray(event.touches) ? event.touches : [];
}

export function hasNativeTouchId(event: NativeTouchEventLike, touchId: number | null): boolean {
  if (touchId === null) {
    return false;
  }

  return getNativeChangedTouches(event).some((touch, index) => getNativeTouchId(touch, index) === touchId);
}

export function getNativeTouchUILocation(touch: NativeTouchLike, api: WechatTouchApi | null = getWechatTouchApi()): Vec2 {
  const systemInfo = api?.getSystemInfoSync?.();
  const devicePixelRatio = systemInfo?.pixelRatio ?? view.getDevicePixelRatio?.() ?? 1;
  const frameSize = view.getFrameSize();
  const windowHeightCss = systemInfo?.windowHeight ?? frameSize.height;
  const rawX = (touch.clientX ?? touch.pageX ?? 0) * devicePixelRatio;
  const rawY = windowHeightCss * devicePixelRatio - (touch.clientY ?? touch.pageY ?? 0) * devicePixelRatio;
  const viewport = view.getViewportRect();

  return new Vec2(
    (rawX - viewport.x) / view.getScaleX(),
    (rawY - viewport.y) / view.getScaleY(),
  );
}

export function nativeMouseToTouch(event: NativeMouseEventLike): NativeTouchLike {
  return {
    identifier: event.identifier ?? 0,
    clientX: event.clientX ?? event.x ?? event.pageX,
    clientY: event.clientY ?? event.y ?? event.pageY,
    pageX: event.pageX ?? event.clientX ?? event.x,
    pageY: event.pageY ?? event.clientY ?? event.y,
  };
}

export function getNativeMouseUILocation(event: NativeMouseEventLike, api: WechatTouchApi | null = getWechatTouchApi()): Vec2 {
  return getNativeTouchUILocation(nativeMouseToTouch(event), api);
}

export function isNativeTouchInsideNode(node: Node, touch: NativeTouchLike, api: WechatTouchApi | null = getWechatTouchApi()): boolean {
  const transform = node.getComponent(UITransform);
  if (!transform || !node.activeInHierarchy) {
    return false;
  }

  const location = getNativeTouchUILocation(touch, api);
  return transform.getBoundingBoxToWorld().contains(location);
}

export function isNativeMouseInsideNode(node: Node, event: NativeMouseEventLike, api: WechatTouchApi | null = getWechatTouchApi()): boolean {
  const transform = node.getComponent(UITransform);
  if (!transform || !node.activeInHierarchy) {
    return false;
  }

  const location = getNativeMouseUILocation(event, api);
  return transform.getBoundingBoxToWorld().contains(location);
}

export function dispatchNativeTouchForQa(type: NativeTouchEventType, event: NativeTouchEventLike): number {
  const handlers = Array.from(nativeTouchHandlers[type]);
  handlers.forEach((handler) => handler(event));
  return handlers.length;
}
