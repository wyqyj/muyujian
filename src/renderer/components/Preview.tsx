import React, { useMemo, useCallback, useState } from 'react';
import { useNoteStore } from '../store/noteStore';
import { useSettingsStore } from '../store/settingsStore';
import { renderMarkdown, toggleTaskCheckbox } from '../utils/markdown';

export const Preview: React.FC = () => {
  const { notes, activeNoteId, updateNote } = useNoteStore();
  const { t } = useSettingsStore();
  const activeNote = notes.find((n) => n.id === activeNoteId);
  const [exporting, setExporting] = useState(false);

  const html = useMemo(() => {
    if (!activeNote) return '';
    return renderMarkdown(activeNote.content);
  }, [activeNote?.content]);

  const handleContentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!activeNote || !activeNoteId) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && target.getAttribute('type') === 'checkbox') {
        const li = target.closest('li');
        if (!li) return;
        const listItems = Array.from(li.parentElement?.children || []);
        const itemIndex = listItems.indexOf(li);
        const lines = activeNote.content.split('\n');
        let taskIndex = 0;
        let lineIndex = -1;
        for (let i = 0; i < lines.length; i++) {
          if (/^\s*[-*+]\s*\[/.test(lines[i])) {
            if (taskIndex === itemIndex) { lineIndex = i; break; }
            taskIndex++;
          }
        }
        if (lineIndex >= 0) {
          const isChecked = (target as HTMLInputElement).checked;
          updateNote(activeNoteId, { content: toggleTaskCheckbox(activeNote.content, lineIndex, isChecked) });
        }
      }
    }, [activeNote, activeNoteId, updateNote]);

  const handleExportPdf = async () => {
    if (!activeNote || !window.electronAPI) return;
    setExporting(true);
    const result = await window.electronAPI.exportPdf(activeNote.title, html);
    setExporting(false);
    if (result.success) alert(`已导出为 PDF：${result.path}`);
    else if (result.error !== 'cancelled') alert(`导出失败：${result.error}`);
  };

  const handleExportWord = async () => {
    if (!activeNote || !window.electronAPI) return;
    setExporting(true);
    const result = await window.electronAPI.exportWord(activeNote.title, html);
    setExporting(false);
    if (result.success) alert(`已导出为 Word：${result.path}`);
    else if (result.error !== 'cancelled') alert(`导出失败：${result.error}`);
  };

  if (!activeNote) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50/50 dark:bg-gray-800/50">
        <div className="text-center text-gray-300 dark:text-gray-600">
          <svg className="w-20 h-20 mx-auto mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <p className="text-base">{t.previewPlaceholder}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50/50 dark:bg-gray-800/30 min-w-0 border-l border-indigo-100/60 dark:border-gray-800">
      {/* 标题栏 + 导出按钮 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-indigo-100/40 dark:border-gray-800">
        <span className="text-xs font-medium text-indigo-300 dark:text-gray-600 tracking-wider">{t.preview}</span>
        <div className="flex items-center gap-1">
          <button onClick={handleExportWord} disabled={exporting}
            className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 disabled:opacity-50 transition-all"
            title="导出为 Word">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Word
          </button>
          <button onClick={handleExportPdf} disabled={exporting}
            className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-md bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 disabled:opacity-50 transition-all"
            title="导出为 PDF">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            PDF
          </button>
        </div>
      </div>
      {/* 预览内容 */}
      <div className="flex-1 overflow-auto p-6 prose prose-sm dark:prose-invert max-w-none prose-headings:text-gray-800 dark:prose-headings:text-gray-100 prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-a:text-indigo-500 prose-code:text-indigo-600 dark:prose-code:text-indigo-400 prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800/80"
        onClick={handleContentClick} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
};
