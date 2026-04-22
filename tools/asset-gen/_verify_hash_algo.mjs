// Cocos 3.x script class hash from .ts meta uuid.
// Algorithm: first 5 hex chars verbatim, then 27 remaining hex chars re-encoded
// as 108 bits -> 18 base64-std chars.

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function ccScriptHashFromUuid(uuid) {
  const hex = uuid.replace(/-/g, '');
  if (hex.length !== 32) throw new Error('bad uuid');
  const prefix = hex.slice(0, 5);
  // Convert 27 hex chars -> bits
  const bits = [];
  for (const c of hex.slice(5)) {
    const v = parseInt(c, 16);
    bits.push((v >> 3) & 1, (v >> 2) & 1, (v >> 1) & 1, v & 1);
  }
  // 108 bits -> 18 base64 chars
  let out = prefix;
  for (let i = 0; i < bits.length; i += 6) {
    let v = 0;
    for (let b = 0; b < 6; b++) v = (v << 1) | bits[i + b];
    out += B64[v];
  }
  return out;
}

// Verify
const cases = [
  ['3d2a6ccc-b193-4c98-ae2e-68d0dad2bb36', '3d2a6zMsZNMmK4uaNDa0rs2'], // AssetBindingTag
  ['5a770061-c070-4d28-be61-5c08adba10fe', '5a770BhwHBNKL5hXAituhD+'], // SceneDressingSkin -- note trailing char varies
  ['4fefb512-a828-4d1f-8282-01ea4387e0dc', '4fefbUSqChNH4KCAepDh+Dc']  // CheckpointMarker
];
for (const [uuid, expected] of cases) {
  const got = ccScriptHashFromUuid(uuid);
  const ok = got === expected ? 'OK' : 'MISMATCH';
  console.log(`${ok}  ${uuid}`);
  console.log(`      got:      ${got}`);
  console.log(`      expected: ${expected}`);
}
