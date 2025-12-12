// safeEval + getPath/setPath + warn
function safeEval(expr, ctx = {}) {
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
function getPath(obj, path) {
  if (!path) return undefined;
  if (path.indexOf('.') === -1) return obj[path];
  return path.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}
function setPath(obj, path, value) {
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

function createReactive(obj) {
  const deps = new Map();
  const stack = [];

  function track(key) {
    const eff = stack[stack.length - 1];
    if (!eff) return;
    let s = deps.get(key);
    if (!s) { s = new Set(); deps.set(key, s); }
    s.add(eff);
  }

  function trigger(key) {
    const s = deps.get(key);
    if (!s) return;
    s.forEach(fn => fn());
  }

  const handler = {
    get(target, key) {
      if (key === "__isProxy") return true;
      track(key);
      const val = Reflect.get(target, key);
      return (val && typeof val === "object") ? createReactive(val).proxy : val;
    },
    set(target, key, value) {
      const old = target[key];
      const ok = Reflect.set(target, key, value);
      if (old !== value) trigger(key);
      return ok;
    }
  };

  const proxy = new Proxy(Object.assign({}, obj || {}), handler);

  function effect(fn) {
    const wrapped = function () {
      try { stack.push(wrapped); fn(); } finally { stack.pop(); }
    };
    wrapped(); // run initial
    return wrapped;
  }

  return { proxy, effect };
}

function sInit(el, ctx) {
  const exp = el.getAttribute("s-init") ?? el.getAttribute("x-init");
  if (!exp) return;
  if (el._s_inited) return;
  el._s_inited = true;
  safeEval(exp, ctx);
}

function sText(el, ctx) {
  const exp = el.getAttribute("s-text") ?? el.getAttribute("x-text");
  if (exp == null) return;
  el.textContent = safeEval(exp, ctx) ?? "";
}

function sHtml(el, ctx) {
  const exp = el.getAttribute("s-html") ?? el.getAttribute("x-html");
  if (exp == null) return;
  el.innerHTML = safeEval(exp, ctx) ?? "";
}

function sEffect(el, ctx) {
  const expr = el.getAttribute("s-effect") ?? el.getAttribute("x-effect");
  if (!expr) return;
  if (!ctx || typeof ctx.__effect !== "function") return;
  if (el._s_effect_registered) return;
  ctx.__effect(() => {
    try { safeEval(expr, ctx); } catch (e) { console.warn('[sandi-js] s-effect error', e); }
  });
  el._s_effect_registered = true;
}

function sRef(el, ctx) {
  const name = el.getAttribute("s-ref") ?? el.getAttribute("x-ref");
  if (!name || !ctx) return;
  ctx.$refs = ctx.$refs || {};
  ctx.$refs[name] = el;
}

function sCloak(el) {
  if (el && el.hasAttribute && el.hasAttribute("s-cloak")) el.removeAttribute("s-cloak");
  if (el && el.hasAttribute && el.hasAttribute("x-cloak")) el.removeAttribute("x-cloak");
}

function sModel(el, ctx) {
  const key = el.getAttribute("s-model") ?? el.getAttribute("x-model");
  if (!key) return;
  const current = getPath(ctx, key);
  if (current !== undefined && el.value !== String(current)) el.value = current;
  if (!el._s_model_bound) {
    el.addEventListener("input", () => {
      try { setPath(ctx, key, el.value); } catch (err) { console.warn('[sandi-js] s-model set error', err); }
    });
    el._s_model_bound = true;
  }
}

function sModelable(el, ctx) {
  const pk = el.getAttribute("s-modelable") ?? el.getAttribute("x-modelable");
  if (!pk) return;
  ctx.$modelable = ctx.$modelable || {};
  ctx.$modelable[pk] = ctx.$modelable[pk] || [];
  ctx.$modelable[pk].push(el);
}

function sIf(el, ctx) {
  const exp = el.getAttribute("s-if") ?? el.getAttribute("x-if");
  if (!el._s_if_placeholder) el._s_if_placeholder = document.createComment("s-if");
  let show = false;
  try { show = safeEval(exp, ctx); } catch (e) { show = false; }
  if (show) {
    const ph = el._s_if_placeholder;
    if (ph && ph.parentNode && !el.isConnected) ph.parentNode.replaceChild(el, ph);
  } else {
    if (el.isConnected) {
      const ph = el._s_if_placeholder;
      el.parentNode && el.parentNode.replaceChild(ph, el);
    } else if (!el._s_if_placeholder.parentNode && el.parentNode) {
      el.parentNode.insertBefore(el._s_if_placeholder, el);
    }
  }
}

function sShow(el, ctx) {
  const exp = el.getAttribute("s-show") ?? el.getAttribute("x-show");
  if (exp == null) return;
  const v = safeEval(exp, ctx);
  el.style.display = v ? "" : "none";
}

function sBind(el, ctx) {
  const raw = el.getAttribute("s-bind") ?? el.getAttribute("x-bind");
  if (!raw) return;
  raw.split(",").map(r => r.trim()).filter(Boolean).forEach(pair => {
    const parts = pair.split(":");
    if (parts.length < 2) return;
    const prop = parts.shift().trim();
    const expr = parts.join(":").trim();
    const val = safeEval(expr, ctx);
    try { el[prop] = val; } catch { el.setAttribute(prop, val); }
  });
}

function sFor(el, ctx) {
  // only handle <template s-for="item in list"> usage
  if (el.tagName !== "TEMPLATE") return;
  const exp = el.getAttribute("s-for") ?? el.getAttribute("x-for");
  if (!exp) return;

  const match = exp.match(/^\s*(?:\(([^)]+)\)|([^ ]+))\s+in\s+(.+)$/);
  if (!match) return;
  const itemName = (match[1] || match[2]).split(',')[0].trim();
  const listExpr = match[3].trim();
  const parent = el.parentNode;
  if (!parent) return;

  // marker & cleanup
  if (!el._marker) { el._marker = document.createComment("s-for"); parent.insertBefore(el._marker, el); }
  if (!el._prev) el._prev = [];

  // evaluate list
  let list = [];
  try { list = safeEval(listExpr, ctx) || []; } catch (e) { list = []; }

  // remove previous nodes
  (el._prev || []).forEach(n => n.parentNode && n.parentNode.removeChild(n));
  el._prev = [];

  // render each item
  list.forEach((item, idx) => {
    const clone = el.content.cloneNode(true);
    // attach a temporary ctx for this clone
    const childCtx = Object.create(ctx);
    childCtx[itemName] = item;
    childCtx.$index = idx;
    // insert clone before marker
    parent.insertBefore(clone, el._marker);
    // record nodes inserted between previous sibling and marker
    // simple approach: collect the last N child nodes inserted (where N is the number of top-level nodes in the clone)
    const topCount = el.content.childNodes.length;
    const inserted = [];
    let cur = el._marker.previousSibling;
    for (let k = 0; k < topCount && cur; k++) {
      inserted.push(cur);
      cur = cur.previousSibling;
    }
    inserted.reverse().forEach(n => el._prev.push(n));
    // let the main renderer pick up directives on these newly inserted nodes in the next tick
  });
}

function sOn(el, ctx, attrName) {
  if (!attrName) return;
  let event;
  if (attrName.startsWith("@")) event = attrName.slice(1);
  else if (attrName.startsWith("s-on:") || attrName.startsWith("x-on:")) event = attrName.slice(5);
  else return;
  const code = el.getAttribute(attrName);
  if (!code) return;
  const mark = `_s_on_${event}`;
  if (el[mark]) return;
  el.addEventListener(event, e => {
    try { safeEval(code, Object.assign(Object.create(ctx), { $event: e })); } catch (err) { console.warn('[sandi-js] s-on handler error', err); }
  });
  el[mark] = true;
}

function sTransition(el) {
  const val = el.getAttribute("s-transition") ?? el.getAttribute("x-transition") ?? "all 150ms ease";
  el.style.transition = val;
}

function sTeleport(el) {
  const sel = el.getAttribute("s-teleport") ?? el.getAttribute("x-teleport");
  if (!sel) return;
  if (!el._ph) el._ph = document.createComment("s-teleport");
  const target = document.querySelector(sel);
  if (!target) return;
  if (!el._teleported) {
    el.parentNode && el.parentNode.insertBefore(el._ph, el);
    target.appendChild(el);
    el._teleported = true;
  }
}

let counter = 0;
function sId(el) {
  const base = el.getAttribute("s-id") ?? el.getAttribute("x-id") ?? "s-id";
  if (!el.id) el.id = `${base}-${++counter}`;
}

// src/compiler.js

/* support s- and x- prefixes */
const PREFIXES = ["s-", "x-"];
function hasAttr(el, name) { return PREFIXES.some(p => el.hasAttribute(p + name)); }
function getAttr(el, name) { for (const p of PREFIXES) { const v = el.getAttribute(p + name); if (v != null) return v; } return null; }
function removeAttr(el, name) { PREFIXES.forEach(p => el.removeAttribute(p + name)); }

/* microtask scheduler */
const Scheduler = (() => {
  let q = [], flushing = false;
  function schedule(fn) {
    if (typeof fn !== "function") return;
    q.push(fn);
    if (!flushing) {
      flushing = true;
      Promise.resolve().then(() => {
        const jobs = q.slice(); q = []; jobs.forEach(j => { try { j(); } catch (e) { console.error('[sandi-js] job error', e); } }); flushing = false;
      }).catch(err => { flushing = false; q = []; console.error('[sandi-js] scheduler error', err); });
    }
  }
  return { schedule };
})();

/* mount */
function mount(root = document.body) {
  if (!root || !root.querySelectorAll) return;
  const selector = PREFIXES.map(p => `[${p}data]`).join(",");
  const roots = root.querySelectorAll(selector);
  roots.forEach(node => {
    const expr = getAttr(node, "data") || "{}";
    const initial = safeEval(expr, {}) || {};
    const state = createReactive(initial);
    const ctx = state.proxy;

    ctx.$refs = ctx.$refs || {};
    ctx.$modelable = ctx.$modelable || {};
    ctx.__effect = fn => state.effect(fn);

    const initExp = getAttr(node, "init");
    if (initExp) try { safeEval(initExp, ctx); } catch (e) { console.warn('[sandi-js] s-init error', e); }

    state.effect(() => {
      Scheduler.schedule(() => render(node, ctx));
    });

    removeAttr(node, "data");

    node.querySelectorAll("[s-cloak],[x-cloak]").forEach(n => n.removeAttribute("s-cloak"));
    if (node.hasAttribute("s-cloak")) node.removeAttribute("s-cloak");
    if (node.hasAttribute("x-cloak")) node.removeAttribute("x-cloak");
  });
}

/* render: walk tree and apply directives */
function render(root, ctx) {
  walk(root, node => {
    if (node.nodeType !== 1) return;
    try { if (hasAttr(node, "ignore")) return true; } catch (e) {}
    if (hasAttr(node, "ref")) try { sRef && sRef(node, ctx); } catch (e) {}
    if (hasAttr(node, "id")) try { sId && sId(node, ctx); } catch (e) {}
    if (hasAttr(node, "cloak")) try { sCloak && sCloak(node, ctx); } catch (e) {}
    if (hasAttr(node, "text")) try { sText && sText(node, ctx); } catch (e) {}
    if (hasAttr(node, "html")) try { sHtml && sHtml(node, ctx); } catch (e) {}
    if (hasAttr(node, "show")) try { sShow && sShow(node, ctx); } catch (e) {}
    if (hasAttr(node, "bind")) try { sBind && sBind(node, ctx); } catch (e) {}
    if (hasAttr(node, "if")) { try { sIf && sIf(node, ctx); } catch (e) {} if (!node.isConnected) return true; }
    if (hasAttr(node, "for")) { try { sFor && sFor(node, ctx); } catch (e) {} if (!node.isConnected) return true; }
    if (hasAttr(node, "model")) try { sModel && sModel(node, ctx); } catch (e) {}
    if (hasAttr(node, "modelable")) try { sModelable && sModelable(node, ctx); } catch (e) {}
    if (hasAttr(node, "effect")) try { sEffect && sEffect(node, ctx); } catch (e) {}
    if (hasAttr(node, "teleport")) { try { sTeleport && sTeleport(node, ctx); } catch (e) {} if (!node.isConnected) return true; }
    if (hasAttr(node, "transition")) try { sTransition && sTransition(node, ctx); } catch (e) {}
    if (hasAttr(node, "init")) try { sInit && sInit(node, ctx); } catch (e) {}

    // events
    const attrs = node.attributes || [];
    for (let i = 0; i < attrs.length; i++) {
      const a = attrs[i]; if (!a) continue;
      const name = a.name;
      if (name.startsWith("@") || name.startsWith("s-on:") || name.startsWith("x-on:")) {
        try { sOn && sOn(node, ctx, name); } catch (e) { console.warn('[sandi-js] s-on', e); }
      }
    }

    return;
  });
}

/* walk */
function walk(node, fn) {
  const skip = fn(node);
  if (skip === true) return;
  const children = Array.from(node.childNodes || []);
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    if (c.nodeType === 1) walk(c, fn);
    else try { fn(c); } catch (e) {}
  }
}

// auto-mount on DOM ready
if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => mount());
  } else {
    mount();
  }
}
var index = { mount };

export { index as default, mount };
