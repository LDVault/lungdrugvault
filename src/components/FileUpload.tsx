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
      // Reset the input so the same file can be selected again
      e.target.value = '';
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
          relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-500 ease-out
          ${isDragging 
            ? 'border-primary bg-primary/10 scale-105 shadow-2xl shadow-primary/30 rotate-1' 
            : 'border-border hover:border-primary/50 bg-card/50 hover:shadow-xl hover:scale-[1.01]'
          }
        `}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-primary/5 rounded-2xl animate-pulse" />
        )}
        <div className={`relative transition-all duration-300 ${isDragging ? 'scale-110' : ''}`}>
          <div className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center ${isDragging ? 'animate-bounce' : ''}`}>
            <Upload className={`w-8 h-8 sm:w-10 sm:h-10 transition-all duration-300 ${isDragging ? 'text-primary' : 'text-primary'}`} />
          </div>
        </div>
        <h3 className="text-lg sm:text-xl font-bold mb-2 transition-all">
          {isDragging ? '✨ Drop to upload ✨' : 'Drag & drop files here'}
        </h3>
        <p className="text-sm sm:text-base text-muted-foreground mb-6">
          or click below to browse • Multiple files supported
        </p>
        <Button
          variant="default"
          size="lg"
          className="bg-primary hover:bg-primary/90 hover-lift shadow-lg hover:shadow-xl transition-all"
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <Upload className="w-4 h-4 mr-2" />
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
        <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs">
          <span className="px-3 py-1.5 bg-secondary rounded-full text-muted-foreground hover:bg-secondary/80 transition-colors">📷 Images</span>
          <span className="px-3 py-1.5 bg-secondary rounded-full text-muted-foreground hover:bg-secondary/80 transition-colors">🎥 Videos</span>
          <span className="px-3 py-1.5 bg-secondary rounded-full text-muted-foreground hover:bg-secondary/80 transition-colors">📄 Documents</span>
          <span className="px-3 py-1.5 bg-secondary rounded-full text-muted-foreground hover:bg-secondary/80 transition-colors">📦 Archives</span>
        </div>
      </div>
    </>
  );
};
