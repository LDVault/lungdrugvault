import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Folder, Trash2, Share2, FolderOpen, Users, FolderInput } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter } from "./ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

interface FolderType {
  id: string;
  name: string;
  created_at: string;
  user_id: string;
  profiles?: {
    username: string | null;
  };
}

interface FolderGridProps {
  folders: FolderType[];
  onFolderDeleted: () => void;
  onFolderClick: (folderId: string) => void;
}

export const FolderGrid = ({ folders, onFolderDeleted, onFolderClick }: FolderGridProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<any>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const deleteFolder = async (folder: FolderType) => {
    try {
      setDeletingId(folder.id);

      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folder.id);

      if (error) throw error;

      toast.success("Folder deleted successfully");
      onFolderDeleted();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete folder");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(folderId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);
  };

  const handleDrop = async (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);

    const fileId = e.dataTransfer.getData('application/x-file-id');
    if (!fileId) {
      console.log('No file ID found in drag data');
      return;
    }

    try {
      const { error } = await supabase
        .from('files')
        .update({ folder_id: folderId })
        .eq('id', fileId);

      if (error) throw error;

      toast.success("File moved to folder successfully!");
      onFolderDeleted(); // Refresh the view
    } catch (error: any) {
      console.error('Move error:', error);
      toast.error(error.message || "Failed to move file");
    }
  };

  if (folders.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
      {folders.map((folder, index) => (
        <Card
          key={folder.id}
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder.id)}
          className={`group bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 transition-smooth overflow-hidden cursor-pointer hover-lift animate-fade-in-up ${
            dragOverFolder === folder.id ? 'border-primary border-2 bg-primary/10 scale-105' : ''
          }`}
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <CardContent className="p-6" onClick={() => onFolderClick(folder.id)}>
            <div className="flex items-center justify-center h-32 mb-4 bg-secondary/50 rounded-xl relative">
              <Folder className="w-16 h-16 text-primary" />
              {dragOverFolder === folder.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-primary/20 rounded-xl">
                  <FolderInput className="w-12 h-12 text-primary animate-pulse" />
                </div>
              )}
            </div>
            <h3 className="font-semibold truncate mb-1" title={folder.name}>
              {folder.name}
            </h3>
            {folder.profiles?.username && (
              <p className="text-xs text-muted-foreground">
                By @{folder.profiles.username}
              </p>
            )}
          </CardContent>
          <CardFooter className="flex gap-2 p-4 pt-0">
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 hover:bg-primary/10 hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                onFolderClick(folder.id);
              }}
            >
              <FolderOpen className="w-4 h-4" />
            </Button>
            
            <Dialog open={shareDialogOpen && selectedFolder?.id === folder.id} onOpenChange={(open) => {
              setShareDialogOpen(open);
              if (!open) {
                setSelectedFolder(null);
                setShareEmail("");
              } else {
                loadUsers();
              }
            }}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1 hover:bg-primary/10 hover:text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFolder(folder);
                  }}
                >
                  <Users className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                  <DialogTitle>Share Folder</DialogTitle>
                  <DialogDescription>
                    Share this folder with another user on the platform
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Select User</label>
                    <select 
                      className="w-full mt-2 px-3 py-2 bg-secondary/50 border border-border rounded-lg"
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                    >
                      <option value="">Choose a user...</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.username || 'No username'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button 
                    className="w-full"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!shareEmail || !selectedFolder) return;
                      
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) return;

                        const { error } = await supabase
                          .from('shared_items')
                          .insert({
                            item_type: 'folder',
                            item_id: selectedFolder.id,
                            shared_by_user_id: user.id,
                            shared_with_user_id: shareEmail,
                          });

                        if (error) throw error;
                        
                        toast.success("Folder shared successfully!");
                        setShareDialogOpen(false);
                        setSelectedFolder(null);
                        setShareEmail("");
                      } catch (error: any) {
                        toast.error(error.message || "Failed to share folder");
                      }
                    }}
                  >
                    Share Folder
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1 hover:bg-destructive/10 hover:text-destructive"
                  disabled={deletingId === folder.id}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border" onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Folder</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{folder.name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFolder(folder);
                    }}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};
