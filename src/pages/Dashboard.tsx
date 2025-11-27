import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  HardDrive, 
  File, 
  Folder, 
  Share2, 
  Upload, 
  TrendingUp,
  Clock,
  Image,
  Video,
  FileText,
  Archive
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface StorageStats {
  totalSize: number;
  fileCount: number;
  folderCount: number;
  sharedCount: number;
}

interface RecentFile {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  created_at: string;
  folder_id: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StorageStats>({
    totalSize: 0,
    fileCount: 0,
    folderCount: 0,
    sharedCount: 0,
  });
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
    fetchDashboardData(user.id);
  };

  const fetchDashboardData = async (userId: string) => {
    try {
      // Fetch files
      const { data: files, error: filesError } = await supabase
        .from("files")
        .select("id, name, mime_type, size, created_at, folder_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (filesError) throw filesError;

      // Fetch folders
      const { data: folders, error: foldersError } = await supabase
        .from("folders")
        .select("id")
        .eq("user_id", userId);

      if (foldersError) throw foldersError;

      // Fetch shared items
      const { data: shared, error: sharedError } = await supabase
        .from("shared_items")
        .select("id")
        .eq("shared_with_user_id", userId);

      if (sharedError) throw sharedError;

      // Calculate stats
      const totalSize = files?.reduce((acc, file) => acc + (file.size || 0), 0) || 0;
      
      setStats({
        totalSize,
        fileCount: files?.length || 0,
        folderCount: folders?.length || 0,
        sharedCount: shared?.length || 0,
      });

      setRecentFiles(files?.slice(0, 5) || []);
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (mimeType.startsWith('text/') || mimeType.includes('document')) return <FileText className="h-4 w-4" />;
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return <Archive className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const storageLimit = 5 * 1024 * 1024 * 1024; // 5GB limit
  const storagePercentage = (stats.totalSize / storageLimit) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's an overview of your storage.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border bg-card/50 backdrop-blur-sm hover-lift animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <HardDrive className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Storage Used</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{formatBytes(stats.totalSize)}</div>
              <Progress value={storagePercentage} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {storagePercentage.toFixed(1)}% of 5GB used
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur-sm hover-lift animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <File className="h-5 w-5 text-blue-500" />
                </div>
                <CardTitle className="text-lg">Total Files</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.fileCount}</div>
              <p className="text-xs text-muted-foreground mt-2">Files in your storage</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur-sm hover-lift animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Folder className="h-5 w-5 text-green-500" />
                </div>
                <CardTitle className="text-lg">Folders</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.folderCount}</div>
              <p className="text-xs text-muted-foreground mt-2">Organized folders</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur-sm hover-lift animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Share2 className="h-5 w-5 text-purple-500" />
                </div>
                <CardTitle className="text-lg">Shared With Me</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.sharedCount}</div>
              <p className="text-xs text-muted-foreground mt-2">Items shared with you</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-border bg-card/50 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Button
                onClick={() => navigate("/")}
                className="h-auto flex-col gap-2 py-6"
                variant="outline"
              >
                <Upload className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-semibold">Upload Files</div>
                  <div className="text-xs text-muted-foreground">Add new files to storage</div>
                </div>
              </Button>
              <Button
                onClick={() => navigate("/")}
                className="h-auto flex-col gap-2 py-6"
                variant="outline"
              >
                <Folder className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-semibold">Create Folder</div>
                  <div className="text-xs text-muted-foreground">Organize your files</div>
                </div>
              </Button>
              <Button
                onClick={() => navigate("/shared")}
                className="h-auto flex-col gap-2 py-6"
                variant="outline"
              >
                <Share2 className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-semibold">View Shared</div>
                  <div className="text-xs text-muted-foreground">See shared items</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Files */}
        <Card className="border-border bg-card/50 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle>Recent Files</CardTitle>
            </div>
            <CardDescription>Your most recently uploaded files</CardDescription>
          </CardHeader>
          <CardContent>
            {recentFiles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No files yet. Upload your first file to get started!</p>
                <Button onClick={() => navigate("/")} className="mt-4">
                  Upload Files
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => navigate("/")}
                  >
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {getFileIcon(file.mime_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(file.size)} • {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Storage Warning */}
        {storagePercentage > 80 && (
          <Card className="border-orange-500/50 bg-orange-500/10 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
            <CardHeader>
              <CardTitle className="text-orange-500">Storage Warning</CardTitle>
              <CardDescription>You're running low on storage space</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You've used {storagePercentage.toFixed(1)}% of your storage. Consider deleting unused files or upgrading your storage plan.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
