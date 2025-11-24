import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FileUpload } from "@/components/FileUpload";
import { FileGrid } from "@/components/FileGrid";
import { Button } from "@/components/ui/button";
import { CloudUpload, LogOut, Shield } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const Index = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useIsAdmin();

  useEffect(() => {
    checkAuth();
    loadFiles();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadFiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error: any) {
      console.error("Error loading files:", error);
    } finally {
      setLoading(false);
    }
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
        <FileUpload onUploadComplete={loadFiles} />
        
        <div>
          <h2 className="text-2xl font-bold mb-6">Your Files</h2>
          {loading ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">Loading files...</p>
            </div>
          ) : (
            <FileGrid files={files} onFileDeleted={loadFiles} />
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
