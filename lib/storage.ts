import type { Storyboard } from "../remotion/schema";

const KEY = "motion-saas:storyboards";

export type SavedBoard = {
  id: string;
  name: string;
  createdAt: number;
  storyboard: Storyboard;
};

const safeRead = (): SavedBoard[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const safeWrite = (boards: SavedBoard[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(boards));
  } catch {
    // quota exceeded or disabled — silently no-op
  }
};

const generateId = () =>
  `sb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const deriveName = (storyboard: Storyboard): string => {
  const first = storyboard.scenes[0];
  if (first?.type === "kineticTitle") {
    return `${storyboard.brand.name} — ${first.lines.join(" ")}`.slice(0, 60);
  }
  if (first?.type === "productDemo" && first.caption) {
    return `${storyboard.brand.name} — ${first.caption}`.slice(0, 60);
  }
  return `${storyboard.brand.name} — ${new Date().toLocaleDateString()}`;
};

export const listBoards = (): SavedBoard[] =>
  safeRead().sort((a, b) => b.createdAt - a.createdAt);

export const saveBoard = (
  storyboard: Storyboard,
  customName?: string,
): SavedBoard => {
  const boards = safeRead();
  const board: SavedBoard = {
    id: generateId(),
    name: customName?.trim() || deriveName(storyboard),
    createdAt: Date.now(),
    storyboard,
  };
  safeWrite([board, ...boards]);
  return board;
};

export const deleteBoard = (id: string) => {
  safeWrite(safeRead().filter((b) => b.id !== id));
};

export const renameBoard = (id: string, name: string) => {
  const boards = safeRead();
  const idx = boards.findIndex((b) => b.id === id);
  if (idx === -1) return;
  boards[idx] = { ...boards[idx], name: name.trim() || boards[idx].name };
  safeWrite(boards);
};
