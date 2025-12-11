let counter = 0;

export default function sId(el) {
  const base = el.getAttribute("s-id") || "s-id";
  if (!el.id) el.id = `${base}-${++counter}`;
}
