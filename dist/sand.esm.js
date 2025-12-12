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

function sFor() {
  // keep your existing implementation
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
// Alpine-like renderer for sandi-js supporting both s-* and x-* prefixes.


/* ------- prefix helpers (support s- and x-) ------- */
const PREFIXES = ["s-", "x-"];

function hasAttrEither(el, name) {
  for (const p of PREFIXES) if (el.hasAttribute(p + name)) return true;
  return false;
}

function getAttrEither(el, name) {
  for (const p of PREFIXES) {
    const v = el.getAttribute(p + name);
    if (v !== null && v !== undefined) return v;
  }
  return null;
}

function removeAttrEither(el, name) {
  for (const p of PREFIXES) el.removeAttribute(p + name);
}

/* ------------------ Scheduler (microtask-batched) ------------------ */
const Scheduler = (function () {
  let queue = [];
  let flushing = false;

  function schedule(job) {
    if (typeof job !== "function") return;
    queue.push(job);
    if (!flushing) {
      flushing = true;
      Promise.resolve().then(flush).catch(err => {
        flushing = false;
        queue = [];
        console.error("[sandi-js] Scheduler error:", err);
      });
    }
  }

  function flush() {
    try {
      const jobs = queue.slice();
      queue = [];
      for (let i = 0; i < jobs.length; i++) {
        try { jobs[i](); } catch (err) {
          console.error("[sandi-js] job error:", err);
        }
      }
    } finally {
      flushing = false;
    }
  }

  return { schedule };
})();

/* ------------------ Mounting / component lifecycle ------------------ */

/**
 * mount(root = document.body)
 * Finds all elements with s-data/x-data, creates reactive scopes,
 * and schedules renders.
 */
function mount(root = document.body) {
  if (!root || typeof root.querySelectorAll !== "function") return;

  const selector = PREFIXES.map(p => `[${p}data]`).join(",");
  const roots = root.querySelectorAll(selector);

  roots.forEach(node => {
    // read data expression (s-data or x-data)
    const expr = getAttrEither(node, "data") || "{}";
    const initial = safeEval(expr, {}) || {};

    const scope = createReactive(initial);
    const ctx = scope.proxy;

    // helpers available inside expressions
    ctx.$refs = ctx.$refs || {};
    ctx.$modelable = ctx.$modelable || {};
    ctx.__effect = fn => scope.effect(fn);

    // run component-level init once (s-init / x-init)
    const initExp = getAttrEither(node, "init");
    if (initExp) {
      try { safeEval(initExp, ctx); } catch (err) { console.warn("[sandi-js] s-init error", err); }
    }

    // schedule render when reactive deps change (batched)
    scope.effect(() => {
      // sync shallow properties into ctx so directives can read them
      Object.keys(scope.proxy).forEach(k => {
        try { ctx[k] = scope.proxy[k]; } catch (e) {}
      });

      // schedule the component render (microtask)
      Scheduler.schedule(() => renderComponent(node, ctx));
    });

    // Remove data attribute to avoid duplicate mounts in some environments
    removeAttrEither(node, "data");

    // remove cloak for this component immediately after mount
    node.querySelectorAll("[s-cloak],[x-cloak]").forEach(n => n.removeAttribute("s-cloak"));
    if (node.hasAttribute("s-cloak")) node.removeAttribute("s-cloak");
    if (node.hasAttribute("x-cloak")) node.removeAttribute("x-cloak");
  });
}

/* ------------------ Rendering logic ------------------ */

/**
 * renderComponent(rootEl, ctx)
 * Walks the component subtree and applies directives.
 * Structural directives (s-if, s-for) may modify DOM; after s-if we skip children if detached.
 */
function renderComponent(rootEl, ctx) {
  if (!rootEl) return;
  walk(rootEl, (node) => {
    // only element nodes should be processed for directives (nodeType === 1)
    if (node.nodeType !== 1) return;

    // s-ignore / x-ignore: skip subtree
    try {
      if (hasAttrEither(node, "ignore")) return true;
    } catch (err) { /* defensive */ }

    // basic non-destructive directives
    if (hasAttrEither(node, "ref")) {
      try { sRef && sRef(node, ctx); } catch (e) { console.warn("[sandi-js] s-ref", e); }
    }

    if (hasAttrEither(node, "id")) {
      try { sId && sId(node, ctx); } catch (e) { console.warn("[sandi-js] s-id", e); }
    }

    if (hasAttrEither(node, "cloak")) {
      try { sCloak && sCloak(node, ctx); } catch (e) { /* ignore */ }
    }

    if (hasAttrEither(node, "text")) {
      try { sText && sText(node, ctx); } catch (e) { console.warn("[sandi-js] s-text", e); }
    }

    if (hasAttrEither(node, "html")) {
      try { sHtml && sHtml(node, ctx); } catch (e) { console.warn("[sandi-js] s-html", e); }
    }

    if (hasAttrEither(node, "show")) {
      try { sShow && sShow(node, ctx); } catch (e) { console.warn("[sandi-js] s-show", e); }
    }

    if (hasAttrEither(node, "bind")) {
      try { sBind && sBind(node, ctx); } catch (e) { console.warn("[sandi-js] s-bind", e); }
    }

    // structural directive s-if/x-if — may remove node from DOM
    if (hasAttrEither(node, "if")) {
      try { sIf && sIf(node, ctx); } catch (e) { console.warn("[sandi-js] s-if", e); }
      // if node was removed, skip its children
      if (!node.isConnected) return true;
    }

    // s-for/x-for — delegated to directive if implemented (may mutate children)
    if (hasAttrEither(node, "for")) {
      if (sFor) {
        try { sFor(node, ctx); } catch (e) { console.warn("[sandi-js] s-for", e); }
        if (!node.isConnected) return true;
      }
    }

    // s-model/x-model (two-way)
    if (hasAttrEither(node, "model")) {
      try { sModel && sModel(node, ctx); } catch (e) { console.warn("[sandi-js] s-model", e); }
    }

    // s-modelable/x-modelable
    if (hasAttrEither(node, "modelable")) {
      try { sModelable && sModelable(node, ctx); } catch (e) { console.warn("[sandi-js] s-modelable", e); }
    }

    // s-effect/x-effect (register reactive effect)
    if (hasAttrEither(node, "effect")) {
      try { sEffect && sEffect(node, ctx); } catch (e) { console.warn("[sandi-js] s-effect", e); }
    }

    // s-teleport/x-teleport (move element)
    if (hasAttrEither(node, "teleport")) {
      try { sTeleport && sTeleport(node, ctx); } catch (e) { console.warn("[sandi-js] s-teleport", e); }
      if (!node.isConnected) return true;
    }

    // s-transition/x-transition (apply transition)
    if (hasAttrEither(node, "transition")) {
      try { sTransition && sTransition(node, ctx); } catch (e) { console.warn("[sandi-js] s-transition", e); }
    }

    // s-init / x-init on nested elements (run once)
    if (hasAttrEither(node, "init")) {
      try { sInit && sInit(node, ctx); } catch (e) { console.warn("[sandi-js] s-init (nested)", e); }
    }

    // event shorthand: @click or s-on:click / x-on:click
    const attrs = node.attributes || [];
    for (let i = 0; i < attrs.length; i++) {
      const a = attrs[i];
      if (!a) continue;
      const name = a.name;
      if (name.startsWith("@") || name.startsWith("s-on:") || name.startsWith("x-on:")) {
        try { sOn && sOn(node, ctx, name); } catch (e) { console.warn("[sandi-js] s-on", e); }
      }
    }

    // continue walking children (default)
    return; // undefined
  });
}

/* ------------------ DOM walker ------------------ */
/**
 * walk(root, fn)
 * Depth-first traversal. If fn returns true for a node, skip its children.
 */
function walk(root, fn) {
  const skip = fn(root);
  if (skip === true) return;
  const children = Array.from(root.childNodes || []);
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.nodeType === 1) {
      walk(child, fn);
    } else {
      // still call fn for non-element nodes so directives can operate on text if needed
      try { fn(child); } catch (e) {}
    }
  }
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
