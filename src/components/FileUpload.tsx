import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "./ui/button";
import { useUploadQueue } from "@/hooks/useUploadQueue";
import { UploadQueue } from "./UploadQueue";

interface FileUploadProps {
  onUploadComplete: () => void;
  currentFolderId?: string | null;
}

export const FileUpload = ({ onUploadComplete, currentFolderId }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const { tasks, addToQueue, pauseUpload, resumeUpload, removeTask, clearCompleted } = useUploadQueue(
    onUploadComplete,
    currentFolderId
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      addToQueue(files);
    }
  }, [addToQueue]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      addToQueue(files);
    }
  };

  return (
    <>
      <UploadQueue
        tasks={tasks}
        onPause={pauseUpload}
        onResume={resumeUpload}
        onRemove={removeTask}
        onClearCompleted={clearCompleted}
      />
      
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-2xl p-12 text-center transition-smooth
          ${isDragging 
            ? 'border-primary bg-primary/10' 
            : 'border-border hover:border-primary/50 bg-card/50'
          }
        `}
      >
        <Upload className="w-16 h-16 mx-auto mb-4 text-primary" />
        <h3 className="text-xl font-semibold mb-2">Drop files here</h3>
        <p className="text-muted-foreground mb-6">or click to browse • Multiple files supported</p>
        <Button
          variant="default"
          className="bg-primary hover:bg-primary/90"
          onClick={() => document.getElementById('file-input')?.click()}
        >
          Select Files
        </Button>
        <input
          id="file-input"
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
      </div>
    </>
  );
};
