import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileIcon, CloudUpload } from "lucide-react";
import { toast } from "sonner";

const Share = () => {
  const { token } = useParams();
  const [file, setFile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadSharedFile();
  }, [token]);

  const loadSharedFile = async () => {
    try {
      const { data: shareData, error: shareError } = await supabase
        .from('file_shares')
        .select(`
          *,
          files (
            *,
            profiles:user_id (
              username,
              avatar_url
            )
          )
        `)
        .eq('share_token', token)
        .single();

      if (shareError) throw shareError;

      setFile(shareData.files);
    } catch (error: any) {
      toast.error("Failed to load shared file");
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async () => {
    if (!file) return;
    
    try {
      setDownloading(true);
      const { data, error } = await supabase.storage
        .from('user-files')
        .download(file.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Download started!");
    } catch (error: any) {
      toast.error("Failed to download file");
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileUrl = () => {
    if (!file) return '';
    const { data } = supabase.storage
      .from('user-files')
      .getPublicUrl(file.storage_path);
    return data.publicUrl;
  };

  const isVideo = file?.mime_type?.startsWith('video/');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md border-border bg-card/50">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">File not found or link has expired</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-4xl border-border bg-card/50 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <CloudUpload className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Shared File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isVideo ? (
            <div className="w-full">
              <video
                src={getFileUrl()}
                controls
                className="w-full h-auto rounded-xl"
                controlsList="nodownload"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 bg-secondary/50 rounded-xl">
              <FileIcon className="w-16 h-16 text-primary" />
            </div>
          )}
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-lg">{file.name}</h3>
            <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
            {file.profiles?.username && (
              <p className="text-xs text-muted-foreground">
                Shared by @{file.profiles.username}
              </p>
            )}
          </div>
          <Button
            onClick={downloadFile}
            disabled={downloading}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <Download className="w-4 h-4 mr-2" />
            {downloading ? "Downloading..." : "Download File"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Share;
