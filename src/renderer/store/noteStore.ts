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
  loadNotes: () => Promise<void>;
  getTodayPlanNotes: () => Note[];
  selectNote: (id: string) => void;
}

// 防抖保存（带脏检查，防止 reload→save 循环）
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let lastSavedJson = '';
let reloading = false;
function saveToDisk(notes: Note[]): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (reloading) return; // 正在从磁盘重载，跳过保存防止覆盖
    const json = JSON.stringify(notes, null, 2);
    if (json === lastSavedJson) return; // 数据未变化，跳过保存
    lastSavedJson = json;
    if (window.electronAPI) {
      window.electronAPI.saveNotes(json);
    } else {
      try { localStorage.setItem('lingxi-notes', json); } catch {}
    }
  }, 300);
}

/** 校验笔记数据结构 */
export function validateNotes(data: any[]): Note[] {
  if (!Array.isArray(data)) return [];
  return data.filter((n): n is Note =>
    n && typeof n.id === 'string' && typeof n.title === 'string' && typeof n.content === 'string'
  );
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  activeNoteId: null,
  searchQuery: '',
  filterTag: null,
  showTodayPlan: false,
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
    lastSavedJson = JSON.stringify(notes, null, 2);
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

  getTodayPlanNotes: () => get().notes.filter((n) => n.isTodayPlan && !n.isArchived),

  selectNote: (id) => {
    const exists = get().notes.some((n) => n.id === id);
    if (exists) set({ activeNoteId: id, showTodayPlan: false });
  },
}));

// 注册跨窗口笔记重载监听（延迟注册，避免被 Vite tree-shake）
export function registerReloadListener(): void {
  if (!window.electronAPI?.onReloadNotes) return;
  window.electronAPI.onReloadNotes(async () => {
    if (!window.electronAPI) return;
    // 取消待保存操作，防止覆盖从其他窗口写入的数据
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
