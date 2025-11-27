import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";

interface FileUploadProps {
  onUploadComplete: () => void;
  currentFolderId?: string | null;
}

export const FileUpload = ({ onUploadComplete, currentFolderId }: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [uploadSpeed, setUploadSpeed] = useState<number>(0);

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      setFileName(file.name);
      setUploadProgress(0);
      setTimeRemaining(null);
      setUploadSpeed(0);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You must be logged in to upload files");
        return;
      }

      const fileExt = file.name.split('.').pop();
      const storagePath = `${user.id}/${Date.now()}.${fileExt}`;

      const startTime = Date.now();
      const fileSize = file.size;
      let progressInterval: NodeJS.Timeout;

      // Estimate progress based on typical upload speeds
      const estimateProgress = () => {
        const elapsed = (Date.now() - startTime) / 1000; // seconds
        // Estimate speed based on file size (conservative estimate)
        const estimatedTotalTime = Math.max(2, fileSize / (500 * 1024)); // Assume 500 KB/s minimum
        const progressPercent = Math.min(95, (elapsed / estimatedTotalTime) * 100);
        
        setUploadProgress(Math.round(progressPercent));
        
        // Calculate speed and time remaining
        const bytesUploaded = (progressPercent / 100) * fileSize;
        const speed = bytesUploaded / elapsed;
        setUploadSpeed(speed);
        
        const remainingBytes = fileSize - bytesUploaded;
        const remainingTime = remainingBytes / speed;
        setTimeRemaining(remainingTime);
      };

      progressInterval = setInterval(estimateProgress, 200);

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      clearInterval(progressInterval);
      setUploadProgress(100);
      setTimeRemaining(0);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          name: file.name,
          size: file.size,
          mime_type: file.type,
          storage_path: storagePath,
          folder_id: currentFolderId,
        });

      if (dbError) throw dbError;

      toast.success(`${file.name} uploaded successfully!`);
      
      setTimeout(() => {
        onUploadComplete();
        setUploadProgress(0);
        setFileName("");
        setTimeRemaining(null);
        setUploadSpeed(0);
      }, 500);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file");
      setUploadProgress(0);
      setFileName("");
      setTimeRemaining(null);
      setUploadSpeed(0);
    } finally {
      setUploading(false);
    }
  };

  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const formatTimeRemaining = (seconds: number) => {
    if (seconds < 1) return "Almost done...";
    if (seconds < 60) return `${Math.round(seconds)}s remaining`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s remaining`;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach(uploadFile);
  }, []);

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
    files.forEach(uploadFile);
  };

  return (
    <div className="space-y-4">
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
        <p className="text-muted-foreground mb-6">or click to browse</p>
        <Button
          variant="default"
          className="bg-primary hover:bg-primary/90"
          disabled={uploading}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          {uploading ? "Uploading..." : "Select Files"}
        </Button>
        <input
          id="file-input"
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
      </div>
      
      {uploading && uploadProgress > 0 && (
        <div className="space-y-2 bg-card/80 border border-border rounded-lg p-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-foreground font-medium truncate max-w-xs">{fileName}</span>
            <span className="text-primary font-bold">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>
              {uploadSpeed > 0 ? formatSpeed(uploadSpeed) : "Calculating..."}
            </span>
            <span>
              {timeRemaining !== null && timeRemaining > 0 
                ? formatTimeRemaining(timeRemaining)
                : uploadProgress === 100 
                ? "Complete!" 
                : "Preparing..."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
