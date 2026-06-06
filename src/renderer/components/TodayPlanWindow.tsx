import React, { useState, useEffect } from 'react';
import { useNoteStore } from '../store/noteStore';
import { useSettingsStore } from '../store/settingsStore';
import { extractTasks, toggleTaskCheckbox } from '../utils/markdown';
import { CountdownBadge } from './CountdownBadge';

const TaskItem: React.FC<{ task: { text: string; checked: boolean; lineIndex: number }; onToggle: () => void; onComplete: () => void }> = ({ task, onToggle, onComplete }) => {
  return (
    <li className="flex items-center gap-2">
      <input type="checkbox" checked={task.checked} onChange={onToggle}
        className="w-3.5 h-3.5 rounded border-gray-300 accent-indigo-400 cursor-pointer" />
      <span className={`flex-1 text-xs ${task.checked ? 'line-through text-gray-300 dark:text-gray-600' : 'text-gray-600 dark:text-gray-300'}`}>{task.text}</span>
      {!task.checked && (
        <button onClick={onComplete}
          className="px-2 py-0.5 text-[10px] rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all">
          完成
        </button>
      )}
    </li>
  );
};

export const TodayPlanWindow: React.FC = () => {
  const { getTodayPlanNotes, updateNote, loadNotes } = useNoteStore();
  const { t, settings } = useSettingsStore();
  const todayNotes = getTodayPlanNotes();
  const [newTaskTexts, setNewTaskTexts] = useState<Record<string, string>>({});

  // 启动时加载便签数据
  useEffect(() => { loadNotes(); }, []);

  // 同步主题到主进程
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  // 定时刷新数据（从磁盘重新读取，保持与主窗口同步）
  useEffect(() => {
    const interval = setInterval(() => { loadNotes(); }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleTask = (noteId: string, lineIndex: number, checked: boolean) => {
    const note = todayNotes.find((n) => n.id === noteId);
    if (note) updateNote(noteId, { content: toggleTaskCheckbox(note.content, lineIndex, checked) });
  };

  const handleCompleteAll = (noteId: string) => {
    const note = todayNotes.find((n) => n.id === noteId);
    if (!note) return;
    let content = note.content;
    const tasks = extractTasks(content);
    const unchecked = tasks.filter(t => !t.checked);
    unchecked.sort((a, b) => b.lineIndex - a.lineIndex);
    for (const task of unchecked) {
      content = toggleTaskCheckbox(content, task.lineIndex, true);
    }
    updateNote(noteId, { content });
  };

  const handleAddTask = (noteId: string) => {
    const text = (newTaskTexts[noteId] || '').trim();
    if (!text) return;
    const note = todayNotes.find((n) => n.id === noteId);
    if (!note) return;
    const newLine = note.content.endsWith('\n') ? '' : '\n';
    updateNote(noteId, { content: note.content + newLine + `- [ ] ${text}` });
    setNewTaskTexts(prev => ({ ...prev, [noteId]: '' }));
  };

  const handleClose = () => window.electronAPI?.closeTodayPlanWindow();
  const handleMinimize = () => window.electronAPI?.minimizeTodayPlanWindow();

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-900 dark:to-gray-950 overflow-hidden select-none">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-slate-100 to-gray-50 dark:from-gray-800 dark:to-gray-800 border-b border-slate-200/60 dark:border-gray-700"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <div className="flex items-center gap-2">
          <span className="text-indigo-400 text-lg">☀</span>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300 tracking-wide">{t.todayPlanView}</span>
          <span className="text-xs text-slate-400">{todayNotes.length} {t.plan}</span>
        </div>
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button onClick={handleMinimize}
            className="p-1.5 rounded-md hover:bg-white/60 dark:hover:bg-gray-700 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
          </button>
          <button onClick={handleClose}
            className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {todayNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300">
            <span className="text-4xl mb-2 opacity-40">☀</span>
            <p className="text-sm">{t.noTodayPlan}</p>
            <p className="text-xs mt-1 opacity-60">{t.todayPlanDesc}</p>
          </div>
        ) : (
          todayNotes.map((note) => {
            const tasks = extractTasks(note.content);
            const completedCount = tasks.filter((tk) => tk.checked).length;
            const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;
            return (
              <div key={note.id} className="bg-white/80 dark:bg-gray-800/50 rounded-xl p-3 border border-slate-100/40 dark:border-gray-700/50 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-800 dark:text-gray-200 text-sm">{note.title}</h3>
                  <div className="flex items-center gap-2">
                    {note.deadline && <CountdownBadge deadline={note.deadline} />}
                    <span className="text-[11px] text-gray-400">{completedCount}/{tasks.length}</span>
                    {completedCount < tasks.length && (
                      <button onClick={() => handleCompleteAll(note.id)}
                        className="px-2 py-0.5 text-[10px] rounded-md bg-indigo-500 hover:bg-indigo-600 text-white transition-colors shadow-sm active:scale-95">
                        全部完成
                      </button>
                    )}
                  </div>
                </div>
                {tasks.length > 0 && (
                  <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full mb-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-400 to-slate-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                )}
                {tasks.length > 0 && (
                  <ul className="space-y-1 mb-2">
                    {tasks.map((task, idx) => (
                      <TaskItem key={idx} task={task}
                        onToggle={() => handleToggleTask(note.id, task.lineIndex, !task.checked)}
                        onComplete={() => handleToggleTask(note.id, task.lineIndex, true)} />
                    ))}
                  </ul>
                )}
                {/* 添加任务输入框 */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100/30 dark:border-gray-700/30">
                  <svg className="w-3.5 h-3.5 text-indigo-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <input type="text" placeholder="添加新任务..." value={newTaskTexts[note.id] || ''}
                    onChange={(e) => setNewTaskTexts(prev => ({ ...prev, [note.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(note.id); }}
                    className="flex-1 text-xs bg-transparent border-none outline-none text-gray-600 dark:text-gray-300 placeholder:text-gray-300" />
                  <button onClick={() => handleAddTask(note.id)}
                    className="px-2 py-0.5 text-[10px] rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all">
                    添加
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
