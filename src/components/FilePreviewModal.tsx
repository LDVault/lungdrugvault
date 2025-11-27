import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FilePreviewModalProps {
  file: any;
  open: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export const FilePreviewModal = ({ file, open, onClose, isFavorite, onToggleFavorite }: FilePreviewModalProps) => {
  if (!file) return null;

  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage
        .from("user-files")
        .download(file.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch (error: any) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
    }
  };

  const getFileUrl = () => {
    const { data } = supabase.storage
      .from("user-files")
      .getPublicUrl(file.storage_path);
    return data.publicUrl;
  };

  const isImage = file.mime_type?.startsWith("image/");
  const isVideo = file.mime_type?.startsWith("video/");
  const isPDF = file.mime_type === "application/pdf";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{file.name}</DialogTitle>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleFavorite}
                className={isFavorite ? "text-yellow-500" : ""}
              >
                <Star className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDownload}>
                <Download className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4">
          {isImage && (
            <img
              src={getFileUrl()}
              alt={file.name}
              className="w-full h-auto rounded-lg"
            />
          )}
          {isVideo && (
            <video
              src={getFileUrl()}
              controls
              className="w-full h-auto rounded-lg"
            />
          )}
          {isPDF && (
            <iframe
              src={getFileUrl()}
              className="w-full h-[600px] rounded-lg"
              title={file.name}
            />
          )}
          {!isImage && !isVideo && !isPDF && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-4">Preview not available for this file type</p>
              <Button onClick={handleDownload}>Download File</Button>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium">{file.mime_type}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Size</p>
              <p className="font-medium">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">
                {new Date(file.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Modified</p>
              <p className="font-medium">
                {new Date(file.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
