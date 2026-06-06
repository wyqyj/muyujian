import React, { useState, useEffect, useRef, useCallback } from 'react';
import { renderMarkdown } from '../utils/markdown';
import { useNoteStore, Note } from '../store/noteStore';
import { useSettingsStore } from '../store/settingsStore';
import { generateId } from '../utils/markdown';
import { useAutoSave } from '../utils/useAutoSave';

type ViewMode = 'edit' | 'preview' | 'split';

export const QuickNote: React.FC = () => {
  const [content, setContent] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [autoSaved, setAutoSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef(content);
  const { addNote } = useNoteStore();
  const { t } = useSettingsStore();

  useEffect(() => { contentRef.current = content; }, [content]);

  useEffect(() => {
    const loadContent = async () => {
      if (window.electronAPI) {
        const saved = await window.electronAPI.getQuickNote();
        if (saved) setContent(saved);
      }
    };
    loadContent();
  }, []);

  useAutoSave({
    content,
    saveFn: (c) => { if (window.electronAPI) window.electronAPI.saveQuickNote(c); },
    interval: 60000,
  });

  // 窗口关闭时自动保存为便签（随笔记功能）
  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentContent = contentRef.current;
      if (currentContent.trim()) {
        const now = new Date();
        const title = `随笔记 ${now.toLocaleDateString('zh-CN')} ${now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
        const note: Note = {
          id: generateId(), title, content: currentContent, tags: ['随笔记'],
          createdAt: Date.now(), updatedAt: Date.now(), isTodayPlan: false, isArchived: false,
        };
        addNote(note);
        if (window.electronAPI) window.electronAPI.saveQuickNote('');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [addNote]);

  const insertText = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end);
    setContent(content.slice(0, start) + before + selected + after + content.slice(end));
    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + before.length, start + before.length + selected.length); }, 0);
  }, [content]);

  const handleSaveAsNote = () => {
    if (!content.trim()) return;
    const now = new Date();
    const title = `${t.quickNoteTitle} ${now.toLocaleDateString('zh-CN')} ${now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    addNote({ id: generateId(), title, content, tags: [t.quickNote], createdAt: Date.now(), updatedAt: Date.now(), isTodayPlan: false, isArchived: false });
    setContent('');
    if (window.electronAPI) window.electronAPI.saveQuickNote('');
    setAutoSaved(true);
    setTimeout(() => setAutoSaved(false), 2000);
  };

  const handleClose = () => {
    // 关闭前如果内容非空，自动保存为随笔记
    if (content.trim()) {
      const now = new Date();
      const title = `随笔记 ${now.toLocaleDateString('zh-CN')} ${now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
      addNote({ id: generateId(), title, content, tags: ['随笔记'], createdAt: Date.now(), updatedAt: Date.now(), isTodayPlan: false, isArchived: false });
      setContent('');
      if (window.electronAPI) window.electronAPI.saveQuickNote('');
    }
    window.electronAPI?.closeQuickNote();
  };

  const previewHtml = renderMarkdown(content);

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900 overflow-hidden select-none">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-gray-800 dark:to-gray-800 border-b border-rose-100/60 dark:border-gray-700"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300 tracking-wide">{t.quickNoteTitle}</span>
          <span className="text-[10px] text-gray-300 dark:text-gray-600">· 关闭自动保存为随笔记</span>
        </div>
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button onClick={() => window.electronAPI?.minimizeQuickNote()}
            className="p-1.5 rounded-md hover:bg-white/60 dark:hover:bg-gray-700 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
          </button>
          <button onClick={handleClose}
            className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-rose-100/40 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
        <button onClick={() => insertText('## ')} className="toolbar-btn" title={t.heading}><span className="font-bold text-sm">H</span></button>
        <button onClick={() => insertText('**', '**')} className="toolbar-btn" title={t.bold}><span className="font-bold text-sm">B</span></button>
        <button onClick={() => insertText('*', '*')} className="toolbar-btn" title={t.italic}><span className="italic text-sm">I</span></button>
        <button onClick={() => insertText('`', '`')} className="toolbar-btn" title={t.code}><span className="text-sm font-mono">&lt;/&gt;</span></button>
        <button onClick={() => insertText('```\n', '\n```')} className="toolbar-btn" title={t.codeBlock}><span className="text-xs font-mono">{'{ }'}</span></button>
        <button onClick={() => insertText('- [ ] ')} className="toolbar-btn" title={t.taskList}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
        </button>
        <button onClick={() => insertText('[', '](url)')} className="toolbar-btn" title={t.link}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
        </button>
        <button onClick={() => insertText('- ')} className="toolbar-btn" title={t.list}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
        </button>
        <div className="flex-1" />
        {autoSaved && <span className="text-xs text-emerald-400 animate-fade-in">已保存</span>}
        <div className="flex bg-gray-200/60 dark:bg-gray-700/60 rounded-lg p-0.5">
          {([['edit', t.edit], ['preview', t.preview], ['split', t.split]] as const).map(([mode, label]) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`px-2.5 py-0.5 text-xs rounded-md transition-all ${viewMode === mode
                ? 'bg-white dark:bg-gray-600 text-rose-500 dark:text-rose-400 shadow-sm font-medium'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>{label}</button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={`flex-1 ${viewMode === 'split' ? 'border-r border-rose-100/40 dark:border-gray-800' : ''}`}>
            <textarea ref={textareaRef} value={content} onChange={(e) => setContent(e.target.value)}
              placeholder={t.quickNotePlaceholder}
              className="w-full h-full p-4 resize-none bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 font-mono text-sm focus:outline-none placeholder:text-gray-300 leading-relaxed"
              spellCheck={false} />
          </div>
        )}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="flex-1 overflow-auto p-4 bg-gray-50/50 dark:bg-gray-800/30">
            {content ? (
              <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            ) : (
              <div className="text-center text-gray-300 mt-8"><p>{t.preview}</p></div>
            )}
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-rose-100/40 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
        <span className="text-xs text-gray-300">{content.length} {t.charCount}</span>
        <div className="flex items-center gap-2">
          <button onClick={handleClose}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
            关闭并保存为随笔记
          </button>
          <button onClick={handleSaveAsNote} disabled={!content.trim()}
            className="px-4 py-1.5 bg-gradient-to-r from-rose-400 to-pink-400 hover:from-rose-500 hover:to-pink-500 disabled:from-gray-200 disabled:to-gray-200 dark:disabled:from-gray-700 dark:disabled:to-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-all shadow-sm hover:shadow-md disabled:shadow-none active:scale-[0.97]">
            {t.saveAsNote}
          </button>
        </div>
      </div>
    </div>
  );
};
