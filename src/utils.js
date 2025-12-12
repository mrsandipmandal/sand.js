// src/utils.js
export function safeEval(expr, ctx = {}) {
  if (!expr) return undefined;
  const names = Object.keys(ctx || {});
  const vals = Object.values(ctx || {});
  try {
    // create a function where ctx keys are params, and evaluate inside a with(this) scope
    const fn = new Function(...names, 'with(this) { return (' + expr + '); }');
    return fn.apply(ctx, vals);
  } catch (e) {
    // swallow evaluation errors to avoid breaking the whole runtime
    console.warn('[sandi-js] safeEval error for expression:', expr, e);
    return undefined;
  }
}

// get nested property by path 'a.b.c'
export function getPath(obj, path) {
  if (!path) return undefined;
  if (path.indexOf('.') === -1) return obj[path];
  return path.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), obj);
}

// set nested property by path 'a.b.c' — creates intermediate objects if needed
export function setPath(obj, path, value) {
  if (!path) return;
  if (path.indexOf('.') === -1) { obj[path] = value; return; }
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur[p] == null) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

export function warn(...args) {
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') return;
  console.warn(...args);
}
