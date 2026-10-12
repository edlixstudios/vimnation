# nvim to you

Ein deutschsprachiger Vim- und LazyVim-Lerntrainer mit 38 interaktiven Lektionen in acht Kapiteln. Lokales React-/TypeScript-Projekt mit Vite, ohne Backend oder Anmeldung.

## Starten

Voraussetzung: Node.js 22.12 oder neuer, empfohlen Node.js 24 LTS.

```sh
npm install
npm run dev
```

Öffne die im Terminal angezeigte lokale URL, standardmäßig http://127.0.0.1:5173. Falls der Port belegt ist, zeigt Vite einen anderen Port an.

Für eine gebaute Vorschau:

```sh
npm run build
npm run preview
```

## Lernen

- **Übersicht:** Lernpfad, Fortschritt und Einstieg in die nächste Lektion.
- **Lernpfad:** Erklärung, Aufgabe, Editor, gestufte Hinweise und ein möglicher Lösungsweg. Die Prüfung akzeptiert den korrekten Zustand, auch wenn du einen anderen gültigen Weg nutzt.
- **Nachschlagewerk:** Shortcuts und Best Practices durchsuchen.
- **Freies Üben:** Vim-Editing und die unterstützten LazyVim-Simulationen ausprobieren.
- **Einstellungen:** Editor-Schriftgröße ändern oder den Lernfortschritt zurücksetzen.

Klicke in den Editor, bevor du Shortcuts eingibst. `i` startet den Insert-Modus, `Esc` führt zurück. Die Statuszeile zeigt Modus und Cursorposition. Nach erfolgreicher Prüfung entscheidest du selbst, wann du weitergehst. Zurücksetzen startet die Übung erneut; abgeschlossene Lektionen bleiben im Fortschritt erhalten.

Der Trainer ist für einen Desktop-Browser mit physischer Tastatur gedacht. Kurs und Nachschlagewerk sind auch auf schmalen Bildschirmen nutzbar. Buchstabentasten werden anhand des eingegebenen Zeichens verarbeitet und funktionieren mit deutschem oder englischem Layout. Browserreservierte Shortcuts können vom Browser abgefangen werden: Die Toolbar bietet Undo, Redo und Speichern; Fenster lassen sich auch über Schaltflächen fokussieren.

## Editor und Simulationen

Das eigentliche Vim-Editing läuft in CodeMirror 6 mit `@replit/codemirror-vim`: Modi, Bewegungen, Operatoren, Textobjekte, Suche, Undo/Redo, Register und Makros. Das ist ein Browsereditor mit Vim-Belegung, kein vollständiges Neovim.

Die LazyVim-Übungen sind ausdrücklich markierte Simulationen eines kleinen Beispielprojekts:

- `Space`: Which-Key mit unterstützten Fortsetzungen.
- `Space f f` / `Space Space`: Dateisuche; `Space f c`: Konfigurationsdateien.
- `Space e`: Explorer; `Space ,`: Buffer-Auswahl; `H` / `L`: vorheriger/nächster Beispielbuffer.
- `Space |` / `Space -`: zusätzliche schreibgeschützte Ansicht rechts/unten; `Ctrl+h/k` zurück zum Editor, `Ctrl+j/l` zur Ansicht.
- `Space /`: Suche über den Inhalt der Beispieldateien; Pfeiltasten und Enter wählen Treffer.
- `gd` und `K`: vorbereitete Definition/Dokumentation von `greet`.
- `Space c r`: vorbereiteten Bezeichner `answer` umbenennen.
- `]d`, `[d`, `Space c d`: vorbereitete Diagnose anzeigen.
- `Space c f`: das Kursbeispiel `const answer=42;` formatieren.
- `Space g g`: statischen Git-Diff ansehen.

Es gibt keinen echten Sprachserver, Formatter oder Git-Prozess. Das zweite Fenster ist eine schreibgeschützte Ansicht, keine vollständige Neovim-Fensterverwaltung. Die Funktionen sind auf die beschriebenen Kursbeispiele begrenzt. Andere Vim-Befehle hängen vom Umfang der CodeMirror-Vim-Implementierung ab.

`:w`, `Ctrl+s` und die Speichern-Schaltfläche speichern den aktuellen Übungstext **nur innerhalb der Sitzung**. `:q` verweigert das Schließen bei ungespeicherten Änderungen. `:wq` speichert und schließt die Übungsansicht, `:q!` schließt ohne Speichern. Kein Befehl schreibt auf die Festplatte oder schließt einen Browser-Tab. Übungstexte werden beim Neuladen oder Wechseln der Lektion zurückgesetzt.

## Fortschritt und Datenschutz

Abgeschlossene Lektionen, zuletzt gewählte Lektion und Schriftgröße liegen unter `nvim-to-you.progress.v1` in `localStorage`. Fortschritt ist pro Browser und Origin gespeichert, ohne Synchronisation. Ein anderer Port erzeugt deshalb einen getrennten Lernraum. Ist der Speicher blockiert, funktioniert der Trainer weiter in der aktuellen Sitzung und zeigt einen Hinweis.

Schriften und alle App-Abhängigkeiten werden lokal gebündelt. Nach der Installation benötigt der laufende Trainer keine externen Dienste. Dokumentationslinks öffnen externe Seiten erst beim Anklicken. Es gibt keine Telemetrie.

## Prüfungen

```sh
npm test
npm run build
npm run test:e2e
```

Die Browsertests nutzen einen installierten Google Chrome. Alternativ kann Chromium mit `npx playwright install chromium` installiert werden; dann `channel: 'chrome'` in `playwright.config.ts` entfernen. Playwright startet automatisch einen lokalen Vite-Server oder verwendet einen laufenden Server auf Port 5173.

Die Tests führen den vorgesehenen Lösungsweg jeder Lektion über echte Tasteneingaben aus und prüfen Erfolg und Zurücksetzen. Weitere Szenarien: falsche Ergebnisse, Modi, Fokus, Which-Key, Fortschritt nach Neuladen, blockierter Speicher und schmale Ansichten. Unit-Tests prüfen Aufgabenbedingungen, Speicherformat und Simulationen.

## Inhalte erweitern

`src/course.ts` definiert Kapitel, stabile Lektionen-IDs, Ausgangstext und Cursor, Lernziel, Hinweise, Lösungsweg und Quelle. Ziele prüfen Text, Cursor oder ausgeführte Aktionen. Text- und Cursoraufgaben verlangen wieder den Normal-Modus. `src/simulation.ts` enthält das Beispielprojekt und die unterstützten LazyVim-Befehle. `src/Trainer.tsx` verbindet den Editor mit Aufgabenprüfung und Simulationen.

Tasten in Erklärungen, Aufgaben und Tipps werden explizit mit Backticks ausgezeichnet, zum Beispiel `` `ciw` `` oder `` `Space f f` ``. `src/KeyboardKeys.tsx` stellt sie als Keycaps dar: Pfeile bedeuten nacheinander, Pluszeichen gleichzeitig. Großbuchstaben zeigen zusätzlich Shift. Hinweise und Lösungen verwenden die strukturierte `keys`-Liste; die Auszeichnung verändert keine Übungsdaten oder Tasteneingaben.

Quellen, geprüft am **12.10.2026**:

- [Neovim User Manual](https://neovim.io/doc/user/usr_toc/)
- [LazyVim Standard-Keymaps](https://www.lazyvim.org/keymaps)
- [CodeMirror Vim-Keybindings](https://github.com/replit/codemirror-vim)

Eigene LazyVim-Mappings, Versionen und optionale Extras können abweichen. Der Kurs verwendet die Standardbelegung mit Space als Leader.
