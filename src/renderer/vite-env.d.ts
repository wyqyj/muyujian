/// <reference types="vite/client" />

interface ElectronAPI {
  getQuickNote: () => Promise<string>;
  saveQuickNote: (content: string) => void;
  getSettings: () => Promise<Record<string, unknown>>;
  saveSettings: (settings: Record<string, unknown>) => void;
  updateTheme: (theme: string) => void;
  winMinimize: () => void;
  winMaximize: () => void;
  winClose: () => void;
  winIsMaximized: () => Promise<boolean>;
  toggleQuickNote: () => void;
  closeQuickNote: () => void;
  minimizeQuickNote: () => void;
  toggleTodayPlanWindow: () => void;
  closeTodayPlanWindow: () => void;
  minimizeTodayPlanWindow: () => void;
  setOpacity: (opacity: number) => void;
  getOpacity: () => Promise<number>;
  getNotes: () => Promise<string>;
  saveNotes: (notes: string) => Promise<{ success: boolean }>;
  createQuickNote: (noteJson: string) => Promise<{ success: boolean; noteId?: string; error?: string }>;
  updateQuickNoteContent: (noteId: string, content: string) => Promise<{ success: boolean; error?: string }>;
  updateQuickNote: (noteId: string, updates: string) => Promise<{ success: boolean; error?: string }>;
  getDataPath: () => Promise<string>;
  onReloadNotes: (callback: () => void) => void;
  onSaveBeforeClose: (callback: () => void) => void;
  onNewNote: (callback: () => void) => void;
  onExportData: (callback: () => void) => void;
  onImportData: (callback: () => void) => void;
  exportData: () => Promise<string>;
  importData: (data: string) => void;
  exportWord: (title: string, content: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  exportPdf: (title: string, content: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  pandocCompile: (source: string, fromFormat?: string) => Promise<{ success: boolean; html?: string; error?: string }>;
  reloadNotesFromDisk: () => void;
  selectNote: (noteId: string) => void;
  onSelectNote: (callback: (noteId: string) => void) => void;
}

interface Window {
  electronAPI?: ElectronAPI;
  MathJax?: { typesetPromise?: (elements?: Element[]) => Promise<void> };
}
