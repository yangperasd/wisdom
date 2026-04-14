export function matchesPressurePlateFilter(nodeName, allowedIncludes) {
  return !allowedIncludes || nodeName.includes(allowedIncludes);
}

export function computePressurePlateAfterContact(activeBodies, nodeUuid, isBegin, allowedIncludes, nodeName) {
  if (!matchesPressurePlateFilter(nodeName, allowedIncludes)) {
    return { activeBodies: new Set(activeBodies), isPressed: activeBodies.size > 0, changed: false };
  }
  const next = new Set(activeBodies);
  if (isBegin) next.add(nodeUuid);
  else next.delete(nodeUuid);
  return { activeBodies: next, isPressed: next.size > 0, changed: true };
}

export function computePressurePlateReset(startsPressed) {
  return { activeBodies: new Set(), isPressed: startsPressed };
}

export function computeNodeActivationState(isPressed, activateOnPressed, deactivateOnPressed) {
  return {
    activated: activateOnPressed.map(id => ({ id, active: isPressed })),
    deactivated: deactivateOnPressed.map(id => ({ id, active: !isPressed })),
  };
}
