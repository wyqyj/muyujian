/// <reference types="vite/client" />

interface ElectronAPI {
  getQuickNote: () => Promise<string>;
  saveQuickNote: (content: string) => void;
  getSettings: () => Promise<Record<string, unknown>>;
  saveSettings: (settings: Record<string, unknown>) => void;
  toggleQuickNote: () => void;
  closeQuickNote: () => void;
  minimizeQuickNote: () => void;
  toggleTodayPlanWindow: () => void;
  closeTodayPlanWindow: () => void;
  minimizeTodayPlanWindow: () => void;
  getNotes: () => Promise<string>;
  saveNotes: (notes: string) => void;
  getDataPath: () => Promise<string>;
  exportData: () => Promise<string>;
  importData: (data: string) => void;
  exportPdf: (title: string, html: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  exportWord: (title: string, html: string) => Promise<{ success: boolean; path?: string; error?: string }>;
}

interface Window {
  electronAPI?: ElectronAPI;
}
