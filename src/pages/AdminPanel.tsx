import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Shield, ArrowLeft, KeyRound, Megaphone, Wrench, UserCog } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  isAdmin: boolean;
}

const AdminPanel = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementType, setAnnouncementType] = useState<"info" | "warning" | "error">("info");

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchSystemSettings();
    }
  }, [isAdmin]);

  const fetchSystemSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*");

      if (error) throw error;

      data?.forEach((setting) => {
        if (typeof setting.value === 'object' && setting.value !== null) {
          const value = setting.value as Record<string, unknown>;
          
          if (setting.key === "maintenance_mode") {
            setMaintenanceEnabled(Boolean(value.enabled));
            setMaintenanceMessage(String(value.message || ""));
          } else if (setting.key === "announcement") {
            setAnnouncementEnabled(Boolean(value.enabled));
            setAnnouncementMessage(String(value.message || ""));
            setAnnouncementType((value.type as "info" | "warning" | "error") || "info");
          }
        }
      });
    } catch (error) {
      console.error("Error fetching system settings:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-operations', {
        body: { action: 'list_users' },
      });

      if (error) throw error;
      
      setUsers(data.users || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (userId: string, currentlyAdmin: boolean) => {
    try {
      const action = currentlyAdmin ? 'revoke_admin' : 'grant_admin';
      const { data, error } = await supabase.functions.invoke('admin-operations', {
        body: { action, userId },
      });

      if (error) throw error;

      toast.success(data.message);
      await fetchUsers(); // Refresh the list
    } catch (error: any) {
      console.error("Error toggling admin:", error);
      toast.error("Failed to update admin privileges");
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) {
      toast.error("Please enter a new password");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('admin-operations', {
        body: { 
          action: 'reset_password',
          userId: selectedUser.id,
          newPassword: newPassword
        },
      });

      if (error) throw error;

      toast.success(data.message || `Password reset for ${selectedUser.email}`);
      setResetDialogOpen(false);
      setNewPassword("");
      setSelectedUser(null);
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error("Failed to reset password");
    }
  };

  const handleUpdateMaintenance = async () => {
    try {
      const { error } = await supabase
        .from("system_settings")
        .update({
          value: { enabled: maintenanceEnabled, message: maintenanceMessage },
        })
        .eq("key", "maintenance_mode");

      if (error) throw error;
      toast.success("Maintenance mode updated");
    } catch (error) {
      console.error("Error updating maintenance mode:", error);
      toast.error("Failed to update maintenance mode");
    }
  };

  const handleUpdateAnnouncement = async () => {
    try {
      const { error } = await supabase
        .from("system_settings")
        .update({
          value: { enabled: announcementEnabled, message: announcementMessage, type: announcementType },
        })
        .eq("key", "announcement");

      if (error) throw error;
      toast.success("Announcement updated");
    } catch (error) {
      console.error("Error updating announcement:", error);
      toast.error("Failed to update announcement");
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

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
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
              <p className="text-muted-foreground">Manage users and system settings</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                <CardTitle>Maintenance Mode</CardTitle>
              </div>
              <CardDescription>Control site access during maintenance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="maintenance-toggle">Enable Maintenance Mode</Label>
                <Switch
                  id="maintenance-toggle"
                  checked={maintenanceEnabled}
                  onCheckedChange={setMaintenanceEnabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintenance-message">Maintenance Message</Label>
                <Textarea
                  id="maintenance-message"
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  placeholder="Enter message to display during maintenance"
                  className="bg-secondary/50"
                />
              </div>
              <Button onClick={handleUpdateMaintenance} className="w-full">
                Update Maintenance Settings
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-primary" />
                <CardTitle>Site Announcement</CardTitle>
              </div>
              <CardDescription>Display important messages to all users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="announcement-toggle">Show Announcement</Label>
                <Switch
                  id="announcement-toggle"
                  checked={announcementEnabled}
                  onCheckedChange={setAnnouncementEnabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="announcement-type">Type</Label>
                <Select value={announcementType} onValueChange={(value: "info" | "warning" | "error") => setAnnouncementType(value)}>
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="announcement-message">Announcement Message</Label>
                <Textarea
                  id="announcement-message"
                  value={announcementMessage}
                  onChange={(e) => setAnnouncementMessage(e.target.value)}
                  placeholder="Enter announcement message"
                  className="bg-secondary/50"
                />
              </div>
              <Button onClick={handleUpdateAnnouncement} className="w-full">
                Update Announcement
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>View and manage all registered users</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Last Sign In</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      {user.isAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                          <Shield className="w-3 h-3" />
                          Admin
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">User</span>
                      )}
                    </TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {user.last_sign_in_at 
                        ? new Date(user.last_sign_in_at).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
                          className="gap-2"
                        >
                          <UserCog className="h-4 w-4" />
                          {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                        </Button>
                        <Dialog open={resetDialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                          setResetDialogOpen(open);
                          if (!open) {
                            setSelectedUser(null);
                            setNewPassword("");
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                              className="gap-2"
                            >
                              <KeyRound className="h-4 w-4" />
                              Reset Password
                            </Button>
                          </DialogTrigger>
                        <DialogContent className="border-border bg-card">
                          <DialogHeader>
                            <DialogTitle>Reset Password</DialogTitle>
                            <DialogDescription>
                              Enter a new password for {user.email}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="newPassword">New Password</Label>
                              <Input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password (min 6 characters)"
                                className="bg-secondary/50"
                              />
                            </div>
                            <Button
                              onClick={handleResetPassword}
                              className="w-full bg-primary hover:bg-primary/90"
                            >
                              Reset Password
                            </Button>
                          </div>
                        </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPanel;
