export const files: Record<string, string> = {
  "index.ts":
    'import { greet } from "./utils";\nconst answer = 42;\nconsole.log(answer);\ngreet("Vim");',
  "utils.ts":
    "export function greet(name: string) {\n  return `Hallo ${name}!`;\n}",
  "README.md": "# hello-neovim\n\nEin Projekt zum Entdecken von LazyVim.",
  "keymaps.lua":
    '-- lua/config/keymaps.lua\n-- Eigene Mappings ergänzen die LazyVim-Defaults.\nvim.keymap.set("n", "<leader>hw", "<cmd>echo \'Hallo\'<cr>")',
};
export type SimCommand =
  | "files"
  | "config"
  | "buffers"
  | "explorer"
  | "split"
  | "split-below"
  | "grep"
  | "definition"
  | "hover"
  | "rename"
  | "diagnostic"
  | "format"
  | "git"
  | "next-buffer"
  | "prev-buffer";
export const mappings: Record<string, { label: string; command: SimCommand }> =
  {
    ff: { label: "Dateien finden", command: "files" },
    fc: { label: "Konfiguration finden", command: "config" },
    " ": { label: "Dateien finden", command: "files" },
    e: { label: "Explorer", command: "explorer" },
    ",": { label: "Buffer auswählen", command: "buffers" },
    "|": { label: "Rechts teilen", command: "split" },
    "-": { label: "Unten teilen", command: "split-below" },
    "/": { label: "Projekt durchsuchen", command: "grep" },
    cr: { label: "Symbol umbenennen", command: "rename" },
    cd: { label: "Diagnose anzeigen", command: "diagnostic" },
    cf: { label: "Formatieren", command: "format" },
    gg: { label: "LazyGit öffnen", command: "git" },
  };
export function matchingMappings(prefix: string) {
  return Object.entries(mappings).filter(([key]) => key.startsWith(prefix));
}
export function filterFiles(query: string, config = false, buffers = false) {
  return Object.keys(files)
    .filter((f) =>
      config
        ? f.endsWith(".lua")
        : buffers
          ? ["index.ts", "utils.ts"].includes(f)
          : !f.endsWith(".lua"),
    )
    .filter((f) => f.toLowerCase().includes(query.toLowerCase()));
}
export function searchProject(query: string) {
  if (!query.trim()) return [];
  return Object.entries(files)
    .filter(([name]) => !name.endsWith(".lua"))
    .flatMap(([name, text]) =>
      text
        .split("\n")
        .flatMap((line, index) =>
          line.toLowerCase().includes(query.toLowerCase())
            ? [`${name}:${index + 1} · ${line}`]
            : [],
        ),
    );
}
