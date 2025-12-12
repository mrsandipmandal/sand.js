function createReactive(obj){
  const deps = new Map();
  const stack = [];
  function track(k){ const eff = stack[stack.length-1]; if(!eff) return; let s = deps.get(k); if(!s){ s=new Set(); deps.set(k,s);} s.add(eff); }
  function trigger(k){ const s = deps.get(k); if(!s) return; s.forEach(fn=>fn()); }
  const handler = { get(t,k){ if(k==='__isProxy') return true; track(k); const r=Reflect.get(t,k); return (r&&typeof r==='object')?createReactive(r).proxy:r; }, set(t,k,v){ const old=t[k]; const ok=Reflect.set(t,k,v); if(old!==v) trigger(k); return ok } };
  const proxy = new Proxy(Object.assign({}, obj || {}), handler);
  function effect(fn){ const wrapped = function(){ try{ stack.push(wrapped); fn(); } finally { stack.pop(); } }; wrapped(); return wrapped; }
  return { proxy, effect };
}

// src/utils.js
function safeEval(expr, ctx = {}) {
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
function getPath(obj, path) {
  if (!path) return undefined;
  if (path.indexOf('.') === -1) return obj[path];
  return path.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), obj);
}

// set nested property by path 'a.b.c' — creates intermediate objects if needed
function setPath(obj, path, value) {
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

function sInit(el, ctx) {
  const exp = el.getAttribute("s-init");
  if (!exp) return;
  if (el._s_inited) return;
  el._s_inited = true;
  safeEval(exp, ctx);
}

function sText(el, ctx) {
  const exp = el.getAttribute("s-text");
  el.textContent = safeEval(exp, ctx) ?? "";
}

function sHtml(el, ctx) {
  const exp = el.getAttribute("s-html");
  const v = safeEval(exp, ctx);
  el.innerHTML = v == null ? "" : v;
}

// src/directives/s-effect.js

function sEffect(el, ctx) {
  const expr = el.getAttribute("s-effect");
  if (!expr) return;
  if (!ctx || typeof ctx.__effect !== "function") return;
  if (el._s_effect_registered) return;
  ctx.__effect(() => {
    try { safeEval(expr, ctx); } catch (e) { console.warn('[sandi-js] s-effect error', e); }
  });
  el._s_effect_registered = true;
}

// src/directives/s-ignore.js
function sIgnore(el) {
  try { return el && el.hasAttribute && el.hasAttribute("s-ignore"); } catch (e) { return false; }
}

function sRef(el, ctx) {
  const name = el.getAttribute("s-ref");
  if (!name || !ctx) return;
  ctx.$refs = ctx.$refs || {};
  ctx.$refs[name] = el;
}

function sCloak(el) {
  if (el && el.hasAttribute && el.hasAttribute("s-cloak")) el.removeAttribute("s-cloak");
}

// src/directives/s-model.js

function sModel(el, ctx) {
  const key = el.getAttribute("s-model");
  if (!key) return;

  // set initial DOM value from ctx
  try {
    const initial = getPath(ctx, key);
    if (initial !== undefined && el.value !== String(initial)) el.value = initial;
  } catch (e) { /* ignore */ }

  if (!el._s_model_bound) {
    el.addEventListener("input", () => {
      try {
        setPath(ctx, key, el.value);
      } catch (err) { console.warn('[sandi-js] s-model set error', err); }
    });
    el._s_model_bound = true;
  }
}

function sModelable(el, ctx) {
  const key = el.getAttribute("s-modelable");
  if (!key) return;

  ctx.$modelable[key] = el;
}

// src/directives/s-if.js

function sIf(el, ctx) {
  if (!el._s_if_placeholder) {
    el._s_if_placeholder = document.createComment("s-if");
  }

  let value;
  try {
    value = safeEval(el.getAttribute("s-if"), ctx);
  } catch (err) {
    value = false;
  }

  // If expression true -> ensure element is in DOM (replace placeholder if present)
  if (value) {
    const ph = el._s_if_placeholder;
    if (ph && ph.parentNode && !el.isConnected) {
      ph.parentNode.replaceChild(el, ph);
    }
    // If neither placeholder nor element is in DOM, do nothing (likely initial)
  } else {
    // hide element: replace with placeholder if element currently attached
    if (el.isConnected) {
      const ph = el._s_if_placeholder;
      el.parentNode && el.parentNode.replaceChild(ph, el);
    } else {
      // If element not connected and placeholder not in DOM, insert placeholder where element would be
      if (!el._s_if_placeholder.parentNode && el.parentNode) {
        el.parentNode.insertBefore(el._s_if_placeholder, el);
      }
    }
  }
}

function sShow(el, ctx) {
  const exp = el.getAttribute("s-show");
  const v = safeEval(exp, ctx);
  el.style.display = v ? "" : "none";
}

// src/directives/s-bind.js

function sBind(el, ctx) {
  const raw = el.getAttribute("s-bind");
  if (!raw) return;
  const items = raw.split(",").map(str => str.trim()).filter(Boolean);

  items.forEach(pair => {
    const parts = pair.split(":");
    if (parts.length < 2) return;
    const prop = parts.shift().trim();
    const exp = parts.join(":").trim();
    const val = safeEval(exp, ctx);
    try { el[prop] = val; } catch { el.setAttribute(prop, val); }
  });
}

// src/directives/s-on.js

function sOn(el, ctx, attrName) {
  if (!attrName) return;
  let event;
  if (attrName.startsWith("@")) event = attrName.slice(1);
  else if (attrName.startsWith("s-on:")) event = attrName.slice(5);
  else return;

  const code = el.getAttribute(attrName);
  if (!code) return;

  const mark = `_s_on_${event}`;
  if (el[mark]) return;

  el.addEventListener(event, e => {
    try {
      safeEval(code, Object.assign(Object.create(ctx), { $event: e }));
    } catch (err) {
      console.warn('[sandi-js] s-on handler error', err);
    }
  });
  el[mark] = true;
}

function sTransition(el) {
  const style = el.getAttribute("s-transition") || "all 150ms ease";
  el.style.transition = style;
}

// src/directives/s-teleport.js
function sTeleport(el) {
  const targetSel = el.getAttribute("s-teleport");
  if (!targetSel) return;

  // create placeholder if not exist
  if (!el._s_teleport_placeholder) el._s_teleport_placeholder = document.createComment("s-teleport");

  // find target
  const target = document.querySelector(targetSel);
  if (!target) return; // silently fail until target exists in DOM

  // if not already teleported, move
  if (!el._s_teleported) {
    if (el.parentNode && !el._s_teleport_placeholder.parentNode) {
      el.parentNode.insertBefore(el._s_teleport_placeholder, el);
    }
    target.appendChild(el);
    el._s_teleported = true;
  }
}

let counter = 0;
function sId(el) {
  const base = el.getAttribute("s-id") || "s-id";
  if (!el.id) el.id = `${base}-${++counter}`;
}

// src/compiler.js

function mount(root = document.body) {
  const components = root.querySelectorAll("[s-data]");
  components.forEach(el => {
    const initial = safeEval(el.getAttribute("s-data"), {}) || {};
    const state = createReactive(initial);
    const ctx = state.proxy;

    ctx.$refs = ctx.$refs || {};
    ctx.$modelable = ctx.$modelable || {};
    ctx.__effect = fn => state.effect(fn);

    // run root s-init if present
    if (el.hasAttribute("s-init")) {
      try { sInit(el, ctx); } catch (e) { console.warn('[sandi-js] s-init error', e); }
    }

    // reactive refresh
    state.effect(() => {
      // sync shallow values to ctx
      Object.keys(state.proxy).forEach(k => ctx[k] = state.proxy[k]);
      refresh(el, ctx);
    });

    // remove s-data attr and cloak for this component
    el.removeAttribute("s-data");
    el.querySelectorAll("[s-cloak]").forEach(n => n.removeAttribute("s-cloak"));
    if (el.hasAttribute("s-cloak")) el.removeAttribute("s-cloak");
  });
}

function refresh(root, ctx) {
  forEachNode(root, node => {
    if (node.nodeType !== 1) return;
    // s-ignore
    try { if (sIgnore(node)) return; } catch (e) {}
    // refs / id / cloak
    if (node.hasAttribute("s-ref")) sRef(node, ctx);
    if (node.hasAttribute("s-id")) sId(node);
    if (node.hasAttribute("s-cloak")) sCloak(node);

    // core rendering directives
    if (node.hasAttribute("s-text")) sText(node, ctx);
    if (node.hasAttribute("s-html")) sHtml(node, ctx);
    if (node.hasAttribute("s-show")) sShow(node, ctx);
    if (node.hasAttribute("s-bind")) sBind(node, ctx);
    if (node.hasAttribute("s-if")) sIf(node, ctx);
    if (node.hasAttribute("s-effect")) sEffect(node, ctx);
    if (node.hasAttribute("s-model")) sModel(node, ctx);
    if (node.hasAttribute("s-modelable")) sModelable(node, ctx);
    if (node.hasAttribute("s-teleport")) sTeleport(node);
    if (node.hasAttribute("s-transition")) sTransition(node);

    // event shorthand
    const attrs = node.attributes || [];
    for (let i = 0; i < attrs.length; i++) {
      const a = attrs[i];
      if (!a) continue;
      if (a.name.startsWith("@") || a.name.startsWith("s-on:")) {
        sOn(node, ctx, a.name);
      }
    }
  });
}

function forEachNode(root, fn) {
  fn(root);
  if (root.nodeType !== 1) return;
  try { if (sIgnore(root)) return; } catch (e) {}
  const children = Array.from(root.childNodes || []);
  for (let i = 0; i < children.length; i++) forEachNode(children[i], fn);
}

// Auto mount on DOM ready
if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => mount());
  } else {
    mount();
  }
}

var index = {
  mount,
  createReactive
};

export { createReactive, index as default, mount };
