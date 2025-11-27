import { X, Pause, Play, Trash2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Card } from "./ui/card";
import { UploadTask } from "@/hooks/useUploadQueue";

interface UploadQueueProps {
  tasks: UploadTask[];
  onPause: (taskId: string) => void;
  onResume: (taskId: string) => void;
  onRemove: (taskId: string) => void;
  onClearCompleted: () => void;
}

export const UploadQueue = ({ tasks, onPause, onResume, onRemove, onClearCompleted }: UploadQueueProps) => {
  if (tasks.length === 0) return null;

  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const formatTimeRemaining = (seconds: number | null) => {
    if (!seconds || seconds < 1) return "Almost done...";
    if (seconds < 60) return `${Math.round(seconds)}s remaining`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s remaining`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <Card className="fixed bottom-6 right-6 w-96 max-h-[500px] overflow-hidden flex flex-col bg-card border-border shadow-2xl z-50">
      <div className="p-4 border-b border-border flex items-center justify-between bg-card/95 backdrop-blur-sm">
        <div>
          <h3 className="font-semibold text-lg">Upload Queue</h3>
          <p className="text-xs text-muted-foreground">
            {tasks.length} {tasks.length === 1 ? 'file' : 'files'}
            {completedCount > 0 && ` • ${completedCount} completed`}
          </p>
        </div>
        {completedCount > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearCompleted}
            className="text-xs"
          >
            Clear completed
          </Button>
        )}
      </div>

      <div className="overflow-y-auto flex-1 p-4 space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="bg-secondary/30 rounded-lg p-3 space-y-2 border border-border/50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={task.file.name}>
                  {task.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(task.file.size)}
                </p>
              </div>
              
              <div className="flex items-center gap-1">
                {task.status === 'uploading' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onPause(task.id)}
                    className="h-7 w-7 p-0"
                  >
                    <Pause className="w-3 h-3" />
                  </Button>
                )}
                
                {task.status === 'paused' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onResume(task.id)}
                    className="h-7 w-7 p-0"
                  >
                    <Play className="w-3 h-3" />
                  </Button>
                )}
                
                {task.status === 'completed' && (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
                
                {task.status === 'failed' && (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                )}
                
                {task.status === 'pending' && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
                
                {task.status !== 'completed' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemove(task.id)}
                    className="h-7 w-7 p-0 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            {task.status === 'uploading' && (
              <>
                <Progress value={task.progress} className="h-1.5" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{task.speed > 0 ? formatSpeed(task.speed) : "Calculating..."}</span>
                  <span>{task.progress}%</span>
                  <span>
                    {task.timeRemaining !== null 
                      ? formatTimeRemaining(task.timeRemaining)
                      : "Calculating..."}
                  </span>
                </div>
              </>
            )}

            {task.status === 'paused' && (
              <>
                <Progress value={task.progress} className="h-1.5" />
                <p className="text-xs text-muted-foreground">
                  Paused at {task.progress}%
                </p>
              </>
            )}

            {task.status === 'pending' && (
              <p className="text-xs text-muted-foreground">Waiting to upload...</p>
            )}

            {task.status === 'completed' && (
              <p className="text-xs text-green-600 dark:text-green-400">
                Upload completed successfully
              </p>
            )}

            {task.status === 'failed' && (
              <p className="text-xs text-destructive">{task.error || "Upload failed"}</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
