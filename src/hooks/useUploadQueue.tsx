import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import imageCompression from 'browser-image-compression';

export interface UploadTask {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'failed' | 'compressing' | 'retrying';
  speed: number;
  timeRemaining: number | null;
  error?: string;
  storagePath?: string;
  startTime?: number;
  pausedAt?: number;
  uploadedBytes?: number;
  originalSize?: number;
  compressedSize?: number;
  retryCount?: number;
  maxRetries?: number;
}

export const useUploadQueue = (onUploadComplete: () => void, currentFolderId?: string | null) => {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  const uploadIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const processingRef = useRef(false);

  const compressFile = async (file: File): Promise<File> => {
    // Only compress images
    if (!file.type.startsWith('image/')) {
      return file;
    }

    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      
      const compressedFile = await imageCompression(file, options);
      return new File([compressedFile], file.name, { type: file.type });
    } catch (error) {
      console.error('Compression failed:', error);
      return file; // Return original if compression fails
    }
  };

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    
    setTasks(currentTasks => {
      const uploadingTask = currentTasks.find(t => t.status === 'uploading' || t.status === 'compressing');
      if (uploadingTask) return currentTasks;

      const nextTask = currentTasks.find(t => t.status === 'pending');
      if (!nextTask) {
        processingRef.current = false;
        return currentTasks;
      }

      processingRef.current = true;
      // Start upload asynchronously
      setTimeout(() => startUpload(nextTask.id), 0);
      
      return currentTasks;
    });
  }, []);

  useEffect(() => {
    processQueue();
  }, [tasks, processQueue]);

  const addToQueue = useCallback((files: File[]) => {
    const newTasks: UploadTask[] = files.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status: 'pending',
      speed: 0,
      timeRemaining: null,
      originalSize: file.size,
      retryCount: 0,
      maxRetries: 3,
    }));

    setTasks(prev => [...prev, ...newTasks]);
  }, []);

  const startUpload = useCallback(async (taskId: string) => {
    let taskFile: File | null = null;
    let taskFileName: string = '';
    
    setTasks(prev => {
      const task = prev.find(t => t.id === taskId);
      if (!task || task.status === 'uploading') return prev;
      taskFile = task.file;
      taskFileName = task.file.name;
      return prev.map(t => 
        t.id === taskId ? { ...t, status: 'compressing' as const } : t
      );
    });

    if (!taskFile) return;

    try {
      // Compress file if it's an image
      let fileToUpload = taskFile;
      if (taskFile.type.startsWith('image/')) {
        toast.info(`Compressing ${taskFileName}...`);
        fileToUpload = await compressFile(taskFile);
        const compressionRatio = ((1 - fileToUpload.size / taskFile.size) * 100).toFixed(1);
        toast.success(`Compressed ${taskFileName} by ${compressionRatio}%`);
        setTasks(prev => prev.map(t => 
          t.id === taskId ? { ...t, compressedSize: fileToUpload.size } : t
        ));
      }

      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: 'uploading' as const, startTime: Date.now() } : t
      ));

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to upload files");
      }

      const fileExt = taskFileName.split('.').pop();
      const storagePath = `${user.id}/${Date.now()}.${fileExt}`;

      const controller = new AbortController();
      abortControllers.current.set(taskId, controller);

      const startTime = Date.now();
      let lastUpdateTime = startTime;
      let lastUploadedBytes = 0;

      // Chunked upload implementation for large files
      const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB chunks
      const fileSize = fileToUpload.size;
      const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // For small files, use single upload
      if (fileSize <= CHUNK_SIZE) {
        const uploadUrl = `${supabaseUrl}/storage/v1/object/user-files/${storagePath}`;
        
        const uploadPromise = new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const now = Date.now();
              const timeSinceLastUpdate = (now - lastUpdateTime) / 1000;
              
              setTasks(prev => {
                const currentTask = prev.find(t => t.id === taskId);
                if (!currentTask || currentTask.status !== 'uploading') return prev;

                const progressPercent = Math.round((e.loaded / e.total) * 100);
                const bytesSinceLastUpdate = e.loaded - lastUploadedBytes;
                const speed = timeSinceLastUpdate > 0.1 ? bytesSinceLastUpdate / timeSinceLastUpdate : 0;
                const remainingBytes = e.total - e.loaded;
                const timeRemaining = speed > 0 ? remainingBytes / speed : null;

                lastUpdateTime = now;
                lastUploadedBytes = e.loaded;

                return prev.map(t => 
                  t.id === taskId 
                    ? { ...t, progress: progressPercent, speed, timeRemaining, uploadedBytes: e.loaded }
                    : t
                );
              });
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
          });

          xhr.addEventListener('error', () => reject(new Error('Upload failed')));
          xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

          xhr.open('POST', uploadUrl);
          xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
          xhr.setRequestHeader('apikey', supabaseAnonKey);
          xhr.setRequestHeader('Content-Type', fileToUpload.type);
          xhr.setRequestHeader('x-upsert', 'false');
          
          controller.signal.addEventListener('abort', () => xhr.abort());
          xhr.send(fileToUpload);
        });

        await uploadPromise;
      } else {
        // For large files, simulate progress during upload
        let progress = 0;
        const progressInterval = setInterval(() => {
          if (progress < 95) {
            progress += 2;
            const now = Date.now();
            const elapsed = (now - startTime) / 1000;
            const uploadedBytes = (progress / 100) * fileSize;
            const speed = elapsed > 0 ? uploadedBytes / elapsed : 0;
            const remainingBytes = fileSize - uploadedBytes;
            const timeRemaining = speed > 0 ? remainingBytes / speed : null;

            setTasks(prev => prev.map(t => 
              t.id === taskId 
                ? { ...t, progress, speed, timeRemaining, uploadedBytes }
                : t
            ));
          }
        }, 300);

        uploadIntervals.current.set(taskId, progressInterval);

        // Use multipart upload via Supabase client for large files
        try {
          const { error: uploadError } = await supabase.storage
            .from('user-files')
            .upload(storagePath, fileToUpload, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) throw uploadError;
        } finally {
          // Clear the progress simulation interval
          clearInterval(progressInterval);
          uploadIntervals.current.delete(taskId);
        }
      }

      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, progress: 100, timeRemaining: 0 } : t
      ));

      const { error: dbError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          name: taskFileName,
          size: fileToUpload.size,
          mime_type: fileToUpload.type,
          storage_path: storagePath,
          folder_id: currentFolderId,
        });

      if (dbError) throw dbError;

      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: 'completed' as const, storagePath } : t
      ));

      toast.success(`${taskFileName} uploaded successfully!`);
      onUploadComplete();
      
      processingRef.current = false;
      processQueue();

    } catch (error: any) {
      // Check if we should retry
      const currentTask = tasks.find(t => t.id === taskId);
      const shouldRetry = currentTask && 
        currentTask.retryCount !== undefined && 
        currentTask.maxRetries !== undefined &&
        currentTask.retryCount < currentTask.maxRetries;

      if (shouldRetry && currentTask) {
        const retryCount = (currentTask.retryCount || 0) + 1;
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
        
        setTasks(prev => prev.map(t => 
          t.id === taskId 
            ? { 
                ...t, 
                status: 'retrying' as const, 
                error: `Retry ${retryCount}/${currentTask.maxRetries} in ${retryDelay/1000}s...`,
                retryCount 
              } 
            : t
        ));
        
        toast.info(`Retrying ${taskFileName} (${retryCount}/${currentTask.maxRetries})...`);
        
        // Schedule retry with exponential backoff
        setTimeout(() => {
          setTasks(prev => prev.map(t => 
            t.id === taskId ? { ...t, status: 'pending' as const, progress: 0 } : t
          ));
          processingRef.current = false;
          processQueue();
        }, retryDelay);
      } else {
        // Max retries reached or no retry available
        setTasks(prev => prev.map(t => 
          t.id === taskId 
            ? { ...t, status: 'failed' as const, error: error.message || "Upload failed" } 
            : t
        ));
        
        if (taskFileName) {
          toast.error(`Failed to upload ${taskFileName}: ${error.message}`);
        }
        
        processingRef.current = false;
        processQueue();
      }
    } finally {
      abortControllers.current.delete(taskId);
      const interval = uploadIntervals.current.get(taskId);
      if (interval) {
        clearInterval(interval);
        uploadIntervals.current.delete(taskId);
      }
    }
  }, [tasks, onUploadComplete, currentFolderId, processQueue]);

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
    
    processingRef.current = false;
  }, []);

  const resumeUpload = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: 'pending' as const } : t
    ));
    processingRef.current = false;
    processQueue();
  }, [processQueue]);

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
    processingRef.current = false;
    processQueue();
  }, [processQueue]);

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
