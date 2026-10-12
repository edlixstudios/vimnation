import { lazy, Suspense, useState, useEffect } from "react";
import { KeyText, KeySequence } from "./KeyboardKeys";
import {
  ArrowRight,
  BookOpen,
  Code2,
  Compass,
  GraduationCap,
  Keyboard,
  Check,
  ChevronRight,
  Terminal,
  Search,
  Settings,
  ExternalLink,
  Leaf,
} from "lucide-react";
import { chapters, lessons, practiceTips, type Lesson } from "./course";
import {
  defaultProgress,
  loadProgress,
  saveProgress,
  type Progress,
} from "./progress";
const Trainer = lazy(() => import("./Trainer"));
type Page = "home" | "course" | "reference" | "playground";
const sandbox: Lesson = {
  ...lessons[0],
  id: "sandbox",
  title: "Freies Üben",
  initial:
    '// Dein Platz zum Ausprobieren.\n// i zum Schreiben · Esc zurück · Space für Which-Key\n\nconst answer = 42;\n\nfunction greet(name) {\n  return "Hallo " + name;\n}',
  cursor: 0,
  lazy: true,
};
function readInitial() {
  try {
    return loadProgress(window.localStorage);
  } catch {
    return { ...defaultProgress };
  }
}
function readRoute(): { page: Page; id: string } {
  const [route, id] = location.hash.replace("#", "").split("/");
  return {
    page: ["course", "reference", "playground"].includes(route)
      ? (route as Page)
      : "home",
    id: lessons.some((l) => l.id === id) ? id : "modes",
  };
}
const route = readRoute();
export default function App() {
  const [page, setPage] = useState<Page>(route.page),
    [progress, setProgress] = useState<Progress>(readInitial),
    [lessonId, setLessonId] = useState(
      route.page === "course" ? route.id : progress.lastLesson,
    ),
    [query, setQuery] = useState(""),
    [settings, setSettings] = useState(false),
    [storageOk, setStorageOk] = useState(true);
  const completed = progress.completed.filter((id) =>
      lessons.some((l) => l.id === id),
    ),
    percent = Math.round((completed.length / lessons.length) * 100);
  const current = lessons.find((l) => l.id === lessonId) || lessons[0],
    index = lessons.indexOf(current);
  useEffect(() => {
    const onRoute = () => {
      const next = readRoute();
      setPage(next.page);
      if (next.page === "course") setLessonId(next.id);
      setQuery("");
      setSettings(false);
    };
    window.addEventListener("hashchange", onRoute);
    return () => window.removeEventListener("hashchange", onRoute);
  }, []);
  function persist(next: Progress) {
    setProgress(next);
    try {
      setStorageOk(saveProgress(window.localStorage, next));
    } catch {
      setStorageOk(false);
    }
  }
  function navigate(next: Page, id = lessonId) {
    setPage(next);
    setQuery("");
    setSettings(false);
    location.hash = next === "course" ? `course/${id}` : next;
    window.scrollTo({ top: 0 });
  }
  function openLesson(id: string) {
    setLessonId(id);
    persist({ ...progress, lastLesson: id });
    navigate("course", id);
  }
  function markComplete(id: string) {
    setProgress((p) => {
      if (p.completed.includes(id)) return p;
      const next = { ...p, completed: [...p.completed, id] };
      try {
        setStorageOk(saveProgress(window.localStorage, next));
      } catch {
        setStorageOk(false);
      }
      return next;
    });
  }
  const nextLesson =
    lessons.find((l) => !completed.includes(l.id)) || lessons[0];
  const resume =
    lessons.find(
      (l) => l.id === progress.lastLesson && !completed.includes(l.id),
    ) || nextLesson;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            navigate("home");
          }}
        >
          <span className="brand-symbol">
            <Terminal size={22} />
          </span>
          <span>
            nvim<span className="brand-light"> to you</span>
            <small>LEARN THE VIM WAY</small>
          </span>
        </a>
        <div className="workspace-label">DEIN LERNRAUM</div>
        <nav aria-label="Hauptnavigation">
          {(
            [
              { id: "home", label: "Übersicht", icon: Compass },
              { id: "course", label: "Lernpfad", icon: GraduationCap },
              { id: "reference", label: "Nachschlagewerk", icon: BookOpen },
              { id: "playground", label: "Freies Üben", icon: Code2 },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={page === id ? "nav-item active" : "nav-item"}
              onClick={() =>
                id === "course" ? openLesson(lessonId) : navigate(id)
              }
            >
              <Icon size={18} />
              {label}
              {page === id && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-course">
          <div className="workspace-label">
            DEIN FORTSCHRITT <span>{percent}%</span>
          </div>
          <div className="progress-track">
            <div style={{ width: `${percent}%` }} />
          </div>
          <p>
            {completed.length} von {lessons.length} Lektionen
          </p>
          {chapters.map((c, i) => (
            <button
              key={c.title}
              className={`chapter-nav ${page === "course" && current.chapter === i ? "selected" : ""}`}
              onClick={() =>
                openLesson(
                  lessons.find(
                    (l) => l.chapter === i && !completed.includes(l.id),
                  )?.id || lessons.find((l) => l.chapter === i)!.id,
                )
              }
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              {c.title}
              {lessons
                .filter((l) => l.chapter === i)
                .every((l) => completed.includes(l.id)) && <Check size={13} />}
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="local-label">
            <span />
            Lokal. Dein eigener Rhythmus.
          </div>
          <button
            className="nav-item"
            onClick={() => setSettings(!settings)}
            aria-expanded={settings}
          >
            <Settings size={17} />
            Einstellungen
          </button>
          <div className="profile">
            <div>A</div>
            <span>
              Dein Lernraum<small>Vim-Anfänger · LazyVim</small>
            </span>
            <Leaf size={16} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <span>Dein Lernraum</span>
            <ChevronRight size={14} />
            <strong>
              {page === "home"
                ? "Übersicht"
                : page === "course"
                  ? "Lernpfad"
                  : page === "reference"
                    ? "Nachschlagewerk"
                    : "Freies Üben"}
            </strong>
          </div>
          <div className="topbar-tools">
            <span className="topbar-badge">
              <span /> LAZYVIM EDITION
            </span>
            <button
              className="settings-toggle"
              aria-label="Lernraum-Einstellungen"
              aria-expanded={settings}
              onClick={() => setSettings(!settings)}
            >
              <Settings size={16} />
            </button>
          </div>
        </header>
        <main>
          {settings && (
            <section className="settings-panel">
              <h2>Dein Lernraum, deine Einstellungen</h2>
              <label>
                Schriftgröße im Editor{" "}
                <select
                  value={progress.fontSize}
                  onChange={(e) =>
                    persist({ ...progress, fontSize: Number(e.target.value) })
                  }
                >
                  <option value={14}>Klein · 14 px</option>
                  <option value={16}>Normal · 16 px</option>
                  <option value={18}>Groß · 18 px</option>
                </select>
              </label>
              <p>
                Fortschritt wird ausschließlich in diesem Browser gespeichert.
              </p>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "Deinen gesamten Lernfortschritt zurücksetzen?",
                    )
                  )
                    persist({
                      ...defaultProgress,
                      fontSize: progress.fontSize,
                    });
                }}
              >
                Lernfortschritt zurücksetzen
              </button>
            </section>
          )}
          {!storageOk && (
            <p className="storage-warning" role="status">
              Der Browser kann den Fortschritt gerade nicht speichern. Du kannst
              in dieser Sitzung weiterlernen.
            </p>
          )}
          {page === "home" && (
            <>
              <div className="page-intro">
                <div className="eyebrow">KLEINE SCHRITTE. GROSSE WIRKUNG.</div>
                <h1>
                  Weniger Maus.
                  <br />
                  Mehr <span>Flow.</span>
                </h1>
                <p>
                  Lerne Vim von Grund auf – und fühle dich in LazyVim zuhause.
                  <br className="desktop-break" /> Eine Aufgabe, ein Aha-Moment,
                  ein Schritt nach dem anderen.
                </p>
              </div>
              <section className="hero-card">
                <div className="hero-copy">
                  <span className="pill">
                    <span /> DEIN NÄCHSTER SCHRITT
                  </span>
                  <h2>
                    {completed.length
                      ? "Bereit für den nächsten Aha-Moment?"
                      : "Alles beginnt mit einem Modus."}
                  </h2>
                  <p>
                    {completed.length
                      ? `Mach weiter mit „${resume.title}“. Du bestimmst das Tempo.`
                      : "In Vim hat jede Taste eine Aufgabe. Entdecke den Normal- und Insert-Modus – und schreibe deine erste Zeile."}
                  </p>
                  <button
                    className="primary"
                    onClick={() => openLesson(resume.id)}
                  >
                    {completed.length ? "Weiterlernen" : "Mit Vim loslegen"}
                    <ArrowRight size={17} />
                  </button>
                  <span className="hero-meta">
                    Kapitel {resume.chapter + 1} · {resume.title} · ca. 3 Min
                  </span>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="mini-window">
                    <div className="mini-title">
                      <i />
                      <i />
                      <i />
                      <span>hello-vim.txt</span>
                    </div>
                    <div className="mini-code">
                      <span className="mini-number">1</span>
                      <span>
                        <span className="code-comment">
                          // Ein neuer Weg zu arbeiten.
                        </span>
                        <br />
                        <span className="mini-number inline-number">2</span>
                        <span className="mini-cursor">H</span>allo Vim
                        <span className="code-punctuation">_</span>
                        <br />
                        <span className="mini-number inline-number">3</span>
                        <br />
                        <span className="mini-number inline-number">4</span>
                        <span className="code-comment">~</span>
                      </span>
                    </div>
                    <div className="mini-status">
                      <b>NORMAL</b>
                      <span>hello-vim.txt</span>
                      <span>1:1</span>
                    </div>
                  </div>
                  <div className="floating-keys">
                    <kbd>i</kbd>
                    <span>schreiben</span>
                    <kbd>esc</kbd>
                    <span>zurück</span>
                  </div>
                </div>
              </section>
              <div className="stats-row">
                <div>
                  <span className="stat-icon">
                    <BookOpen size={19} />
                  </span>
                  <span>
                    <strong>{lessons.length} kurze Lektionen</strong>
                    <small>Von den Basics zum Workflow</small>
                  </span>
                </div>
                <div>
                  <span className="stat-icon">
                    <Keyboard size={19} />
                  </span>
                  <span>
                    <strong>Direkt ausprobieren</strong>
                    <small>Interaktive Übungen im Browser</small>
                  </span>
                </div>
                <div>
                  <span className="stat-icon">
                    <Leaf size={19} />
                  </span>
                  <span>
                    <strong>In deinem Tempo</strong>
                    <small>Ohne Timer. Ohne Druck.</small>
                  </span>
                </div>
              </div>
              <section className="path-section">
                <div className="section-heading">
                  <div>
                    <h2>Dein Weg zu Vim</h2>
                    <p>Ein roter Faden durch eine neue Art zu arbeiten.</p>
                  </div>
                  <span>8 KAPITEL</span>
                </div>
                <div className="chapter-grid">
                  {chapters.map((chapter, i) => {
                    const items = lessons.filter((l) => l.chapter === i),
                      done = items.filter((l) =>
                        completed.includes(l.id),
                      ).length;
                    return (
                      <button
                        className={`chapter-card ${i === resume.chapter ? "current" : ""}`}
                        key={chapter.title}
                        onClick={() =>
                          openLesson(
                            items.find((l) => !completed.includes(l.id))?.id ||
                              items[0].id,
                          )
                        }
                      >
                        <div className="chapter-card-top">
                          <span className="chapter-icon">{chapter.icon}</span>
                          <span>{String(i + 1).padStart(2, "0")}</span>
                        </div>
                        <h3>{chapter.title}</h3>
                        <p>{chapter.description}</p>
                        <div className="chapter-card-bottom">
                          <span>
                            {items.length} Lektionen{" "}
                            {done > 0 ? `· ${done} erledigt` : ""}
                          </span>
                          {i === resume.chapter ? (
                            <span className="start-label">
                              {done ? "Weiterlernen" : "Hier starten"}{" "}
                              <ArrowRight size={14} />
                            </span>
                          ) : (
                            <ArrowRight size={17} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
              <section className="bottom-note">
                <span>💡</span>
                <div>
                  <strong>Du musst nicht alles auswendig können.</strong>
                  <p>Verstehe die Muster. Die Shortcuts kommen mit dem Üben.</p>
                </div>
                <button onClick={() => navigate("reference")}>
                  Nachschlagen <ArrowRight size={15} />
                </button>
              </section>
            </>
          )}
          {page === "course" && (
            <>
              <div className="course-heading">
                <div>
                  <div className="eyebrow">
                    KAPITEL {current.chapter + 1} / 8 ·{" "}
                    {chapters[current.chapter].title.toUpperCase()}
                  </div>
                  <h1>Ein Schritt nach dem anderen.</h1>
                  <p>
                    Lektion {index + 1} von {lessons.length} ·{" "}
                    {completed.length} abgeschlossen
                  </p>
                </div>
                <div className="lesson-switch">
                  <button
                    disabled={index === 0}
                    onClick={() => openLesson(lessons[index - 1].id)}
                    aria-label="Vorherige Lektion"
                  >
                    ←
                  </button>
                  <select
                    aria-label="Lektion auswählen"
                    value={lessonId}
                    onChange={(e) => openLesson(e.target.value)}
                  >
                    {chapters.map((c, i) => (
                      <optgroup label={c.title} key={c.title}>
                        {lessons
                          .filter((l) => l.chapter === i)
                          .map((l) => (
                            <option key={l.id} value={l.id}>
                              {completed.includes(l.id) ? "✓ " : ""}
                              {l.title}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                  <button
                    disabled={index === lessons.length - 1}
                    onClick={() => openLesson(lessons[index + 1].id)}
                    aria-label="Nächste Lektion"
                  >
                    →
                  </button>
                </div>
              </div>
              <Suspense
                fallback={
                  <div className="loading">Übungseditor wird geladen …</div>
                }
              >
                <Trainer
                  key={current.id}
                  lesson={current}
                  fontSize={progress.fontSize}
                  onComplete={markComplete}
                  nextLabel={
                    index === lessons.length - 1
                      ? "Zur Übersicht"
                      : "Nächste Übung"
                  }
                  onNext={() =>
                    index < lessons.length - 1
                      ? openLesson(lessons[index + 1].id)
                      : navigate("home")
                  }
                />
              </Suspense>
              <div className="course-tip">
                <span>DEIN LERNPFAD</span>
                {chapters.map((c, i) => (
                  <button
                    aria-label={c.title}
                    title={c.title}
                    className={i === current.chapter ? "active" : ""}
                    key={c.title}
                    onClick={() =>
                      openLesson(lessons.find((l) => l.chapter === i)!.id)
                    }
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </>
          )}
          {page === "reference" && (
            <>
              <div className="page-intro compact">
                <div className="eyebrow">
                  DIE RICHTIGE TASTE ZUR RICHTIGEN ZEIT
                </div>
                <h1>
                  Wissen zum <span>Nachschlagen.</span>
                </h1>
                <p>
                  Shortcuts, Denkmuster und kleine Hilfen für deinen Alltag.
                </p>
              </div>
              <div className="search-box">
                <Search size={19} />
                <input
                  aria-label="Nachschlagewerk durchsuchen"
                  placeholder="Shortcut, Thema oder Begriff suchen …"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="reference-tips">
                {practiceTips
                  .filter((t) => t.toLowerCase().includes(query.toLowerCase()))
                  .map((tip, i) => (
                    <div key={tip}>
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      <p>{tip}</p>
                    </div>
                  ))}
              </div>
              <div className="reference-grid">
                {lessons
                  .filter((l) =>
                    `${l.title} ${l.intro} ${l.keys.join(" ")} ${l.tip}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((l) => (
                    <article className="reference-card" key={l.id}>
                      <div>
                        <span className="eyebrow">
                          {l.lazy ? "LAZYVIM" : "VIM"}
                        </span>
                        <a
                          href={l.source}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Quelle: ${l.title}`}
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                      <h3>{l.title}</h3>
                      <div className="reference-keys">
                        <KeySequence keys={l.keys} />
                      </div>
                      <p>
                        <KeyText text={l.intro} />
                      </p>
                      <button onClick={() => openLesson(l.id)}>
                        In einer Übung lernen <ArrowRight size={14} />
                      </button>
                    </article>
                  ))}
              </div>
              {!lessons.some((l) =>
                `${l.title} ${l.intro} ${l.keys.join(" ")} ${l.tip}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              ) && (
                <p>
                  Keine passenden Lektionen. Versuche „Wort“, „Buffer“ oder
                  „Suche“.
                </p>
              )}
              <p className="reference-source">
                Grundlage: Neovim User Manual und LazyVim-Standard-Keymaps ·
                Geprüft am 12.10.2026. Eigene Mappings und Extras können
                abweichen.
              </p>
            </>
          )}
          {page === "playground" && (
            <>
              <div className="page-intro compact">
                <div className="eyebrow">PLATZ FÜR DEINE AHA-MOMENTE</div>
                <h1>
                  Einfach <span>ausprobieren.</span>
                </h1>
                <p>
                  Kein Lernziel, keine Bewertung. Nur du, der Editor und ein
                  paar Tasten.
                </p>
              </div>
              <Suspense
                fallback={
                  <div className="loading">Übungseditor wird geladen …</div>
                }
              >
                <Trainer
                  lesson={sandbox}
                  fontSize={progress.fontSize}
                  onComplete={() => {}}
                  onNext={() => {}}
                  free
                />
              </Suspense>
            </>
          )}
        </main>
        <footer>
          <span>
            <Terminal size={13} /> nvim to you
          </span>
          <span>Mit Ruhe lernen. Mit Flow arbeiten.</span>
          <a href="https://www.lazyvim.org" target="_blank" rel="noreferrer">
            LazyVim-Dokumentation ↗
          </a>
        </footer>
      </div>
    </div>
  );
}
