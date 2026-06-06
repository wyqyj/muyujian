import { app, BrowserWindow, globalShortcut, ipcMain, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Store from 'electron-store';

// 数据目录
const dataDir = path.join(app.isPackaged ? path.dirname(app.getPath('exe')) : __dirname, '..', 'data');
try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}

interface AppStore {
  quickNote: string;
  settings: { theme: 'light' | 'dark'; textMode: string; quickNoteShortcut: string; autoSaveInterval: number; dataPath: string; };
  windowBounds?: { x: number; y: number; width: number; height: number };
  quickNoteBounds?: { x: number; y: number; width: number; height: number };
  todayPlanBounds?: { x: number; y: number; width: number; height: number };
  initialized?: boolean;
}

const store = new Store<AppStore>({
  cwd: dataDir,
  defaults: {
    quickNote: '',
    settings: { theme: 'light', textMode: 'modern', quickNoteShortcut: 'Alt+Q', autoSaveInterval: 60, dataPath: dataDir },
    initialized: false,
  },
});

function createWelcomeNote(): void {
  try {
    if (store.get('initialized')) return;
    store.set('initialized', true);
    const note = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), title: '欢迎使用暮雨笺',
      content: `# 暮雨笺 · 功能介绍\n\n暮雨笺是一款融合记事本、时间计划与快速随笔记的桌面应用，支持 Markdown 和 LaTeX 实时渲染。\n\n## 📝 便签管理\n- **新建便签**：点击侧边栏「新建便签」按钮创建\n- **搜索**：顶部搜索框按标题和内容模糊搜索\n- **标签**：为便签添加标签，点击标签筛选过滤\n- **归档**：便签操作栏中点击归档按钮\n- **截止日期**：设置截止日期后显示实时倒计时，超期标红\n- **今日计划**：点击 ☆ 将便签标记为今日计划\n\n## ✏️ 编辑器\n- **Markdown 编辑器**：CodeMirror 6 语法高亮 + 实时预览\n- **快捷键**：\`Ctrl+B\` 加粗、\`Ctrl+I\` 斜体、\`Ctrl+K\` 链接\n- **图片插入**：工具栏按钮选择、粘贴图片、拖拽图片\n- **LaTeX 公式**：行内 \`$...$\` 和块级 \`$$...$$\`\n- **代码块**：支持多语言语法高亮\n\n## ☀️ 今日计划\n- 在便签上点击 ☆ 标记为今日计划\n- 侧边栏点击今日计划查看聚合视图\n- 支持「悬浮窗口查看」，始终置顶\n- 每个任务可直接点击「完成」或「全部完成」\n- 在今日计划中可直接添加新任务\n\n## ⚡ 快速笔记（随笔记）\n- \`Alt+Q\` 呼出悬浮小窗口\n- 关闭时内容自动保存为便签（标签：随笔记）\n- 支持编辑/预览/分栏三种模式\n\n## 🎨 界面\n- 浅色/深色主题切换（顶栏月亮图标）\n- 简体中文/古风文字切换（顶栏按钮）\n- 预览面板可手动显示/隐藏（\`Ctrl+Shift+P\`）\n\n## ⏰ 倒计时\n- 设置截止日期后实时显示天/时/分/秒倒计时\n- 超期自动标红\n- 今日计划和悬浮窗口中同步显示\n\n---\n> 💡 提示：所有数据存储在安装目录的 \`data\` 文件夹中，可随时备份。`,
      tags: ['说明'], createdAt: Date.now(), updatedAt: Date.now(), isTodayPlan: false, isArchived: false };
    const notesPath = path.join(dataDir, 'notes.json');
    let notes: any[] = [];
    try { if (fs.existsSync(notesPath)) notes = JSON.parse(fs.readFileSync(notesPath, 'utf-8')); } catch {}
    notes.unshift(note);
    fs.writeFileSync(notesPath, JSON.stringify(notes, null, 2), 'utf-8');
  } catch (err) { console.error('创建欢迎便签失败:', err); }
}

let mainWindow: BrowserWindow | null = null;
let quickNoteWindow: BrowserWindow | null = null;
let todayPlanWindow: BrowserWindow | null = null;

function createMainWindow(): void {
  const savedBounds = store.get('windowBounds') as any;
  mainWindow = new BrowserWindow({
    width: savedBounds?.width || 1200, height: savedBounds?.height || 800,
    x: savedBounds?.x, y: savedBounds?.y,
    minWidth: 900, minHeight: 600, title: '暮雨笺',
    frame: false,
    backgroundColor: store.get('settings.theme') === 'dark' ? '#030712' : '#ffffff',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
    show: false,
  });
  const rendererPath = path.join(__dirname, '../renderer/index.html');
  if (fs.existsSync(rendererPath)) mainWindow.loadFile(rendererPath);
  else mainWindow.loadURL('http://localhost:5173');
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('close', () => { if (mainWindow) store.set('windowBounds', mainWindow.getBounds()); });
  mainWindow.on('closed', () => { mainWindow = null; });
}

