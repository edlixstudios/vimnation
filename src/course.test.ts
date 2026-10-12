import { describe, it, expect } from "vitest";
import { lessons, isComplete, type Snapshot } from "./course";
import { loadProgress, saveProgress, defaultProgress } from "./progress";
import { matchingMappings, filterFiles, searchProject } from "./simulation";
const state: Snapshot = {
  text: "",
  cursor: 0,
  mode: "NORMAL",
  actions: [],
  changed: false,
};
describe("Aufgabenprüfung", () => {
  it("hat stabile, eindeutige IDs und alle acht Kapitel", () => {
    expect(new Set(lessons.map((l) => l.id)).size).toBe(lessons.length);
    expect(lessons.length).toBeGreaterThanOrEqual(32);
    expect(new Set(lessons.map((l) => l.chapter)).size).toBe(8);
  });
  for (const l of lessons) {
    it(`${l.id}: akzeptiert den Zielzustand und lehnt den Anfang ab`, () => {
      const g = l.goal,
        s = { ...state, text: l.initial, cursor: l.cursor };
      expect(isComplete(l, s)).toBe(false);
      const success = {
        ...s,
        text: g.kind === "text" ? g.value : l.initial,
        cursor: g.kind === "cursor" ? g.value : l.cursor,
        actions:
          g.kind === "actions"
            ? g.value
            : g.kind === "text" && g.action
              ? [g.action]
              : [],
      };
      expect(isComplete(l, success)).toBe(true);
      expect(isComplete(l, { ...success, mode: "INSERT" })).toBe(false);
      if (g.kind === "text")
        expect(isComplete(l, { ...success, text: success.text + "!" })).toBe(
          false,
        );
      if (g.kind === "cursor")
        expect(isComplete(l, { ...success, cursor: g.value + 1 })).toBe(false);
      if (g.kind === "actions")
        expect(isComplete(l, { ...success, actions: [] })).toBe(false);
    });
  }
  it("akzeptiert keine Mausbewegung bei veränderter Übungsdatei", () => {
    const l = lessons.find((l) => l.id === "words")!;
    expect(isComplete(l, { ...state, text: "unpassend", cursor: 14 })).toBe(
      false,
    );
  });
});
describe("Fortschritt", () => {
  it("übersteht fehlenden und defekten Speicher", () => {
    expect(
      loadProgress({
        getItem: () => {
          throw Error();
        },
      }),
    ).toEqual(defaultProgress);
    expect(loadProgress({ getItem: () => "{broken" })).toEqual(defaultProgress);
    expect(
      saveProgress(
        {
          setItem: () => {
            throw Error();
          },
        },
        defaultProgress,
      ),
    ).toBe(false);
  });
  it("validiert Version, IDs und Einstellungen", () => {
    expect(
      loadProgress({
        getItem: () =>
          JSON.stringify({
            version: 1,
            completed: ["modes", "modes", 42],
            lastLesson: "words",
            fontSize: 999,
          }),
      }),
    ).toEqual({
      ...defaultProgress,
      completed: ["modes"],
      lastLesson: "words",
    });
    expect(
      loadProgress({
        getItem: () => JSON.stringify({ version: 2, completed: [] }),
      }),
    ).toEqual(defaultProgress);
  });
  it("speichert und liest einen Fortschritt", () => {
    let value = "";
    const storage = {
      getItem: () => value,
      setItem: (_key: string, v: string) => {
        value = v;
      },
    };
    const p = {
      ...defaultProgress,
      completed: ["modes"],
      lastLesson: "append",
      fontSize: 18,
    };
    expect(saveProgress(storage, p)).toBe(true);
    expect(loadProgress(storage)).toEqual(p);
  });
});
describe("LazyVim-Simulationen", () => {
  it("sucht echte Projektinhalte und liefert keine Treffer für leere oder unbekannte Begriffe", () => {
    expect(searchProject("answer")).toEqual([
      "index.ts:2 · const answer = 42;",
      "index.ts:3 · console.log(answer);",
    ]);
    expect(searchProject("")).toEqual([]);
    expect(searchProject("unbekannt")).toEqual([]);
  });
  it("zeigt nur passende Leader-Fortsetzungen", () => {
    expect(matchingMappings("f").map(([k]) => k)).toEqual(["ff", "fc"]);
    expect(matchingMappings("unbekannt")).toEqual([]);
  });
  it("trennt Projektdateien, Buffer und Konfiguration", () => {
    expect(filterFiles("utils")).toEqual(["utils.ts"]);
    expect(filterFiles("", true)).toEqual(["keymaps.lua"]);
    expect(filterFiles("", false, true)).toEqual(["index.ts", "utils.ts"]);
    expect(filterFiles("gibt-es-nicht")).toEqual([]);
  });
});

describe("Einstiegslektion: Begrüßung und Normal-Modus", () => {
  const first = lessons.find((l) => l.id === "modes")!;
  for (const text of ["Hallo", "Hallo Vim"])
    it(`akzeptiert ${text} erst im Normal-Modus`, () => {
      expect(isComplete(first, { ...state, text, mode: "INSERT" })).toBe(false);
      expect(isComplete(first, { ...state, text, mode: "NORMAL" })).toBe(true);
    });
  it("akzeptiert unveränderten oder fehlerhaften Text nicht", () => {
    for (const text of ["Vim", "Hall", "Hallo!", "beliebig"])
      expect(isComplete(first, { ...state, text })).toBe(false);
  });
});
