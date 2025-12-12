export function createReactive(obj) {
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
