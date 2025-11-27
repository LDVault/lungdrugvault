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

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      setFileName(file.name);
      setUploadProgress(0);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You must be logged in to upload files");
        return;
      }

      const fileExt = file.name.split('.').pop();
      const storagePath = `${user.id}/${Date.now()}.${fileExt}`;

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 100);

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(storagePath, file);

      clearInterval(progressInterval);
      setUploadProgress(95);

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

      setUploadProgress(100);
      toast.success(`${file.name} uploaded successfully!`);
      
      setTimeout(() => {
        onUploadComplete();
        setUploadProgress(0);
        setFileName("");
      }, 500);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file");
      setUploadProgress(0);
      setFileName("");
    } finally {
      setUploading(false);
    }
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
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground truncate max-w-xs">{fileName}</span>
            <span className="text-primary font-medium">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}
    </div>
  );
};
