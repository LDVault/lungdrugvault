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
      {/* Hero Header with Gradient */}
      <header className="border-b border-border bg-gradient-to-r from-card/80 via-card/50 to-card/80 backdrop-blur-md sticky top-0 z-10 shadow-lg animate-fade-in">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center shadow-inner">
                <CloudUpload className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">CloudVault</h1>
                <p className="text-xs text-muted-foreground">Secure Cloud Storage</p>
              </div>
            </div>
            <nav className="flex gap-2">
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => navigate("/admin")}
                  className="gap-2 border-border hover:bg-accent hover:border-primary/30 transition-smooth"
                >
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin Panel</span>
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => navigate("/shared")}
                className="gap-2 border-border hover:bg-accent hover:border-primary/30 transition-smooth"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Shared</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/settings")}
                className="gap-2 border-border hover:bg-accent hover:border-primary/30 transition-smooth"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="hover:bg-destructive/10 hover:text-destructive transition-smooth"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10">
        {/* Upload Section */}
        <section className="mb-12 animate-fade-in-up">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-4 items-start">
              <div className="flex-1">
                <FileUpload onUploadComplete={loadFiles} currentFolderId={currentFolderId} />
              </div>
              {!currentFolderId && (
                <div className="shrink-0">
                  <CreateFolderDialog onFolderCreated={loadFolders} />
                </div>
              )}
            </div>
          </div>
        </section>
        
        {/* Content Section */}
        <section>
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {currentFolderId && (
                  <Button
                    variant="ghost"
                    onClick={handleBackClick}
                    className="gap-2 hover:bg-accent transition-smooth"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                )}
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">
                    {currentFolderId ? "Folder Contents" : "Your Storage"}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentFolderId ? "Browse files in this folder" : "All your files and folders"}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-24">
              <div className="inline-flex items-center gap-3 text-muted-foreground">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-lg">Loading your files...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {!currentFolderId && folders.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-primary rounded-full" />
                    Folders
                  </h3>
                  <FolderGrid 
                    folders={folders} 
                    onFolderDeleted={loadFolders}
                    onFolderClick={handleFolderClick}
                  />
                </div>
              )}
              
              {files.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-primary rounded-full" />
                    Files
                  </h3>
                  <FileGrid 
                    files={files} 
                    onFileDeleted={loadFiles}
                    currentFolderId={currentFolderId}
                    folders={folders}
                  />
                </div>
              )}
              
              {files.length === 0 && (!folders.length || currentFolderId) && (
                <div className="text-center py-24">
                  <div className="w-24 h-24 mx-auto mb-6 bg-secondary/30 rounded-full flex items-center justify-center">
                    <CloudUpload className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No files yet</h3>
                  <p className="text-muted-foreground">Upload your first file to get started</p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Index;
