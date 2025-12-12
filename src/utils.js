// safeEval + getPath/setPath + warn
export function safeEval(expr, ctx = {}) {
  if (!expr) return undefined;
  const names = Object.keys(ctx || {});
  const vals = Object.values(ctx || {});
  try {
    const fn = new Function(...names, 'with(this){ return (' + expr + '); }');
    return fn.apply(ctx, vals);
  } catch (err) {
    console.warn('[sandi-js] safeEval error for expression:', expr, err);
    return undefined;
  }
}
export function getPath(obj, path) {
  if (!path) return undefined;
  if (path.indexOf('.') === -1) return obj[path];
  return path.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}
export function setPath(obj, path, value) {
  if (!path) return;
  if (path.indexOf('.') === -1) { obj[path] = value; return; }
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}
export function warn(...args) {
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') return;
  console.warn(...args);
}
