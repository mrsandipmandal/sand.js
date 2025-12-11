// event shorthand handled by runtime
import { safeEval } from "../utils.js";

export default function sOn(el, ctx, attrName) {
  let event = attrName.startsWith("@")
    ? attrName.slice(1)
    : attrName.slice(5);

  const exp = el.getAttribute(attrName);
  const mark = `_s_on_${event}`;

  if (!el[mark]) {
    el.addEventListener(event, e =>
      safeEval(exp, Object.assign({}, ctx, { $event: e }))
    );
    el[mark] = true;
  }
}
