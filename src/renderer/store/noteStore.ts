import { create } from 'zustand';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  deadline?: number;
  isTodayPlan: boolean;
  isArchived: boolean;
}

interface NoteStore {
  notes: Note[];
  activeNoteId: string | null;
  searchQuery: string;
  filterTag: string | null;
  showTodayPlan: boolean;
  showArchived: boolean;
  loaded: boolean;

  setNotes: (notes: Note[]) => void;
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  archiveNote: (id: string) => void;
  setActiveNoteId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFilterTag: (tag: string | null) => void;
  setShowTodayPlan: (show: boolean) => void;
  setShowArchived: (show: boolean) => void;
  loadNotes: () => Promise<void>;
  getFilteredNotes: () => Note[];
  getTodayPlanNotes: () => Note[];
}

// 保存到主进程（文件）
function saveToDisk(notes: Note[]): void {
  if (window.electronAPI) {
    window.electronAPI.saveNotes(JSON.stringify(notes, null, 2));
  } else {
    // 开发环境 fallback
    try { localStorage.setItem('lingxi-notes', JSON.stringify(notes)); } catch {}
  }
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  activeNoteId: null,
  searchQuery: '',
  filterTag: null,
  showTodayPlan: false,
  showArchived: false,
  loaded: false,

  loadNotes: async () => {
    let notes: Note[] = [];
    if (window.electronAPI) {
      try {
        const data = await window.electronAPI.getNotes();
        notes = JSON.parse(data);
      } catch { notes = []; }
    } else {
      try {
        const data = localStorage.getItem('lingxi-notes');
        notes = data ? JSON.parse(data) : [];
      } catch { notes = []; }
    }
    set({ notes, loaded: true });
  },

  setNotes: (notes) => { set({ notes }); saveToDisk(notes); },

  addNote: (note) => {
    const updated = [note, ...get().notes];
    set({ notes: updated });
    saveToDisk(updated);
  },

  updateNote: (id, updates) => {
    const updated = get().notes.map((n) => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n);
    set({ notes: updated });
    saveToDisk(updated);
  },

  deleteNote: (id) => {
    const updated = get().notes.filter((n) => n.id !== id);
    set({ notes: updated, activeNoteId: get().activeNoteId === id ? null : get().activeNoteId });
    saveToDisk(updated);
  },

  archiveNote: (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (note) get().updateNote(id, { isArchived: !note.isArchived });
  },

  setActiveNoteId: (id) => set({ activeNoteId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterTag: (tag) => set({ filterTag: tag }),
  setShowTodayPlan: (show) => set({ showTodayPlan: show }),
  setShowArchived: (show) => set({ showArchived: show }),

  getFilteredNotes: () => {
    const { notes, searchQuery, filterTag, showArchived } = get();
    return notes.filter((note) => {
      if (note.isArchived !== showArchived) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!note.title.toLowerCase().includes(q) && !note.content.toLowerCase().includes(q)) return false;
      }
      if (filterTag && !note.tags.includes(filterTag)) return false;
      return true;
    });
  },

  getTodayPlanNotes: () => get().notes.filter((n) => n.isTodayPlan && !n.isArchived),
}));
