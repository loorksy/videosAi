import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db, BackgroundTask, TaskType, TaskStatus } from '../lib/db';

interface TaskContextType {
  tasks: BackgroundTask[];
  activeTasks: BackgroundTask[];
  addTask: (type: TaskType, title: string, executor: TaskExecutor, relatedId?: string) => string;
  cancelTask: (id: string) => void;
  clearCompleted: () => void;
  getTask: (id: string) => BackgroundTask | undefined;
  isTaskPanelOpen: boolean;
  setTaskPanelOpen: (open: boolean) => void;
}

type TaskExecutor = (
  updateProgress: (progress: number, description?: string) => void
) => Promise<any>;

const TaskContext = createContext<TaskContextType | null>(null);

export function useTaskContext() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
}

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const [isTaskPanelOpen, setTaskPanelOpen] = useState(false);
  const executingTasks = useRef<Set<string>>(new Set());
  const taskQueue = useRef<Map<string, TaskExecutor>>(new Map());

  // Load tasks from DB on mount
  useEffect(() => {
    const loadTasks = async () => {
      const savedTasks = await db.getAllTasks();
      setTasks(savedTasks);
      
      // Reset any "running" tasks that were interrupted (app closed)
      for (const task of savedTasks) {
        if (task.status === 'running') {
          const updated = { ...task, status: 'failed' as TaskStatus, error: 'تم إيقاف المهمة بسبب إغلاق التطبيق' };
          await db.saveTask(updated);
        }
      }
      
      // Reload after reset
      const updatedTasks = await db.getAllTasks();
      setTasks(updatedTasks);
    };
    loadTasks();
  }, []);

  // Process task queue
  const processTask = useCallback(async (taskId: string, executor: TaskExecutor) => {
    if (executingTasks.current.has(taskId)) return;
    executingTasks.current.add(taskId);

    try {
      // Update task to running
      const task = await db.getTask(taskId);
      if (!task || task.status !== 'pending') {
        executingTasks.current.delete(taskId);
        return;
      }

      const runningTask: BackgroundTask = {
        ...task,
        status: 'running',
        startedAt: Date.now(),
      };
      await db.saveTask(runningTask);
      setTasks(prev => prev.map(t => t.id === taskId ? runningTask : t));

      // Execute with progress updates
      const updateProgress = async (progress: number, description?: string) => {
        const current = await db.getTask(taskId);
        if (current) {
          const updated = { ...current, progress, description: description || current.description };
          await db.saveTask(updated);
          setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
        }
      };

      const result = await executor(updateProgress);

      // Mark as completed
      const completedTask: BackgroundTask = {
        ...runningTask,
        status: 'completed',
        progress: 100,
        result,
        completedAt: Date.now(),
      };
      await db.saveTask(completedTask);
      setTasks(prev => prev.map(t => t.id === taskId ? completedTask : t));

      // Show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('اكتمل المهمة', { body: task.title, icon: '/favicon.ico' });
      }

    } catch (error: any) {
      const task = await db.getTask(taskId);
      if (task) {
        const failedTask: BackgroundTask = {
          ...task,
          status: 'failed',
          error: error.message || 'حدث خطأ غير معروف',
          completedAt: Date.now(),
        };
        await db.saveTask(failedTask);
        setTasks(prev => prev.map(t => t.id === taskId ? failedTask : t));
      }
    } finally {
      executingTasks.current.delete(taskId);
      taskQueue.current.delete(taskId);
    }
  }, []);

  const addTask = useCallback((
    type: TaskType,
    title: string,
    executor: TaskExecutor,
    relatedId?: string
  ): string => {
    const taskId = uuidv4();
    
    const newTask: BackgroundTask = {
      id: taskId,
      type,
      title,
      status: 'pending',
      progress: 0,
      relatedId,
      createdAt: Date.now(),
    };

    // Save to DB and state
    db.saveTask(newTask).then(() => {
      setTasks(prev => [newTask, ...prev]);
      
      // Store executor and start processing
      taskQueue.current.set(taskId, executor);
      processTask(taskId, executor);
    });

    // Open task panel to show progress
    setTaskPanelOpen(true);

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return taskId;
  }, [processTask]);

  const cancelTask = useCallback(async (id: string) => {
    const task = await db.getTask(id);
    if (task && (task.status === 'pending' || task.status === 'running')) {
      const cancelled: BackgroundTask = {
        ...task,
        status: 'failed',
        error: 'تم إلغاء المهمة',
        completedAt: Date.now(),
      };
      await db.saveTask(cancelled);
      setTasks(prev => prev.map(t => t.id === id ? cancelled : t));
    }
  }, []);

  const clearCompleted = useCallback(async () => {
    await db.clearCompletedTasks();
    setTasks(prev => prev.filter(t => t.status === 'pending' || t.status === 'running'));
  }, []);

  const getTask = useCallback((id: string) => {
    return tasks.find(t => t.id === id);
  }, [tasks]);

  const activeTasks = tasks.filter(t => t.status === 'pending' || t.status === 'running');

  return (
    <TaskContext.Provider value={{
      tasks,
      activeTasks,
      addTask,
      cancelTask,
      clearCompleted,
      getTask,
      isTaskPanelOpen,
      setTaskPanelOpen,
    }}>
      {children}
    </TaskContext.Provider>
  );
}
