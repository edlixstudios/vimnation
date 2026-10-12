import { test, expect } from "@playwright/test";
import { lessons } from "../src/course";
for (const lesson of lessons) {
  test(`Lösungsweg: ${lesson.id}`, async ({ page }) => {
    await page.goto(`/#course/${lesson.id}`);
    const editor = page.getByRole("textbox", { name: "Vim-Übungseditor" });
    await expect(editor).toBeVisible();
    await editor.focus();
    await expect(
      page.getByText("Geschafft. Gut gemacht!", { exact: true }),
    ).toHaveCount(0);
    for (const key of lesson.keys)
      await page.keyboard.press(key === " " ? "Space" : key);
    await expect(
      page.getByText("Geschafft. Gut gemacht!", { exact: true }),
    ).toBeVisible();
    if (lesson.goal.kind === "text")
      await expect(editor.locator(".cm-line")).toHaveText(
        lesson.goal.value.split("\n"),
      );
    await page.getByRole("button", { name: "Übung zurücksetzen" }).click();
    await expect(
      page.getByText("Geschafft. Gut gemacht!", { exact: true }),
    ).toHaveCount(0);
    await expect(editor.locator(".cm-line")).toHaveText(
      lesson.initial.split("\n"),
    );
  });
}
test("Fortschritt bleibt nach Neuladen erhalten", async ({ page }) => {
  await page.goto("/#course/delete");
  await page.getByRole("textbox", { name: "Vim-Übungseditor" }).focus();
  await page.keyboard.press("x");
  await expect(
    page.getByText("Geschafft. Gut gemacht!", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("1 von 38 Lektionen", { exact: true }),
  ).toBeVisible();
});
test("Shortcuts gelten nur im Editor und Suchfelder bleiben frei", async ({
  page,
}) => {
  await page.goto("/#reference");
  const search = page.getByRole("textbox", {
    name: "Nachschlagewerk durchsuchen",
  });
  await search.fill("ciw");
  await expect(
    page.getByRole("heading", {
      name: "Das Wort unter dem Cursor",
      exact: true,
    }),
  ).toBeVisible();
  await search.fill("Dateien");
  await expect(search).toHaveValue("Dateien");
  await expect(page.getByLabel("Which-Key")).toHaveCount(0);
});
test("Which-Key lässt sich abbrechen; Insert-Modus behält Leerzeichen", async ({
  page,
}) => {
  await page.goto("/#playground");
  const editor = page.getByRole("textbox", { name: "Vim-Übungseditor" });
  await editor.focus();
  await page.keyboard.press("Space");
  await expect(page.getByLabel("Which-Key")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Which-Key")).toHaveCount(0);
  await page.keyboard.press("i");
  await expect(page.getByText("INSERT", { exact: true })).toBeVisible();
  await page.keyboard.press("Space");
  await expect(page.getByLabel("Which-Key")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByText("NORMAL", { exact: true })).toBeVisible();
});
test("Fehlerhafte Texte lösen keinen Erfolg aus", async ({ page }) => {
  await page.goto("/#course/ciw");
  await page.getByRole("textbox", { name: "Vim-Übungseditor" }).focus();
  for (const k of ["c", "i", "w", "f", "e", "h", "l", "e", "r", "Escape"])
    await page.keyboard.press(k);
  await expect(
    page.getByText("Geschafft. Gut gemacht!", { exact: true }),
  ).toHaveCount(0);
});
test("Lernen ohne localStorage", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Speicher blockiert");
      },
    });
  });
  await page.goto("/#course/delete");
  await page.getByRole("textbox", { name: "Vim-Übungseditor" }).focus();
  await page.keyboard.press("x");
  await expect(
    page.getByText("Geschafft. Gut gemacht!", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "nicht speichern" }),
  ).toBeVisible();
});
test("mobile Oberfläche ohne horizontalen Überlauf", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Weniger Maus. Mehr Flow." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Mit Vim loslegen" }).click();
  await expect(
    page.getByRole("textbox", { name: "Vim-Übungseditor" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("Ungespeicherte Änderungen verhindern :q; :wq schließt", async ({
  page,
}) => {
  await page.goto("/#course/quit");
  const editor = page.getByRole("textbox", { name: "Vim-Übungseditor" });
  await editor.focus();
  for (const k of ["i", "X", "Escape", ":", "q", "Enter"])
    await page.keyboard.press(k);
  await expect(
    page.getByRole("status").filter({ hasText: "Ungespeicherte Änderungen" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Übungsdatei geschlossen" }),
  ).toHaveCount(0);
  for (const k of [":", "w", "q", "Enter"]) await page.keyboard.press(k);
  await expect(
    page.getByRole("heading", { name: "Übungsdatei geschlossen" }),
  ).toBeVisible();
});
test("Undo ohne Änderung löst die Übung nicht", async ({ page }) => {
  await page.goto("/#course/undo");
  await page.getByRole("textbox", { name: "Vim-Übungseditor" }).focus();
  await page.keyboard.press("u");
  await expect(
    page.getByText("Geschafft. Gut gemacht!", { exact: true }),
  ).toHaveCount(0);
});
test("Projekt-Suche liefert passende Inhalte und keine erfundenen Treffer", async ({
  page,
}) => {
  await page.goto("/#course/grep");
  await page.getByRole("textbox", { name: "Vim-Übungseditor" }).focus();
  for (const key of ["Space", "/"]) await page.keyboard.press(key);
  const search = page.getByRole("textbox", { name: "Simulation durchsuchen" });
  await search.fill("gibt-es-nicht");
  await expect(
    page.getByText("Keine Treffer im Beispielprojekt."),
  ).toBeVisible();
  await search.press("Enter");
  await expect(
    page.getByText("Geschafft. Gut gemacht!", { exact: true }),
  ).toHaveCount(0);
  await search.fill("answer");
  await expect(page.getByRole("button", { name: /index.ts:2/ })).toBeVisible();
  await search.press("Enter");
  await expect(
    page.getByText("Geschafft. Gut gemacht!", { exact: true }),
  ).toBeVisible();
});
test("Fenster lassen sich per Shortcut und Schaltfläche fokussieren", async ({
  page,
}) => {
  await page.goto("/#course/split");
  const editor = page.getByRole("textbox", { name: "Vim-Übungseditor" });
  await editor.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("|");
  await page.keyboard.press("Control+l");
  await expect(
    page.getByRole("region", { name: "Zweites Übungsfenster" }),
  ).toBeFocused();
  await page.keyboard.press("Control+h");
  await expect(editor).toBeFocused();
  await page
    .getByRole("button", { name: "Dieses Fenster fokussieren" })
    .click();
  await expect(
    page.getByRole("region", { name: "Zweites Übungsfenster" }),
  ).toBeFocused();
});
test("Hash-Navigation und Browser-Zurück", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mit Vim loslegen" }).click();
  await expect(
    page.getByRole("heading", { name: "Ein Modus für jede Aufgabe" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Nachschlagewerk", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Wissen zum Nachschlagen." }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Ein Modus für jede Aufgabe" }),
  ).toBeVisible();
});
test("Ansichten visuell prüfen und ohne Konsolenfehler laden", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await page.screenshot({
    path: testInfo.outputPath("home.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Mit Vim loslegen" }).click();
  await expect(
    page.getByRole("textbox", { name: "Vim-Übungseditor" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("lesson.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Nachschlagewerk", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Nachschlagewerk durchsuchen" }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("reference.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Übersicht", exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath("mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Lernraum-Einstellungen" }).click();
  await expect(
    page.getByRole("heading", { name: "Dein Lernraum, deine Einstellungen" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("Deutsches Layout: Option-Zeichen funktionieren im Leader-Menü", async ({
  page,
}) => {
  await page.goto("/#course/split");
  await page.getByRole("textbox", { name: "Vim-Übungseditor" }).focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("Alt+|");
  await expect(
    page.getByRole("region", { name: "Zweites Übungsfenster" }),
  ).toBeVisible();
});
test(":q! schließt ohne Speichern; Toolbar-Speichern erlaubt :q", async ({
  page,
}) => {
  await page.goto("/#course/quit");
  const editor = page.getByRole("textbox", { name: "Vim-Übungseditor" });
  await editor.focus();
  for (const k of ["i", "X", "Escape", ":", "q", "!", "Enter"])
    await page.keyboard.press(k);
  await expect(
    page.getByRole("heading", { name: "Übungsdatei geschlossen" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Wieder öffnen" }).click();
  await editor.focus();
  for (const k of ["i", "X", "Escape"]) await page.keyboard.press(k);
  await page.getByRole("button", { name: "Übungsdatei speichern" }).click();
  for (const k of [":", "q", "Enter"]) await page.keyboard.press(k);
  await expect(
    page.getByRole("heading", { name: "Übungsdatei geschlossen" }),
  ).toBeVisible();
  await expect(
    page.getByText("Geschafft. Gut gemacht!", { exact: true }),
  ).toBeVisible();
});

test("Erste Lektion: Hallo im Normal-Modus zeigt Erfolg und führt zur nächsten Übung", async ({
  page,
}) => {
  await page.goto("/#course/modes");
  const editor = page.getByRole("textbox", { name: "Vim-Übungseditor" });
  await editor.focus();
  for (const key of ["S", "H", "a", "l", "l", "o"])
    await page.keyboard.press(key);
  await expect(editor.locator(".cm-line")).toHaveText(["Hallo"]);
  await expect(page.getByText("INSERT", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Geschafft. Gut gemacht!", { exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByText("NORMAL", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Geschafft. Gut gemacht!", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Nächste Übung", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Am Ende einfügen", exact: true }),
  ).toBeVisible();
});

test("Falscher Text gibt Feedback; Korrektur löst die Aufgabe", async ({
  page,
}) => {
  await page.goto("/#course/modes");
  const editor = page.getByRole("textbox", { name: "Vim-Übungseditor" });
  await editor.focus();
  for (const key of ["S", "H", "a", "l", "l", "Escape"])
    await page.keyboard.press(key);
  await expect(
    page.getByText("Noch nicht ganz: Prüfe den Zieltext", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Geschafft. Gut gemacht!", { exact: true }),
  ).toHaveCount(0);
  for (const key of ["A", "o"]) await page.keyboard.press(key);
  await expect(
    page.getByText("Fast geschafft: Drücke Esc", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByText("Geschafft. Gut gemacht!", { exact: true }),
  ).toBeVisible();
});

test("Erklärungen und Lösungen stellen Tasten als Keycaps dar", async ({
  page,
}) => {
  await page.goto("/#course/modes");
  const copy = page.locator(".lesson-copy");
  await expect(copy.locator("kbd").filter({ hasText: /^i$/ })).toBeVisible();
  await expect(
    copy.locator("kbd").filter({ hasText: /Esc/ }).first(),
  ).toBeVisible();
  await expect(copy).not.toContainText("`");
  await page
    .getByRole("button", { name: "Lösung ansehen", exact: true })
    .click();
  const solution = page.locator(".solution");
  await expect(
    solution.getByRole("group", {
      name: "Shift + H gleichzeitig",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    solution.locator("kbd").filter({ hasText: "Space" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Lektion auswählen" })
    .selectOption("redo");
  await expect(
    page
      .locator(".lesson-copy")
      .getByRole("group", { name: "Ctrl + R gleichzeitig", exact: true })
      .first(),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Lektion auswählen" })
    .selectOption("files");
  await expect(
    page
      .locator(".lesson-copy")
      .getByRole("group", {
        name: "Tastenfolge: Space, dann f, dann f",
        exact: true,
      }),
  ).toBeVisible();
});
