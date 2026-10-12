import { describe, it, expect } from "vitest";
import { keyParts, parseKeyNotation, splitKeyText } from "./keys";
describe("Explizite Tastennotation", () => {
  it("trennt Folgen, Kommandos und benannte Tasten", () => {
    expect(parseKeyNotation("Space c r")).toEqual(["Space", "c", "r"]);
    expect(parseKeyNotation('ci"')).toEqual(["c", "i", '"']);
    expect(parseKeyNotation(":w")).toEqual([":", "w", "Enter"]);
    expect(parseKeyNotation("Ctrl+r")).toEqual(["Ctrl+r"]);
  });
  it("zeigt Modifier gleichzeitig und erklärt Großbuchstaben", () => {
    expect(keyParts("A")).toEqual(["Shift", "A"]);
    expect(keyParts("a")).toEqual(["a"]);
    expect(keyParts("Control+r")).toEqual(["Ctrl", "R"]);
    expect(keyParts(" ")).toEqual(["Space"]);
    expect(keyParts("+")).toEqual(["+"]);
  });
  it("markiert nur ausdrücklich ausgezeichnete Keys", () => {
    expect(splitKeyText("Mit `i` schreiben und `Esc` zurück.")).toEqual([
      { kind: "text", value: "Mit " },
      { kind: "keys", value: "i" },
      { kind: "text", value: " schreiben und " },
      { kind: "keys", value: "Esc" },
      { kind: "text", value: " zurück." },
    ]);
    expect(splitKeyText("Hallo Vim")).toEqual([
      { kind: "text", value: "Hallo Vim" },
    ]);
  });
});
