import { useEffect, useRef, useState } from "react";
import { EditorState } from "@codemirror/state";
import {
  history as editorHistory,
  undoDepth,
  redoDepth,
} from "@codemirror/commands";
import {
  EditorView,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
} from "@codemirror/view";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
} from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { vim, Vim, getCM } from "@replit/codemirror-vim";
import {
  RotateCcw,
  Lightbulb,
  ArrowRight,
  Check,
  Undo2,
  Redo2,
  Save,
  MousePointer2,
  FileCode2,
  X,
} from "lucide-react";
import { isComplete, type Lesson, type Snapshot } from "./course";
import { KeyText, KeySequence } from "./KeyboardKeys";
import {
  files,
  filterFiles,
  searchProject,
  mappings,
  matchingMappings,
  type SimCommand,
} from "./simulation";

type Session = { save: () => void; quit: (force?: boolean) => void };
const sessions = new WeakMap<object, Session>();
Vim.defineEx("write", "w", (cm) => sessions.get(cm)?.save());
Vim.defineEx("quit", "q", (cm, params) =>
  sessions
    .get(cm)
    ?.quit((params.argString || params.input || "").includes("!")),
);
Vim.defineEx("wq", "wq", (cm) => {
  sessions.get(cm)?.save();
  sessions.get(cm)?.quit();
});
Vim.defineEx("x", "x", (cm) => {
  sessions.get(cm)?.save();
  sessions.get(cm)?.quit();
});
const editorTheme = EditorView.theme(
  {
    "&": { backgroundColor: "#15191c", color: "#c7d1d9", height: "100%" },
    ".cm-content": {
      fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
      padding: "24px 0",
      caretColor: "#b1dd8b",
    },
    ".cm-line": { padding: "0 22px" },
    ".cm-scroller": { overflow: "auto", lineHeight: "1.9" },
    ".cm-gutters": {
      backgroundColor: "#15191c",
      color: "#68747b",
      border: "none",
      minWidth: "48px",
    },
    ".cm-activeLine,.cm-activeLineGutter": { backgroundColor: "#ffffff05" },
    ".cm-cursor": { borderLeftColor: "#b1dd8b" },
    ".cm-fat-cursor": { background: "#b1dd8b", color: "#131917" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "#adc8b433",
    },
    ".cm-panels": {
      backgroundColor: "#1e2428",
      color: "#c7d1d9",
      borderColor: "#30393e",
    },
    ".cm-panels input": {
      background: "#14191c",
      color: "#e5e8eb",
      border: "1px solid #46534a",
      fontFamily: "monospace",
    },
  },
  { dark: true },
);

