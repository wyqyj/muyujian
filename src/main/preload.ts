import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // 快速笔记
  getQuickNote: () => ipcRenderer.invoke('get-quick-note'),
  saveQuickNote: (content: string) => ipcRenderer.send('save-quick-note', content),
  // 设置
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: Record<string, unknown>) => ipcRenderer.send('save-settings', settings),
  // 主题同步
  updateTheme: (theme: string) => ipcRenderer.send('update-theme', theme),
  // 主窗口控制
  winMinimize: () => ipcRenderer.send('win-minimize'),
  winMaximize: () => ipcRenderer.send('win-maximize'),
  winClose: () => ipcRenderer.send('win-close'),
  winIsMaximized: () => ipcRenderer.invoke('win-is-maximized'),
  // 窗口控制
  toggleQuickNote: () => ipcRenderer.send('toggle-quick-note'),
  closeQuickNote: () => ipcRenderer.send('close-quick-note'),
  minimizeQuickNote: () => ipcRenderer.send('minimize-quick-note'),
  toggleTodayPlanWindow: () => ipcRenderer.send('toggle-today-plan-window'),
  closeTodayPlanWindow: () => ipcRenderer.send('close-today-plan-window'),
  minimizeTodayPlanWindow: () => ipcRenderer.send('minimize-today-plan-window'),
  // 便签数据
  getNotes: () => ipcRenderer.invoke('get-notes'),
  saveNotes: (notes: string) => ipcRenderer.send('save-notes', notes),
  getDataPath: () => ipcRenderer.invoke('get-data-path'),
  // 数据导入导出
  exportData: () => ipcRenderer.invoke('export-data'),
  importData: (data: string) => ipcRenderer.send('import-data', data),
  // 导出为文档
  exportPdf: (title: string, html: string) => ipcRenderer.invoke('export-pdf', title, html),
  exportWord: (title: string, html: string) => ipcRenderer.invoke('export-word', title, html),
});
