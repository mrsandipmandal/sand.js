import { createReactive } from '../src/reactivity.js';
const r = createReactive({count:0});
let seen;
r.effect(()=>{ seen = r.proxy.count; });
r.proxy.count = 5;
console.assert(seen === 5, 'reactivity failed');