export default function Trainer({
  lesson,
  fontSize,
  onComplete,
  onNext,
  nextLabel = "Nächste Übung",
  free = false,
}: {
  lesson: Lesson;
  fontSize: number;
  onComplete: (id: string) => void;
  onNext: () => void;
  nextLabel?: string;
  free?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    view = useRef<EditorView | null>(null);
  const report = useRef(onComplete);
  report.current = onComplete;
  const [mode, setMode] = useState("NORMAL"),
    [keys, setKeys] = useState<string[]>([]),
    [position, setPosition] = useState({ line: 1, col: 1 });
  const [success, setSuccess] = useState(false),
    [hints, setHints] = useState(0),
    [solution, setSolution] = useState(false),
    [reset, setReset] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot>({
    text: lesson.initial,
    cursor: lesson.cursor,
    mode: "NORMAL",
    actions: [],
    changed: false,
  });
  const [leader, setLeader] = useState<string | null>(null),
    [panel, setPanel] = useState<SimCommand | null>(null),
    [query, setQuery] = useState(""),
    [message, setMessage] = useState(""),
    [closed, setClosed] = useState(false),
    [filename, setFilename] = useState("training.txt");
  const [split, setSplit] = useState<"right" | "below" | null>(null),
    [explorer, setExplorer] = useState(false),
    [selected, setSelected] = useState(0),
    [focusedWindow, setFocusedWindow] = useState(1);
  const secondWindow = useRef<HTMLDivElement>(null);
  const actions = useRef<string[]>([]),
    changed = useRef(false),
    currentMode = useRef("NORMAL"),
    leaderRef = useRef<string | null>(null),
    pending = useRef(""),
    history = useRef(""),
    completed = useRef(false),
    timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const runRef = useRef<(command: SimCommand) => void>(() => {});
  function emit() {
    const v = view.current;
    if (!v) return;
    const cursor = v.state.selection.main.head,
      line = v.state.doc.lineAt(cursor);
    setPosition({ line: line.number, col: cursor - line.from + 1 });
    const nextSnapshot: Snapshot = {
      text: v.state.doc.toString(),
      cursor,
      mode: currentMode.current,
      actions: [...actions.current],
      changed: changed.current,
    };
    setSnapshot(nextSnapshot);
    if (!free && !completed.current && isComplete(lesson, nextSnapshot)) {
      completed.current = true;
      setSuccess(true);
      report.current(lesson.id);
    }
  }
  function later() {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      emit();
    }, 0);
    timers.current.add(timer);
  }
  function action(name: string) {
    if (!actions.current.includes(name)) actions.current.push(name);
    later();
  }
  function replace(text: string, cursor = 0) {
    const v = view.current;
    if (v) {
      v.dispatch({
        changes: { from: 0, to: v.state.doc.length, insert: text },
        selection: { anchor: cursor },
      });
      later();
    }
  }
  function focus() {
    view.current?.focus();
  }
  function finishPanel() {
    setPanel(null);
    setQuery("");
    setSelected(0);
    focus();
  }
  function run(command: SimCommand) {
    leaderRef.current = null;
    setLeader(null);
    pending.current = "";
    setMessage("");
    if (command === "explorer") {
      setExplorer((e) => !e);
      action("explorer");
      return;
    }
    if (command === "split" || command === "split-below") {
      setSplit(command === "split" ? "right" : "below");
      action("split");
      setMessage(
        "Fenster geteilt · Ctrl+h/k zum Editor, Ctrl+j/l zur zweiten Ansicht. Alternativ die Fenster-Schaltflächen nutzen.",
      );
      return;
    }
    if (command === "definition") {
      replace(files["utils.ts"]);
      setFilename("utils.ts");
      action("definition");
      setMessage("Definition von greet · vorbereitetes Beispiel");
      return;
    }
    if (command === "diagnostic") {
      const v = view.current;
      if (v && v.state.doc.lines > 1)
        v.dispatch({ selection: { anchor: v.state.doc.line(2).from } });
      action("diagnostic");
      setMessage("Zeile 2: „missing“ ist nicht definiert. · Simulation");
      return;
    }
    if (command === "format") {
      if (view.current?.state.doc.toString() === "const answer=42;") {
        replace("const answer = 42;");
        action("format");
        setMessage("Übungsdatei formatiert.");
      } else
        setMessage(
          "Die Formatter-Simulation unterstützt das Beispiel „const answer=42;“.",
        );
      return;
    }
    if (command === "next-buffer" || command === "prev-buffer") {
      setFilename(command === "next-buffer" ? "utils.ts" : "index.ts");
      replace(files[command === "next-buffer" ? "utils.ts" : "index.ts"]);
      action(command);
      return;
    }
    setPanel(command);
    setQuery("");
    setSelected(0);
    if (command === "hover") action("hover");
    if (command === "git") action("git");
  }
  runRef.current = run;
  useEffect(() => {
    setMode("NORMAL");
    setKeys([]);
    setSuccess(false);
    setHints(0);
    setSolution(false);
    setPanel(null);
    setQuery("");
    setClosed(false);
    setFilename("training.txt");
    setSplit(null);
    setFocusedWindow(1);
    setExplorer(false);
    setMessage("");
    setLeader(null);
    actions.current = [];
    changed.current = false;
    currentMode.current = "NORMAL";
    leaderRef.current = null;
    pending.current = "";
    history.current = "";
    completed.current = false;
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: lesson.initial,
        selection: { anchor: lesson.cursor },
        extensions: [
          vim(),
          editorHistory(),
          lineNumbers(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          syntaxHighlighting(defaultHighlightStyle),
          javascript({ typescript: true }),
          editorTheme,
          EditorView.contentAttributes.of({ "aria-label": "Vim-Übungseditor" }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) changed.current = true;
            if (update.docChanged || update.selectionSet) later();
          }),
        ],
      }),
    });
    view.current = v;
    const cm = getCM(v)!;
    for (const register of Object.values(Vim.getRegisterController().registers))
      register.clear();
    let savedText = lesson.initial;
    const save = () => {
      savedText = v.state.doc.toString();
      action("save");
      setMessage("Übungsdatei in dieser Sitzung gespeichert.");
    };
    const quit = (force = false) => {
      if (!force && v.state.doc.toString() !== savedText) {
        setMessage(
          "Ungespeicherte Änderungen: Nutze :wq zum Speichern und Schließen oder :q! zum Verwerfen.",
        );
        return;
      }
      action("quit");
      setClosed(true);
      setMessage(
        "Übungsdatei geschlossen. Mit „Zurücksetzen“ öffnest du sie wieder.",
      );
    };
    sessions.set(cm, { save, quit });
    const modeHandler = (e: { mode: string; subMode?: string }) => {
      currentMode.current =
        e.mode === "insert"
          ? "INSERT"
          : e.mode === "visual"
            ? "VISUAL"
            : "NORMAL";
      setMode(currentMode.current);
      later();
    };
    cm.on("vim-mode-change", modeHandler);
    const listener = (e: KeyboardEvent) => {
      if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
      const k = e.ctrlKey ? "Control+" + e.key : e.key;
      setKeys((prev) => [
        ...prev.slice(-11),
        e.key === " " ? "Space" : e.key === "Escape" ? "Esc" : k,
      ]);
      const normal = currentMode.current === "NORMAL";
      // CodeMirror's command/search input owns keys while a command is being typed.
      const inEditor =
        e.target === v.contentDOM || v.contentDOM.contains(e.target as Node);
      if (!inEditor) return;
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        e.stopPropagation();
        save();
        return;
      }
      if (normal && undoDepth(v.state) > 0 && e.key === "u") action("undo");
      if (normal && redoDepth(v.state) > 0 && e.ctrlKey && e.key === "r")
        action("redo");
      history.current = (history.current + k).slice(-24);
      if (
        normal &&
        e.key === "p" &&
        cm.state.vim?.inputState.registerName === "a" &&
        Vim.getRegisterController().getRegister("a").toString()
      )
        action("register");
      if (
        normal &&
        history.current.endsWith("@a") &&
        Vim.getRegisterController().getRegister("a").keyBuffer.length > 0
      )
        action("macro");
      const input = cm.state.vim?.inputState;
      const waitingForVimArgument = Boolean(
        input?.operator ||
        input?.keyBuffer.length ||
        input?.registerName ||
        input?.prefixRepeat.length,
      );
      if (
        normal &&
        !waitingForVimArgument &&
        (!e.ctrlKey || e.getModifierState("AltGraph")) &&
        !e.metaKey &&
        (!e.altKey || e.key.length === 1) &&
        (lesson.lazy || free)
      ) {
        if (leaderRef.current !== null) {
          e.preventDefault();
          e.stopPropagation();
          if (e.key === "Escape") {
            leaderRef.current = null;
            setLeader(null);
            return;
          }
          const prefix = leaderRef.current + e.key;
          if (mappings[prefix]) {
            runRef.current(mappings[prefix].command);
            return;
          }
          if (matchingMappings(prefix).length) {
            leaderRef.current = prefix;
            setLeader(prefix);
          } else {
            leaderRef.current = null;
            setLeader(null);
            setMessage(
              "Diese Leader-Folge ist im Trainer nicht belegt. Space zeigt die unterstützten Befehle.",
            );
          }
          return;
        }
        if (e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          leaderRef.current = "";
          setLeader("");
          action("leader");
          return;
        }
        if (pending.current) {
          const first = pending.current;
          pending.current = "";
          if (first === "g" && e.key === "d") {
            e.preventDefault();
            e.stopPropagation();
            runRef.current("definition");
            return;
          }
          if ((first === "]" || first === "[") && e.key === "d") {
            e.preventDefault();
            e.stopPropagation();
            runRef.current("diagnostic");
            return;
          }
          Vim.handleKey(cm, first, "user");
        } else if (["g", "]", "["].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          pending.current = e.key;
          return;
        }
        if (e.key === "K") {
          e.preventDefault();
          e.stopPropagation();
          runRef.current("hover");
          return;
        }
        if (e.key === "L" || e.key === "H") {
          e.preventDefault();
          e.stopPropagation();
          runRef.current(e.key === "L" ? "next-buffer" : "prev-buffer");
          return;
        }
      }
      later();
    };
    v.dom.addEventListener("keydown", listener, true);
    emit();
    return () => {
      for (const timer of timers.current) clearTimeout(timer);
      timers.current.clear();
      v.dom.removeEventListener("keydown", listener, true);
      sessions.delete(cm);
      v.destroy();
      view.current = null;
    };
  }, [lesson.id, reset, free]);
  useEffect(() => {
    if (host.current) host.current.style.fontSize = `${fontSize}px`;
  }, [fontSize]);
  const results =
    panel === "grep"
      ? searchProject(query)
      : filterFiles(query, panel === "config", panel === "buffers");
  function choose(name: string) {
    const file = panel === "grep" ? name.split(":")[0] : name;
    const line =
      panel === "grep" ? Number(name.split(":")[1].split(" · ")[0]) : 1;
    const cursor = files[file]
      .split("\n")
      .slice(0, line - 1)
      .reduce((sum, l) => sum + l.length + 1, 0);
    replace(files[file], cursor);
    setFilename(file);
    action(
      panel === "buffers"
        ? `buffer:${file}`
        : panel === "grep"
          ? "grep-result"
          : `file:${file}`,
    );
    finishPanel();
  }
  function rename() {
    if (!/^[A-Za-z_$][\w$]*$/.test(query)) {
      setMessage("Bitte einen gültigen Bezeichner eingeben.");
      return;
    }
    const text = view.current?.state.doc.toString() || "";
    if (!/\banswer\b/.test(text)) {
      setMessage("Dieses Beispiel enthält kein Symbol answer.");
      return;
    }
    replace(text.replace(/\banswer\b/g, query));
    action("rename");
    finishPanel();
    setMessage("Alle Vorkommen des vorbereiteten Symbols wurden umbenannt.");
  }
  function keyCommand(key: string) {
    const v = view.current;
    if (!v) return;
    const canUndo = undoDepth(v.state) > 0,
      canRedo = redoDepth(v.state) > 0;
    Vim.handleKey(getCM(v)!, key, "user");
    if (key === "u" && canUndo) action("undo");
    if (key === "<C-r>" && canRedo) action("redo");
    later();
    focus();
  }
  const targetMatches = isComplete(lesson, { ...snapshot, mode: "NORMAL" });
  const waitingForNormal = targetMatches && snapshot.mode !== "NORMAL";
  const textMatches =
    lesson.goal.kind === "text" &&
    [lesson.goal.value, ...(lesson.goal.alternatives || [])].includes(
      snapshot.text,
    );
  const waitingForAction =
    textMatches && !targetMatches && snapshot.mode === "NORMAL";
  const incorrectText =
    lesson.goal.kind === "text" &&
    snapshot.changed &&
    snapshot.mode === "NORMAL" &&
    !textMatches;
  return (
    <div className="trainer-layout">
      {!free && (
        <section className="lesson-copy">
          <div className="eyebrow">
            {lesson.lazy ? "LAZYVIM · SIMULATION" : "VIM · GRUNDLAGEN"}{" "}
            <span>CA. 3 MIN</span>
          </div>
          <h2>{lesson.title}</h2>
          <p>
            <KeyText text={lesson.intro} />
          </p>
          <div className="task">
            <span className="task-label">
              <MousePointer2 size={15} /> DEINE AUFGABE
            </span>
            <p>
              <KeyText text={lesson.task} />
            </p>
            {lesson.goal.kind === "text" && (
              <div className="target-text">
                <small>
                  ZIELTEXT
                  {lesson.goal.alternatives?.length
                    ? " · EINE DER VARIANTEN"
                    : ""}
                </small>
                {[lesson.goal.value, ...(lesson.goal.alternatives || [])].map(
                  (text) => (
                    <pre key={text}>{text}</pre>
                  ),
                )}
              </div>
            )}
          </div>
          <div className="tip">
            <Lightbulb size={17} />
            <p>
              <KeyText text={lesson.tip} />
            </p>
          </div>
          <div className="lesson-help">
            <button
              onClick={() => setHints(Math.min(hints + 1, lesson.hints.length))}
            >
              <Lightbulb size={15} />
              Hinweis {hints ? `${hints}/${lesson.hints.length}` : ""}
            </button>
            <button onClick={() => setSolution(!solution)}>
              {solution ? "Lösung ausblenden" : "Lösung ansehen"}
            </button>
          </div>
          {hints === 1 && (
            <p className="hint">
              <KeyText text={lesson.hints[0]} />
            </p>
          )}
          {hints > 1 && (
            <div className="hint">
              <p>Versuche diese Folge – die Pfeile bedeuten „nacheinander“:</p>
              <KeySequence keys={lesson.keys} />
            </div>
          )}
          {solution && (
            <div className="solution">
              <strong>Ein möglicher Lösungsweg</strong>
              <KeySequence keys={lesson.keys} />
              <p>
                <KeyText text={lesson.solution} />
              </p>
            </div>
          )}
          <a
            className="source"
            href={lesson.source}
            target="_blank"
            rel="noreferrer"
          >
            Offizielle Dokumentation ↗
          </a>
        </section>
      )}
      <section className="editor-area" aria-label="Interaktiver Trainer">
        {!free && success && (
          <div className="exercise-result done success-banner" role="status">
            <Check size={22} />
            <div>
              <strong>Geschafft. Gut gemacht!</strong>
              <p>Die Aufgabe ist abgeschlossen.</p>
            </div>
            <button className="primary" onClick={onNext}>
              {nextLabel} <ArrowRight size={17} />
            </button>
          </div>
        )}
        <div className="editor-toolbar">
          <span>
            <FileCode2 size={15} />
            {filename}
            <span className="file-dot" />
          </span>
          <div>
            <button
              title="Undo (u)"
              aria-label="Undo"
              onClick={() => keyCommand("u")}
            >
              <Undo2 size={15} />
            </button>
            <button
              title="Redo (Ctrl+r) · Browseralternative"
              aria-label="Redo"
              onClick={() => keyCommand("<C-r>")}
            >
              <Redo2 size={15} />
            </button>
            <button
              aria-label="Übungsdatei speichern"
              title="Speichern (Ctrl+s / :w)"
              onClick={() => {
                const cm = view.current && getCM(view.current);
                if (cm) sessions.get(cm)?.save();
                focus();
              }}
            >
              <Save size={15} />
            </button>
            <button
              aria-label="Übung zurücksetzen"
              onClick={() => setReset((r) => r + 1)}
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>
        <div
          className={`editor-workspace ${split === "below" ? "split-below" : ""}`}
          onKeyDownCapture={(e) => {
            if (split && e.ctrlKey && ["h", "j", "k", "l"].includes(e.key)) {
              e.preventDefault();
              e.stopPropagation();
              if (["j", "l"].includes(e.key)) secondWindow.current?.focus();
              else focus();
            }
          }}
        >
          {explorer && (
            <aside className="explorer">
              <small>EXPLORER · SIMULATION</small>
              <p>⌄ hello-neovim</p>
              {Object.keys(files)
                .filter((f) => !f.endsWith(".lua"))
                .map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      replace(files[f]);
                      setFilename(f);
                      action(`file:${f}`);
                      focus();
                    }}
                  >
                    <FileCode2 size={13} />
                    {f}
                  </button>
                ))}
            </aside>
          )}
          <div
            className={`editor-host ${focusedWindow === 1 ? "focused-window" : ""}`}
            ref={host}
            style={{ fontSize }}
            onFocus={() => setFocusedWindow(1)}
          />
          {split && (
            <div
              className={`split-preview ${focusedWindow === 2 ? "focused-window" : ""}`}
              ref={secondWindow}
              tabIndex={0}
              role="region"
              aria-label="Zweites Übungsfenster"
              onFocus={() => setFocusedWindow(2)}
            >
              <small>2. FENSTER · SCHREIBGESCHÜTZTE SIMULATION</small>
              <pre>{files["utils.ts"]}</pre>
              <button onClick={focus}>Zum Editor</button>
              <button onClick={() => secondWindow.current?.focus()}>
                Dieses Fenster fokussieren
              </button>
              <button
                onClick={() => {
                  setSplit(null);
                  focus();
                }}
              >
                Fenster schließen
              </button>
            </div>
          )}
          {closed && (
            <div className="closed-overlay">
              <Check size={28} />
              <h3>Übungsdatei geschlossen</h3>
              <p>Dein Browser bleibt geöffnet.</p>
              <button onClick={() => setReset((r) => r + 1)}>
                Wieder öffnen
              </button>
            </div>
          )}
          {leader !== null && (
            <div className="which-key" aria-label="Which-Key">
              <div>
                <strong>
                  Which-Key <small>SIMULATION</small>
                </strong>
                <kbd>Space {leader}</kbd>
              </div>
              <div className="which-options">
                {matchingMappings(leader).map(([key, m]) => (
                  <button
                    key={key}
                    onClick={() => {
                      run(m.command);
                      focus();
                    }}
                  >
                    <kbd>
                      {key.slice(leader.length) === " "
                        ? "Space"
                        : key.slice(leader.length)}
                    </kbd>
                    {m.label}
                  </button>
                ))}
              </div>
              <small>Weitere Taste drücken · Esc zum Schließen</small>
            </div>
          )}
        </div>
        <div className="editor-status">
          <span className={`mode mode-${mode.toLowerCase()}`}>{mode}</span>
          <span>{lesson.lazy || free ? "LazyVim Trainer" : "Vim Trainer"}</span>
          <span className="cursor-position" aria-label="Cursorposition">
            Ln {position.line}, Col {position.col}
          </span>
          <span>UTF-8</span>
        </div>
        <div className="key-history">
          <span>TASTENEINGABEN</span>
          <div>
            {keys.length ? (
              keys.map((k, i) => <kbd key={`${i}-${k}`}>{k}</kbd>)
            ) : (
              <span className="muted">Klicke in den Editor und leg los.</span>
            )}
          </div>
        </div>
        {message && (
          <p className="editor-message" role="status">
            {message}
          </p>
        )}
        {panel && (
          <section className="sim-panel" aria-label="LazyVim-Simulation">
            <div className="sim-heading">
              <strong>
                {panel === "rename"
                  ? "Symbol umbenennen"
                  : panel === "hover"
                    ? "Dokumentation"
                    : panel === "git"
                      ? "LazyGit"
                      : panel === "grep"
                        ? "Im Projekt suchen"
                        : panel === "buffers"
                          ? "Offene Buffer"
                          : "Dateien finden"}{" "}
                <small>SIMULATION</small>
              </strong>
              <button aria-label="Simulation schließen" onClick={finishPanel}>
                <X size={17} />
              </button>
            </div>
            {panel === "hover" ? (
              <div className="hover-doc">
                <code>greet(name: string): string</code>
                <p>Gibt eine Begrüßung für den angegebenen Namen zurück.</p>
                <p className="muted">
                  Vorbereitete Dokumentation für das Übungsprojekt.
                </p>
              </div>
            ) : panel === "git" ? (
              <div className="git-diff">
                <p>
                  <span className="badge">M</span> index.ts · 1 Änderung
                </p>
                <pre>
                  <span>- const answer = 41;</span>
                  {"\n"}
                  <em>+ const answer = 42;</em>
                </pre>
                <p className="muted">
                  Lies den Diff vor einem Commit. Diese Ansicht führt keine
                  Git-Befehle aus.
                </p>
              </div>
            ) : (
              <>
                <input
                  autoFocus
                  aria-label={
                    panel === "rename"
                      ? "Neuer Symbolname"
                      : "Simulation durchsuchen"
                  }
                  placeholder={
                    panel === "rename"
                      ? "Neuer Name für answer …"
                      : panel === "grep"
                        ? "answer oder greet suchen …"
                        : "Dateiname eingeben …"
                  }
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelected(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      finishPanel();
                    }
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setSelected((s) => Math.min(s + 1, results.length - 1));
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setSelected((s) => Math.max(0, s - 1));
                    }
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (panel === "rename") rename();
                      else if (results[selected]) choose(results[selected]);
                    }
                  }}
                />
                {panel === "rename" ? (
                  <button className="primary" onClick={rename}>
                    Umbenennen <ArrowRight size={15} />
                  </button>
                ) : (
                  <div className="picker-results">
                    {results.length ? (
                      results.map((f, i) => (
                        <button
                          className={i === selected ? "selected" : ""}
                          key={f}
                          onClick={() => choose(f)}
                        >
                          <FileCode2 size={15} />
                          {f}
                          <span>↵</span>
                        </button>
                      ))
                    ) : (
                      <p>Keine Treffer im Beispielprojekt.</p>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        )}
        {!free && !success && (
          <div
            className={`exercise-result ${incorrectText ? "needs-work" : ""}`}
            aria-live="polite"
          >
            <>
              <div className="status-circle" />
              <div>
                <strong>
                  {waitingForNormal
                    ? "Fast geschafft: Drücke Esc"
                    : waitingForAction
                      ? "Der Text stimmt – die Aktion fehlt noch"
                      : incorrectText
                        ? "Noch nicht ganz: Prüfe den Zieltext"
                        : "Dein nächster kleiner Schritt"}
                </strong>
                <p>
                  {waitingForNormal
                    ? "Der Zieltext stimmt. Kehre zum Abschließen in den Normal-Modus zurück."
                    : waitingForAction
                      ? "Führe auch den in der Aufgabe beschriebenen Befehl aus."
                      : incorrectText
                        ? "Vergleiche deinen Text mit dem Zieltext in der Aufgabenbeschreibung."
                        : "Die Aufgabe wird automatisch geprüft."}
                </p>
              </div>
            </>
          </div>
        )}
        <p className="editor-footnote">
          {lesson.lazy || free
            ? "LazyVim-Funktionen sind vorbereitete Simulationen. "
            : ""}
          Nur der fokussierte Editor fängt Shortcuts ab. Redo ist auch über die
          Toolbar erreichbar.
        </p>
      </section>
    </div>
  );
}
