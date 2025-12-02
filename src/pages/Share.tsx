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
  const [videoUrl, setVideoUrl] = useState<string>('');

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
      
      // Get signed URL for video if it's a video file
      if (shareData.files?.mime_type?.startsWith('video/')) {
        const url = await getFileUrl();
        setVideoUrl(url);
      }
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

  const getFileUrl = async () => {
    if (!file) return '';
    try {
      const { data, error } = await supabase.storage
        .from('user-files')
        .createSignedUrl(file.storage_path, 3600); // 1 hour expiry
      
      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return '';
    }
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 p-4">
      <Card className="w-full max-w-4xl border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl hover-lift">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl flex items-center justify-center mb-2 shadow-lg">
            <CloudUpload className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Shared File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isVideo && videoUrl ? (
            <div className="w-full rounded-2xl overflow-hidden shadow-2xl bg-black">
              <video
                src={videoUrl}
                controls
                className="w-full h-auto"
                controlsList="nodownload"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          ) : !isVideo && (
            <div className="flex items-center justify-center h-40 bg-gradient-to-br from-secondary/50 to-accent/20 rounded-2xl border border-border/50">
              <FileIcon className="w-20 h-20 text-primary/70" />
            </div>
          )}
          <div className="text-center space-y-3 py-4">
            <h3 className="font-bold text-xl">{file.name}</h3>
            <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
              <span className="px-3 py-1 bg-secondary/50 rounded-full">{formatFileSize(file.size)}</span>
              {file.profiles?.username && (
                <span className="px-3 py-1 bg-secondary/50 rounded-full">
                  Shared by @{file.profiles.username}
                </span>
              )}
            </div>
          </div>
          <Button
            onClick={downloadFile}
            disabled={downloading}
            className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg hover:shadow-xl transition-all text-primary-foreground font-semibold py-6 rounded-xl"
          >
            <Download className="w-5 h-5 mr-2" />
            {downloading ? "Downloading..." : "Download File"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Share;
