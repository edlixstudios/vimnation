export type Progress = {
  version: 1;
  completed: string[];
  lastLesson: string;
  fontSize: number;
};
export const defaultProgress: Progress = {
  version: 1,
  completed: [],
  lastLesson: "modes",
  fontSize: 16,
};
export const STORAGE_KEY = "nvim-to-you.progress.v1";
export function loadProgress(storage: Pick<Storage, "getItem">): Progress {
  try {
    const p = JSON.parse(storage.getItem(STORAGE_KEY) || "null");
    if (p?.version !== 1 || !Array.isArray(p.completed))
      return { ...defaultProgress };
    return {
      version: 1,
      completed: [
        ...new Set<string>(
          p.completed.filter((x: unknown) => typeof x === "string"),
        ),
      ],
      lastLesson: typeof p.lastLesson === "string" ? p.lastLesson : "modes",
      fontSize: [14, 16, 18].includes(p.fontSize) ? p.fontSize : 16,
    };
  } catch {
    return { ...defaultProgress };
  }
}
export function saveProgress(
  storage: Pick<Storage, "setItem">,
  p: Progress,
): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}