function createQuickNoteWindow(): void {
  if (quickNoteWindow) { quickNoteWindow.show(); quickNoteWindow.focus(); return; }
  const savedBounds = store.get('quickNoteBounds') as any;
  quickNoteWindow = new BrowserWindow({
    width: savedBounds?.width || 450, height: savedBounds?.height || 500,
    x: savedBounds?.x, y: savedBounds?.y,
    minWidth: 300, minHeight: 200,
    frame: false, alwaysOnTop: true, resizable: true, movable: true, skipTaskbar: true,
    title: '暮雨笺 · 速记',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
    show: false,
  });
  const rendererPath = path.join(__dirname, '../renderer/index.html');
  if (fs.existsSync(rendererPath)) quickNoteWindow.loadFile(rendererPath, { hash: '/quick-note' });
  else quickNoteWindow.loadURL('http://localhost:5173#/quick-note');
  quickNoteWindow.once('ready-to-show', () => quickNoteWindow?.show());
  quickNoteWindow.on('close', () => { if (quickNoteWindow) store.set('quickNoteBounds', quickNoteWindow.getBounds()); });
  quickNoteWindow.on('closed', () => { quickNoteWindow = null; });
}

function createTodayPlanWindow(): void {
  if (todayPlanWindow) { todayPlanWindow.show(); todayPlanWindow.focus(); return; }
  const savedBounds = store.get('todayPlanBounds') as any;
  todayPlanWindow = new BrowserWindow({
    width: savedBounds?.width || 420, height: savedBounds?.height || 600,
    x: savedBounds?.x, y: savedBounds?.y,
    minWidth: 320, minHeight: 300,
    frame: false, alwaysOnTop: true, resizable: true, movable: true,
    title: '暮雨笺 · 今日计划',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
    show: false,
  });
  const rendererPath = path.join(__dirname, '../renderer/index.html');
  if (fs.existsSync(rendererPath)) todayPlanWindow.loadFile(rendererPath, { hash: '/today-plan' });
  else todayPlanWindow.loadURL('http://localhost:5173#/today-plan');
  todayPlanWindow.once('ready-to-show', () => todayPlanWindow?.show());
  todayPlanWindow.on('close', () => { if (todayPlanWindow) store.set('todayPlanBounds', todayPlanWindow.getBounds()); });
  todayPlanWindow.on('closed', () => { todayPlanWindow = null; });
}

function toggleQuickNoteWindow(): void {
  if (quickNoteWindow) { if (quickNoteWindow.isVisible()) quickNoteWindow.hide(); else { quickNoteWindow.show(); quickNoteWindow.focus(); } }
  else createQuickNoteWindow();
}

function registerShortcuts(): void {
  try { globalShortcut.register(store.get('settings.quickNoteShortcut') as string, toggleQuickNoteWindow); } catch {}
}

