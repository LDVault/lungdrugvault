import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileIcon, Play, FileText, File } from "lucide-react";

interface FileThumbnailProps {
  file: {
    id: string;
    name: string;
    mime_type: string;
    storage_path: string;
  };
  onClick?: () => void;
}

export const FileThumbnail = ({ file, onClick }: FileThumbnailProps) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadThumbnail();
  }, [file.id]);

  const loadThumbnail = async () => {
    if (file.mime_type.startsWith('image/')) {
      try {
        const { data, error } = await supabase.storage
          .from('user-files')
          .createSignedUrl(file.storage_path, 3600);

        if (!error && data) {
          setThumbnailUrl(data.signedUrl);
        }
      } catch (error) {
        console.error('Error loading thumbnail:', error);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  const isVideo = file.mime_type.startsWith('video/');
  const isImage = file.mime_type.startsWith('image/');
  const isPdf = file.mime_type === 'application/pdf';
  const isText = file.mime_type.startsWith('text/');

  return (
    <div 
      className="flex items-center justify-center h-32 mb-4 bg-secondary/30 rounded-xl relative group cursor-pointer overflow-hidden transition-all hover:scale-105"
      onClick={onClick}
    >
      {loading && isImage ? (
        <div className="absolute inset-0 animate-pulse bg-secondary/50 rounded-xl" />
      ) : thumbnailUrl ? (
        <img 
          src={thumbnailUrl} 
          alt={file.name}
          className="w-full h-full object-cover rounded-xl"
        />
      ) : isVideo ? (
        <>
          <FileIcon className="w-16 h-16 text-primary" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
            <Play className="w-12 h-12 text-white drop-shadow-lg" />
          </div>
        </>
      ) : isPdf ? (
        <div className="flex flex-col items-center gap-2">
          <FileText className="w-16 h-16 text-destructive" />
          <span className="text-xs text-muted-foreground font-medium">PDF</span>
        </div>
      ) : isText ? (
        <div className="flex flex-col items-center gap-2">
          <FileText className="w-16 h-16 text-primary" />
          <span className="text-xs text-muted-foreground font-medium">TEXT</span>
        </div>
      ) : (
        <File className="w-16 h-16 text-muted-foreground" />
      )}
    </div>
  );
};
