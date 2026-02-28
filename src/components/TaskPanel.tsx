import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle2, XCircle, Trash2, Image, Video, Mic, FileText, User, Clapperboard, ChevronDown, ChevronUp } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import { TaskType } from '../lib/db';
import { cn } from '../lib/utils';

const taskTypeConfig: Record<TaskType, { icon: React.ElementType; color: string; label: string }> = {
  video: { icon: Video, color: 'text-purple-500 bg-purple-50', label: 'فيديو' },
  image: { icon: Image, color: 'text-blue-500 bg-blue-50', label: 'صورة' },
  audio: { icon: Mic, color: 'text-green-500 bg-green-50', label: 'صوت' },
  script: { icon: FileText, color: 'text-amber-500 bg-amber-50', label: 'سيناريو' },
  character: { icon: User, color: 'text-pink-500 bg-pink-50', label: 'شخصية' },
  storyboard: { icon: Clapperboard, color: 'text-indigo-500 bg-indigo-50', label: 'قصة' },
};

export function TaskFloatingButton() {
  const { activeTasks, setTaskPanelOpen, isTaskPanelOpen } = useTaskContext();
  
  if (activeTasks.length === 0) return null;
  
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      onClick={() => setTaskPanelOpen(!isTaskPanelOpen)}
      className="fixed bottom-20 left-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
    >
      <div className="relative">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-[10px] font-bold rounded-full flex items-center justify-center">
          {activeTasks.length}
        </span>
      </div>
      <span className="text-sm font-medium">مهام قيد التنفيذ</span>
      {isTaskPanelOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
    </motion.button>
  );
}

export function TaskPanel() {
  const { tasks, activeTasks, isTaskPanelOpen, setTaskPanelOpen, cancelTask, clearCompleted } = useTaskContext();
  
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'failed');
  
  return (
    <AnimatePresence>
      {isTaskPanelOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setTaskPanelOpen(false)}
            className="fixed inset-0 bg-black/30 z-40"
          />
          
          {/* Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[70vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-800">المهام</h3>
                {activeTasks.length > 0 && (
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
                    {activeTasks.length} نشطة
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {completedTasks.length > 0 && (
                  <button
                    onClick={clearCompleted}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    مسح المكتملة
                  </button>
                )}
                <button
                  onClick={() => setTaskPanelOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Task List */}
            <div className="overflow-y-auto max-h-[55vh] p-4 space-y-3">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Clapperboard className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">لا توجد مهام</p>
                </div>
              ) : (
                tasks.map(task => {
                  const config = taskTypeConfig[task.type];
                  const Icon = config.icon;
                  
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "p-4 rounded-xl border transition-colors",
                        task.status === 'running' && "bg-indigo-50 border-indigo-200",
                        task.status === 'pending' && "bg-slate-50 border-slate-200",
                        task.status === 'completed' && "bg-green-50 border-green-200",
                        task.status === 'failed' && "bg-red-50 border-red-200"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={cn("p-2 rounded-lg", config.color)}>
                          <Icon className="w-5 h-5" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-slate-800 truncate">{task.title}</h4>
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded">
                              {config.label}
                            </span>
                          </div>
                          
                          {task.description && (
                            <p className="text-xs text-slate-500 mt-0.5 truncate">{task.description}</p>
                          )}
                          
                          {/* Progress Bar */}
                          {(task.status === 'running' || task.status === 'pending') && (
                            <div className="mt-2">
                              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-indigo-500 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${task.progress}%` }}
                                  transition={{ duration: 0.3 }}
                                />
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-[10px] text-slate-500">
                                  {task.status === 'pending' ? 'في الانتظار...' : 'جاري التنفيذ...'}
                                </span>
                                <span className="text-[10px] font-medium text-indigo-600">
                                  {task.progress}%
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* Error Message */}
                          {task.status === 'failed' && task.error && (
                            <p className="text-xs text-red-600 mt-1.5 line-clamp-2">{task.error}</p>
                          )}
                          
                          {/* Completed Status */}
                          {task.status === 'completed' && (
                            <div className="flex items-center gap-1 mt-1.5 text-green-600">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span className="text-xs font-medium">اكتمل بنجاح</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {task.status === 'running' && (
                            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                          )}
                          {task.status === 'completed' && (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          )}
                          {task.status === 'failed' && (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                          {(task.status === 'pending' || task.status === 'running') && (
                            <button
                              onClick={() => cancelTask(task.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
