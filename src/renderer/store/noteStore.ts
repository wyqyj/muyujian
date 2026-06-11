import { create } from 'zustand';

export type NoteType = 'note' | 'todo';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  deadline?: number;
  isTodayPlan: boolean;
  noteType: NoteType;
  isArchived: boolean;
  isPinned?: boolean;
  pinnedInTags?: string[];
  isDeleted?: boolean;
  deletedAt?: number;
}

interface NoteStore {
  notes: Note[];
  activeNoteId: string | null;
  loaded: boolean;

  setNotes: (notes: Note[]) => void;
  addNote: (note: Note) => void;
  updateContent: (id: string, content: string) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  restoreNote: (id: string) => void;
  permanentDelete: (id: string) => void;
  emptyTrash: () => void;
  archiveNote: (id: string) => void;
  togglePin: (id: string) => void;
  togglePinInTag: (id: string, tag: string) => void;
  setActiveNoteId: (id: string | null) => void;
  loadNotes: () => Promise<void>;
  getTodoNotes: () => Note[];
  getTodayPlanNotes: () => Note[];
  selectNote: (id: string) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let lastSavedJson = '';
let reloading = false;
function saveToDisk(notes: Note[]): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (reloading) return;
    const json = JSON.stringify(notes, null, 2);
    if (json === lastSavedJson) return;
    lastSavedJson = json;
    if (window.electronAPI) {
      window.electronAPI.saveNotes(json);
    } else {
      try { localStorage.setItem('lingxi-notes', json); } catch {}
    }
  }, 300);
}

export function validateNotes(data: any[]): Note[] {
  if (!Array.isArray(data)) return [];
  return data.filter((n): n is Note =>
    n && typeof n.id === 'string' && typeof n.title === 'string' && typeof n.content === 'string'
  );
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  activeNoteId: null,
  loaded: false,

  loadNotes: async () => {
    let notes: Note[] = [];
    if (window.electronAPI) {
      try {
        const data = await window.electronAPI.getNotes();
        const parsed = JSON.parse(data);
        notes = validateNotes(parsed);
      } catch { notes = []; }
    } else {
      try {
        const data = localStorage.getItem('lingxi-notes');
        notes = data ? validateNotes(JSON.parse(data)) : [];
      } catch { notes = []; }
    }
    // 自动迁移：isTodayPlan → noteType
    let migrated = false;
    notes = notes.map(n => {
      if (n.isTodayPlan && !n.noteType) {
        migrated = true;
        return { ...n, noteType: 'todo' as const };
      }
      if (!n.noteType) {
        return { ...n, noteType: 'note' as const };
      }
      return n;
    });
    if (migrated) {
      lastSavedJson = JSON.stringify(notes, null, 2);
      if (window.electronAPI) window.electronAPI.saveNotes(lastSavedJson);
    } else {
      lastSavedJson = JSON.stringify(notes, null, 2);
    }
    set({ notes, loaded: true });
  },

  setNotes: (notes) => { set({ notes }); saveToDisk(notes); },

  addNote: (note) => {
    const updated = [note, ...get().notes];
    set({ notes: updated });
    saveToDisk(updated);
  },

  updateContent: (id, content) => {
    const notes = get().notes;
    const idx = notes.findIndex((n) => n.id === id);
    if (idx === -1) return;
    const note = notes[idx];
    if (note.content === content) return;
    const updated = [...notes];
    updated[idx] = { ...note, content, updatedAt: Date.now() };
    set({ notes: updated });
    saveToDisk(updated);
  },

  updateNote: (id, updates) => {
    const updated = get().notes.map((n) => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n);
    set({ notes: updated });
    saveToDisk(updated);
  },

  deleteNote: (id) => {
    get().updateNote(id, { isDeleted: true, deletedAt: Date.now() });
    if (get().activeNoteId === id) set({ activeNoteId: null });
  },

  restoreNote: (id) => {
    get().updateNote(id, { isDeleted: false, deletedAt: undefined });
  },

  permanentDelete: (id) => {
    const updated = get().notes.filter((n) => n.id !== id);
    set({ notes: updated, activeNoteId: get().activeNoteId === id ? null : get().activeNoteId });
    saveToDisk(updated);
  },

  emptyTrash: () => {
    const updated = get().notes.filter((n) => !n.isDeleted);
    set({ notes: updated, activeNoteId: null });
    saveToDisk(updated);
  },

  archiveNote: (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (note) get().updateNote(id, { isArchived: !note.isArchived });
  },

  togglePin: (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    const newPinned = !note.isPinned;
    get().updateNote(id, { isPinned: newPinned });
  },

  togglePinInTag: (id, tag) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    const current = note.pinnedInTags || [];
    const next = current.includes(tag)
      ? current.filter(t => t !== tag)
      : [...current, tag];
    get().updateNote(id, { pinnedInTags: next });
  },

  setActiveNoteId: (id) => set({ activeNoteId: id }),

  getTodoNotes: () => get().notes.filter((n) => (n.noteType === 'todo' || n.isTodayPlan) && !n.isArchived),

  getTodayPlanNotes: () => get().notes.filter((n) => (n.noteType === 'todo' || n.isTodayPlan) && !n.isArchived),

  selectNote: (id) => {
    const exists = get().notes.some((n) => n.id === id);
    if (exists) set({ activeNoteId: id });
  },
}));

export function registerReloadListener(): void {
  if (!window.electronAPI?.onReloadNotes) return;
  window.electronAPI.onReloadNotes(async () => {
    if (!window.electronAPI) return;
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    reloading = true;
    try {
      const data = await window.electronAPI.getNotes();
      const notes = validateNotes(JSON.parse(data));
      lastSavedJson = JSON.stringify(notes, null, 2);
      useNoteStore.setState({ notes });
    } catch {} finally {
      reloading = false;
    }
  });
}
