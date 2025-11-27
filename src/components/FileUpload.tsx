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
          relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300
          ${isDragging 
            ? 'border-primary bg-primary/10 scale-[1.02] shadow-lg shadow-primary/20' 
            : 'border-border hover:border-primary/50 bg-card/50 hover:shadow-md'
          }
        `}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-primary/5 rounded-2xl animate-pulse" />
        )}
        <div className={`relative ${isDragging ? 'animate-bounce' : ''}`}>
          <Upload className={`w-16 h-16 mx-auto mb-4 transition-all duration-300 ${isDragging ? 'text-primary scale-110' : 'text-primary'}`} />
        </div>
        <h3 className="text-xl font-semibold mb-2">
          {isDragging ? 'Drop files to upload' : 'Drag & drop files here'}
        </h3>
        <p className="text-muted-foreground mb-6">
          or click to browse • Multiple files supported • Max 100MB per file
        </p>
        <Button
          variant="default"
          className="bg-primary hover:bg-primary/90 hover-lift"
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
        
        {/* File type hints */}
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-1 bg-secondary/50 rounded">Images</span>
          <span className="px-2 py-1 bg-secondary/50 rounded">Videos</span>
          <span className="px-2 py-1 bg-secondary/50 rounded">Documents</span>
          <span className="px-2 py-1 bg-secondary/50 rounded">Archives</span>
        </div>
      </div>
    </>
  );
};
