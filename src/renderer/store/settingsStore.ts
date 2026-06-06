import { create } from 'zustand';
import { TextMode, texts, Texts } from '../utils/i18n';

interface Settings {
  theme: 'light' | 'dark';
  textMode: TextMode;
  quickNoteShortcut: string;
  autoSaveInterval: number;
}

interface SettingsStore {
  settings: Settings;
  t: Texts;
  updateSettings: (updates: Partial<Settings>) => void;
  toggleTheme: () => void;
  toggleTextMode: () => void;
}

function loadSettings(): Settings {
  try {
    const data = localStorage.getItem('lingxi-settings');
    const parsed = data ? JSON.parse(data) : {};
    return {
      theme: parsed.theme || 'light',
      textMode: parsed.textMode || 'modern',
      quickNoteShortcut: parsed.quickNoteShortcut || 'Alt+Q',
      autoSaveInterval: parsed.autoSaveInterval || 60,
    };
  } catch {
    return { theme: 'light', textMode: 'modern', quickNoteShortcut: 'Alt+Q', autoSaveInterval: 60 };
  }
}

function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem('lingxi-settings', JSON.stringify(settings));
  } catch (err) {
    console.error('保存设置失败:', err);
  }
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: loadSettings(),
  t: texts[loadSettings().textMode] || texts.modern,

  updateSettings: (updates) => {
    const prev = get().settings;
    const updated = { ...prev, ...updates };
    set({ settings: updated, t: texts[updated.textMode] || texts.modern });
    saveSettings(updated);
    if (window.electronAPI) {
      window.electronAPI.saveSettings(updated);
      if (updated.theme !== prev.theme) {
        window.electronAPI.updateTheme(updated.theme);
      }
    }
  },

  toggleTheme: () => {
    const current = get().settings.theme;
    get().updateSettings({ theme: current === 'light' ? 'dark' : 'light' });
  },

  toggleTextMode: () => {
    const current = get().settings.textMode;
    get().updateSettings({ textMode: current === 'modern' ? 'classical' : 'modern' });
  },
}));
