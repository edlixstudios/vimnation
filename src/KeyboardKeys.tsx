import { Fragment } from "react";
import { keyParts, parseKeyNotation, splitKeyText } from "./keys";

export function KeyboardKey({ value }: { value: string }) {
  const parts = keyParts(value);
  return (
    <span
      className="key-chord"
      role="group"
      aria-label={
        parts.length > 1 ? `${parts.join(" + ")} gleichzeitig` : parts[0]
      }
    >
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <span className="key-plus" aria-hidden="true">
              +
            </span>
          )}
          <kbd
            className={`keycap ${part === "Space" ? "keycap-wide" : ""}`}
            aria-hidden="true"
          >
            {part === "Space" && <span className="key-symbol">␣</span>}
            {part === "Esc" && <span className="key-symbol">⎋</span>}
            {part === "Enter" && <span className="key-symbol">↵</span>}
            {part}
          </kbd>
        </Fragment>
      ))}
    </span>
  );
}

export function KeySequence({
  keys,
  inline = false,
}: {
  keys: string[];
  inline?: boolean;
}) {
  return (
    <span
      className={`key-sequence ${inline ? "inline-keys" : ""}`}
      role="group"
      aria-label={`Tastenfolge: ${keys.map((k) => keyParts(k).join(" + ")).join(", dann ")}`}
    >
      {keys.map((key, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <span className="key-arrow" aria-hidden="true">
              →
            </span>
          )}
          <KeyboardKey value={key} />
        </Fragment>
      ))}
    </span>
  );
}

export function KeyText({ text }: { text: string }) {
  return (
    <span className="key-text">
      {splitKeyText(text).map((part, index) =>
        part.kind === "keys" ? (
          <KeySequence key={index} keys={parseKeyNotation(part.value)} inline />
        ) : (
          <Fragment key={index}>{part.value}</Fragment>
        ),
      )}
    </span>
  );
}