function setupIPC(): void {
  ipcMain.handle('get-quick-note', () => store.get('quickNote', ''));
  ipcMain.on('save-quick-note', (_e: any, c: string) => store.set('quickNote', c));
  ipcMain.handle('get-settings', () => store.get('settings'));
  ipcMain.on('save-settings', (_e: any, s: any) => { store.set('settings', s); globalShortcut.unregisterAll(); registerShortcuts(); });
  ipcMain.on('update-theme', (_e: any, theme: string) => {
    const color = theme === 'dark' ? '#030712' : '#ffffff';
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setBackgroundColor(color);
    if (quickNoteWindow && !quickNoteWindow.isDestroyed()) quickNoteWindow.setBackgroundColor(color);
    if (todayPlanWindow && !todayPlanWindow.isDestroyed()) todayPlanWindow.setBackgroundColor(color);
  });
  ipcMain.on('win-minimize', () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize(); });
  ipcMain.on('win-maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize();
    }
  });
  ipcMain.on('win-close', () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close(); });
  ipcMain.handle('win-is-maximized', () => mainWindow && !mainWindow.isDestroyed() ? mainWindow.isMaximized() : false);
  ipcMain.on('toggle-quick-note', toggleQuickNoteWindow);
  ipcMain.on('close-quick-note', () => quickNoteWindow?.hide());
  ipcMain.on('minimize-quick-note', () => quickNoteWindow?.minimize());
  ipcMain.on('toggle-today-plan-window', createTodayPlanWindow);
  ipcMain.on('close-today-plan-window', () => todayPlanWindow?.close());
  ipcMain.on('minimize-today-plan-window', () => todayPlanWindow?.minimize());
  const notesPath = path.join(dataDir, 'notes.json');
  ipcMain.handle('get-notes', () => { try { return fs.existsSync(notesPath) ? fs.readFileSync(notesPath, 'utf-8') : '[]'; } catch { return '[]'; } });
  ipcMain.on('save-notes', (_e: any, n: string) => { try { fs.writeFileSync(notesPath, n, 'utf-8'); } catch {} });
  ipcMain.handle('get-data-path', () => dataDir);
  ipcMain.handle('export-data', () => JSON.stringify(store.store, null, 2));
  ipcMain.on('import-data', (_e: any, d: string) => { try { const p = JSON.parse(d); Object.keys(p).forEach(k => store.set(k, p[k])); } catch {} });
  ipcMain.handle('export-pdf', async (_e: any, title: string, html: string) => {
    const { dialog } = require('electron');
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return { success: false, error: 'no window' };
    const result = await dialog.showSaveDialog(win, { title: '导出为 PDF', defaultPath: `${title}.pdf`, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (result.canceled || !result.filePath) return { success: false, error: 'cancelled' };
    try {
      const printWin = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true } });
      await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:'Segoe UI','Microsoft YaHei',sans-serif;padding:40px;max-width:800px;margin:0 auto;color:#333;line-height:1.8}h1{font-size:24px;border-bottom:2px solid #6366f1;padding-bottom:8px}h2{font-size:20px;color:#4338ca}h3{font-size:16px;color:#4f46e5}code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:13px}pre{background:#f1f5f9;padding:14px;border-radius:8px;overflow-x:auto;border:1px solid #e2e8f0}pre code{background:none;padding:0}blockquote{border-left:4px solid #a5b4fc;padding-left:16px;color:#6b7280;font-style:italic}table{border-collapse:collapse;width:100%}th,td{border:1px solid #e2e8f0;padding:8px 12px}th{background:#f1f5f9}img{max-width:100%}ul,ol{padding-left:24px}</style></head><body>${html}</body></html>`)}`);
      const pdfData = await printWin.webContents.printToPDF({ printBackground: true, pageSize: 'A4', margins: { top: 20, bottom: 20, left: 20, right: 20 } });
      printWin.destroy();
      fs.writeFileSync(result.filePath, pdfData);
      return { success: true, path: result.filePath };
    } catch (err: any) { return { success: false, error: err.message }; }
  });
  ipcMain.handle('export-word', async (_e: any, title: string, html: string) => {
    const { dialog } = require('electron');
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return { success: false, error: 'no window' };
    const result = await dialog.showSaveDialog(win, { title: '导出为 Word', defaultPath: `${title}.docx`, filters: [{ name: 'Word', extensions: ['docx'] }] });
    if (result.canceled || !result.filePath) return { success: false, error: 'cancelled' };
    try {
      const HTMLToDOCX = (await import('html-to-docx')).default;
      const buffer = await HTMLToDOCX(`<html><head><style>body{font-family:'Segoe UI','Microsoft YaHei',sans-serif;color:#333;line-height:1.8}h1{font-size:24px;border-bottom:2px solid #6366f1;padding-bottom:8px}h2{font-size:20px;color:#4338ca}code{background:#f1f5f9;padding:2px 6px;font-size:13px}pre{background:#f1f5f9;padding:14px}blockquote{border-left:4px solid #a5b4fc;padding-left:16px;color:#6b7280}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px 12px}th{background:#f1f5f9}img{max-width:100%}</style></head><body>${html}</body></html>`, null, { table: { row: { cantSplit: true } }, footer: true, pageNumber: true });
      fs.writeFileSync(result.filePath, buffer);
      return { success: true, path: result.filePath };
    } catch (err: any) { return { success: false, error: err.message }; }
  });
}

function createMenu(): void {
  const isMac = process.platform === 'darwin';
  const sep = { type: 'separator' as const };
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(isMac ? [{ role: 'appMenu' as const, label: '暮雨笺' }] : []),
    { label: '文件', submenu: [
      { label: '新建便签', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('new-note') },
      sep,
      { label: '导出数据', click: () => mainWindow?.webContents.send('export-data') },
      { label: '导入数据', click: () => mainWindow?.webContents.send('import-data') },
      sep,
      isMac ? { role: 'close' as const, label: '关闭窗口' } : { role: 'quit' as const, label: '退出' },
    ]},
    { label: '编辑', submenu: [
      { role: 'undo' as const, label: '撤销' }, { role: 'redo' as const, label: '重做' }, sep,
      { role: 'cut' as const, label: '剪切' }, { role: 'copy' as const, label: '复制' }, { role: 'paste' as const, label: '粘贴' }, { role: 'selectAll' as const, label: '全选' },
    ]},
    { label: '视图', submenu: [
      { role: 'reload' as const, label: '重新加载' }, { role: 'forceReload' as const, label: '强制重新加载' }, { role: 'toggleDevTools' as const, label: '开发者工具' }, sep,
      { role: 'resetZoom' as const, label: '重置缩放' }, { role: 'zoomIn' as const, label: '放大' }, { role: 'zoomOut' as const, label: '缩小' }, sep,
      { role: 'togglefullscreen' as const, label: '全屏' },
    ]},
    { label: '窗口', submenu: [
      { role: 'minimize' as const, label: '最小化' }, { role: 'zoom' as const, label: '缩放' },
      ...(isMac ? [sep, { role: 'front' as const, label: '前置所有窗口' }] : []),
    ]},
  ]));
}

app.whenReady().then(() => {
  createMenu();
  createWelcomeNote();
  setupIPC();
  createMainWindow();
  registerShortcuts();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createMainWindow(); });
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
