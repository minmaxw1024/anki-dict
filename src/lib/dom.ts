/**
 * Small DOM builder so UI code never parses HTML strings. Text is always
 * inserted as text nodes, so page or dictionary content can't inject markup
 * (and AMO's linter has no innerHTML assignments to flag).
 */

type Child = Node | string | number | null | undefined | false;
type AttrValue = string | number | boolean | null | undefined;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, AttrValue> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  for (const [name, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    element.setAttribute(name, value === true ? '' : String(value));
  }

  append(element, ...children);
  return element;
}

export function append(parent: Node, ...children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}
