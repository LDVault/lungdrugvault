import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "./ui/button";

interface FileUploadProps {
  onUploadComplete: () => void;
  currentFolderId?: string | null;
}

export const FileUpload = ({ onUploadComplete, currentFolderId }: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You must be logged in to upload files");
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          name: file.name,
          size: file.size,
          mime_type: file.type,
          storage_path: fileName,
          folder_id: currentFolderId,
        });

      if (dbError) throw dbError;

      toast.success(`${file.name} uploaded successfully!`);
      onUploadComplete();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file");
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
  );
};
