import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { TodayPlan } from './components/TodayPlan';
import { useNoteStore, registerReloadListener } from './store/noteStore';
import { useSettingsStore } from './store/settingsStore';
import { generateId } from './utils/markdown';

const App: React.FC = () => {
  const { showTodayPlan, activeNoteId, loadNotes, addNote, selectNote } = useNoteStore();
  const { settings, t, toggleTheme, toggleTextMode } = useSettingsStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // 启动时加载便签数据并注册跨窗口重载监听
  useEffect(() => { loadNotes(); registerReloadListener(); }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
    window.electronAPI?.updateTheme(settings.theme);
  }, [settings.theme]);

  // 键盘快捷键（Alt+Q 由菜单加速器处理）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') { e.preventDefault(); setShowPreview((prev) => !prev); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 菜单事件监听
  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.onNewNote?.(() => {
      const note = { id: generateId(), title: t.newNote, content: '', tags: [], createdAt: Date.now(), updatedAt: Date.now(), isTodayPlan: false, isArchived: false };
      addNote(note);
    });
    window.electronAPI.onExportData?.(async () => {
      const data = await window.electronAPI.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'muyujian-backup.json'; a.click();
      URL.revokeObjectURL(url);
    });
    window.electronAPI.onImportData?.(() => {
      const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
      input.onchange = async () => { const file = input.files?.[0]; if (!file) return; const text = await file.text(); window.electronAPI?.importData(text); await loadNotes(); };
      input.click();
    });
    // 监听选中便签事件（来自 QuickNote 窗口）
    window.electronAPI.onSelectNote?.((noteId: string) => {
      selectNote(noteId);
    });
  }, [addNote, loadNotes, t.newNote, selectNote]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white dark:bg-gray-950">
      {/* 自定义标题栏 - 可拖拽 */}
      <div className="flex items-center h-9 px-2 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800 select-none flex-shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>

        {/* 左侧：应用信息 + 侧边栏按钮 */}
        <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors flex-shrink-0"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            title={sidebarCollapsed ? t.expandSidebar : t.collapseSidebar}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              {sidebarCollapsed
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />}
            </svg>
          </button>
          <span className="text-sm" role="img" aria-label="暮雨笺">🌧️</span>
          <h1 className="text-sm font-medium text-gray-600 dark:text-gray-300 tracking-widest truncate">{t.appName}</h1>
        </div>

        {/* 中间留空可拖拽 */}
        <div className="flex-1" />

        {/* 右侧：工具按钮 + 窗口控制，紧挨排列 */}
        <div className="flex items-center gap-1 flex-shrink-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {activeNoteId && !showTodayPlan && (
            <button onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-all whitespace-nowrap ${showPreview
                ? 'bg-indigo-100 dark:bg-rose-900/30 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}
              title={`${showPreview ? t.hidePreview : t.showPreview} (Ctrl+Shift+P)`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                {showPreview ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                )}
              </svg>
              <span className="hidden md:inline">{showPreview ? t.hidePreview : t.showPreview}</span>
            </button>
          )}

          <button onClick={toggleTextMode}
            className="px-2 py-1 text-[11px] rounded transition-all whitespace-nowrap bg-violet-50 dark:bg-violet-900/20 text-violet-500 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30"
            title={t.textMode}>
            {settings.textMode === 'modern' ? t.modernText : t.classicalText}
          </button>

          <button onClick={toggleTheme}
            className="p-1 rounded hover:bg-amber-50 dark:hover:bg-gray-800 text-gray-400 transition-colors"
            title={settings.theme === 'light' ? t.switchToDark : t.switchToLight}>
            {settings.theme === 'light' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>

          <button onClick={() => window.electronAPI?.toggleQuickNote()}
            className="p-1 rounded hover:bg-indigo-50 dark:hover:bg-gray-800 text-gray-400 transition-colors"
            title={`${t.shortcutHint} (Alt+Q)`}>
            <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>

          {/* 窗口控制按钮 */}
          <div className="flex items-center ml-1 pl-1 border-l border-gray-200 dark:border-gray-700">
            <button onClick={() => window.electronAPI?.winMinimize()}
              className="w-8 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors rounded">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M5 12h14" /></svg>
            </button>
            <button onClick={() => window.electronAPI?.winMaximize()}
              className="w-8 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors rounded">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><rect x="5" y="5" width="14" height="14" rx="2" /></svg>
            </button>
            <button onClick={() => window.electronAPI?.winClose()}
              className="w-8 h-7 flex items-center justify-center hover:bg-red-500 hover:text-white text-gray-400 transition-colors rounded">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex min-h-0">
        {/* 侧边栏 */}
        <div className={`transition-all duration-300 ease-in-out flex-shrink-0 ${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-72'}`}>
          <Sidebar />
        </div>

        {/* 编辑器区 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 内容区域 */}
          <div className="flex-1 flex min-h-0">
            {showTodayPlan ? <TodayPlan /> : <><Editor />{showPreview && <Preview />}</>}
          </div>

          {/* 底部状态栏 */}
          <div className="flex items-center justify-between px-3 py-1 border-t border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-900 flex-shrink-0">
            <div className="flex items-center gap-3 text-[11px] text-gray-300 dark:text-gray-600">
              <span>Alt+Q: {t.shortcutHint}</span>
              <span className="text-slate-300">·</span>
              <span>Ctrl+Shift+P: {t.preview}</span>
              <span className="text-slate-300">·</span>
              <span>Ctrl+B: {t.bold}</span>
              <span className="text-slate-300">·</span>
              <span>Ctrl+I: {t.italic}</span>
            </div>
            <div className="text-[11px] text-gray-300 dark:text-gray-600">
              {settings.theme === 'light' ? t.themeLight : t.themeDark}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
