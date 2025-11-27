import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FileUpload } from "@/components/FileUpload";
import { FileGrid } from "@/components/FileGrid";
import { FolderGrid } from "@/components/FolderGrid";
import { CreateFolderDialog } from "@/components/CreateFolderDialog";
import { Button } from "@/components/ui/button";
import { CloudUpload, LogOut, Shield, Settings, Share2, ArrowLeft } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const Index = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useIsAdmin();

  useEffect(() => {
    checkAuth();
    loadFiles();
    loadFolders();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, currentFolderId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadFiles = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('files')
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url
          )
        `);

      if (currentFolderId) {
        query = query.eq('folder_id', currentFolderId);
      } else {
        query = query.is('folder_id', null);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error: any) {
      console.error("Error loading files:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select(`
          *,
          profiles:user_id (
            username
          )
        `)
        .is('parent_folder_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFolders(data || []);
    } catch (error: any) {
      console.error("Error loading folders:", error);
    }
  };

  const handleFolderClick = (folderId: string) => {
    setCurrentFolderId(folderId);
  };

  const handleBackClick = () => {
    setCurrentFolderId(null);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <CloudUpload className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">CloudVault</h1>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => navigate("/admin")}
                className="gap-2 border-border hover:bg-secondary"
              >
                <Shield className="w-4 h-4" />
                Admin Panel
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => navigate("/shared")}
              className="gap-2 border-border hover:bg-secondary"
            >
              <Share2 className="w-4 h-4" />
              Shared With Me
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/settings")}
              className="gap-2 border-border hover:bg-secondary"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Button>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex gap-4">
          <FileUpload onUploadComplete={loadFiles} currentFolderId={currentFolderId} />
          {!currentFolderId && <CreateFolderDialog onFolderCreated={loadFolders} />}
        </div>
        
        <div>
          <div className="flex items-center gap-4 mb-6">
            {currentFolderId && (
              <Button
                variant="ghost"
                onClick={handleBackClick}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            )}
            <h2 className="text-2xl font-bold">
              {currentFolderId ? "Folder Contents" : "Your Files & Folders"}
            </h2>
          </div>
          {loading ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <>
              {!currentFolderId && (
                <FolderGrid 
                  folders={folders} 
                  onFolderDeleted={loadFolders}
                  onFolderClick={handleFolderClick}
                />
              )}
              <FileGrid 
                files={files} 
                onFileDeleted={loadFiles}
                currentFolderId={currentFolderId}
                folders={folders}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
