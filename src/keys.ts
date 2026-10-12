const namedKeys = new Set([
  "Space",
  "Esc",
  "Escape",
  "Enter",
  "Tab",
  "Backspace",
  "Delete",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

/** Explicit key notation in course prose; regular prose is never inferred as a shortcut. */
export function parseKeyNotation(notation: string): string[] {
  const keys = notation
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((token) =>
      namedKeys.has(token) || /^(?:Ctrl|Control|Shift|Alt|Meta)\+/.test(token)
        ? [token]
        : Array.from(token),
    );
  if (notation.startsWith(":") && notation.length > 1) keys.push("Enter");
  return keys;
}

export function keyParts(key: string): string[] {
  if (key === " " || key === "Space") return ["Space"];
  if (key === "Escape") return ["Esc"];
  if (/^[A-Z]$/.test(key)) return ["Shift", key];
  if (!/^(?:Ctrl|Control|Shift|Alt|Meta)\+/.test(key)) return [key];
  const parts = key
    .split("+")
    .map((part) => (part === "Control" ? "Ctrl" : part));
  return parts.length > 1
    ? parts.map((part) => (/^[a-z]$/.test(part) ? part.toUpperCase() : part))
    : parts;
}

export function splitKeyText(
  text: string,
): Array<{ kind: "text" | "keys"; value: string }> {
  return text
    .split(/(`[^`]+`)/g)
    .filter(Boolean)
    .map((value) =>
      value.startsWith("`") && value.endsWith("`")
        ? { kind: "keys", value: value.slice(1, -1) }
        : { kind: "text", value },
    );
}
