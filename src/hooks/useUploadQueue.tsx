import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UploadTask {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'failed';
  speed: number;
  timeRemaining: number | null;
  error?: string;
  storagePath?: string;
  startTime?: number;
  pausedAt?: number;
  uploadedBytes?: number;
}

export const useUploadQueue = (onUploadComplete: () => void, currentFolderId?: string | null) => {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  const uploadIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const addToQueue = useCallback((files: File[]) => {
    const newTasks: UploadTask[] = files.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status: 'pending',
      speed: 0,
      timeRemaining: null,
    }));

    setTasks(prev => [...prev, ...newTasks]);
    
    // Start uploading the first pending task
    newTasks.forEach(task => {
      if (tasks.length === 0 || tasks.every(t => t.status !== 'uploading')) {
        setTimeout(() => startUpload(task.id), 100);
      }
    });
  }, [tasks]);

  const startUpload = useCallback(async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === 'uploading') return;

    try {
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: 'uploading' as const, startTime: Date.now() } : t
      ));

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to upload files");
      }

      const fileExt = task.file.name.split('.').pop();
      const storagePath = `${user.id}/${Date.now()}.${fileExt}`;

      // Create abort controller for this upload
      const controller = new AbortController();
      abortControllers.current.set(taskId, controller);

      const startTime = Date.now();
      const fileSize = task.file.size;

      // Progress estimation
      const progressInterval = setInterval(() => {
        setTasks(prev => {
          const currentTask = prev.find(t => t.id === taskId);
          if (!currentTask || currentTask.status !== 'uploading') {
            clearInterval(progressInterval);
            return prev;
          }

          const elapsed = (Date.now() - startTime) / 1000;
          const estimatedTotalTime = Math.max(2, fileSize / (500 * 1024));
          const progressPercent = Math.min(95, (elapsed / estimatedTotalTime) * 100);
          
          const bytesUploaded = (progressPercent / 100) * fileSize;
          const speed = bytesUploaded / elapsed;
          const remainingBytes = fileSize - bytesUploaded;
          const timeRemaining = remainingBytes / speed;

          return prev.map(t => 
            t.id === taskId 
              ? { ...t, progress: Math.round(progressPercent), speed, timeRemaining, uploadedBytes: bytesUploaded }
              : t
          );
        });
      }, 200);

      uploadIntervals.current.set(taskId, progressInterval);

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(storagePath, task.file, {
          cacheControl: '3600',
          upsert: false
        });

      clearInterval(progressInterval);
      uploadIntervals.current.delete(taskId);

      if (uploadError) throw uploadError;

      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, progress: 100, timeRemaining: 0 } : t
      ));

      const { error: dbError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          name: task.file.name,
          size: task.file.size,
          mime_type: task.file.type,
          storage_path: storagePath,
          folder_id: currentFolderId,
        });

      if (dbError) throw dbError;

      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: 'completed' as const, storagePath } : t
      ));

      toast.success(`${task.file.name} uploaded successfully!`);
      
      // Start next pending task
      setTimeout(() => {
        const nextTask = tasks.find(t => t.status === 'pending');
        if (nextTask) {
          startUpload(nextTask.id);
        } else {
          onUploadComplete();
        }
      }, 500);

    } catch (error: any) {
      const interval = uploadIntervals.current.get(taskId);
      if (interval) {
        clearInterval(interval);
        uploadIntervals.current.delete(taskId);
      }

      setTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { ...t, status: 'failed' as const, error: error.message || "Upload failed" } 
          : t
      ));
      
      toast.error(`Failed to upload ${task.file.name}`);
    } finally {
      abortControllers.current.delete(taskId);
    }
  }, [tasks, onUploadComplete, currentFolderId]);

  const pauseUpload = useCallback((taskId: string) => {
    const interval = uploadIntervals.current.get(taskId);
    if (interval) {
      clearInterval(interval);
      uploadIntervals.current.delete(taskId);
    }

    const controller = abortControllers.current.get(taskId);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(taskId);
    }

    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: 'paused' as const, pausedAt: Date.now() } : t
    ));
  }, []);

  const resumeUpload = useCallback((taskId: string) => {
    startUpload(taskId);
  }, [startUpload]);

  const removeTask = useCallback((taskId: string) => {
    const interval = uploadIntervals.current.get(taskId);
    if (interval) {
      clearInterval(interval);
      uploadIntervals.current.delete(taskId);
    }

    const controller = abortControllers.current.get(taskId);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(taskId);
    }

    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  const clearCompleted = useCallback(() => {
    setTasks(prev => prev.filter(t => t.status !== 'completed'));
  }, []);

  return {
    tasks,
    addToQueue,
    pauseUpload,
    resumeUpload,
    removeTask,
    clearCompleted,
  };
};
