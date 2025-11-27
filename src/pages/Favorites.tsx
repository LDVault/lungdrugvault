import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, ArrowLeft, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useFavorites } from "@/hooks/useFavorites";
import { FilePreviewModal } from "@/components/FilePreviewModal";

const Favorites = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { favorites, toggleFavorite, isFavorite, loadFavorites } = useFavorites();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (favorites.length > 0) {
      loadFavoriteFiles();
    } else {
      setFiles([]);
      setLoading(false);
    }
  }, [favorites]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadFavoriteFiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("files")
        .select("*")
        .in("id", favorites);

      if (error) throw error;
      setFiles(data || []);
    } catch (error: any) {
      console.error("Error loading favorite files:", error);
      toast.error("Failed to load favorites");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (fileId: string) => {
    await toggleFavorite(fileId);
    await loadFavorites();
  };

  const handleDownload = async (file: any) => {
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

  const openPreview = (file: any) => {
    setSelectedFile(file);
    setPreviewOpen(true);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="hover:bg-secondary"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center">
              <Star className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Favorites</h1>
              <p className="text-muted-foreground">Your starred files</p>
            </div>
          </div>
        </div>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Favorite Files</CardTitle>
            <CardDescription>Quick access to your most important files</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading favorites...
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No favorite files yet</p>
                <p className="text-sm mt-2">Star files to add them to your favorites</p>
              </div>
            ) : (
              <div className="space-y-3">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => openPreview(file)}
                    >
                      <p className="font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(2)} KB • {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(file)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFavorite(file.id)}
                        className="text-yellow-500 hover:text-yellow-600"
                      >
                        <Star className="h-4 w-4 fill-current" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <FilePreviewModal
        file={selectedFile}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        isFavorite={selectedFile ? isFavorite(selectedFile.id) : false}
        onToggleFavorite={() => {
          if (selectedFile) {
            handleRemoveFavorite(selectedFile.id);
          }
        }}
      />
    </div>
  );
};

export default Favorites;
