import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Favorite {
  id: string;
  file_id: string;
  user_id: string;
  created_at: string;
}

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("favorites")
        .select("file_id")
        .eq("user_id", user.id);

      if (error) throw error;
      setFavorites(data?.map(f => f.file_id) || []);
    } catch (error: any) {
      console.error("Error loading favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (fileId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isFavorite = favorites.includes(fileId);

      if (isFavorite) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("file_id", fileId)
          .eq("user_id", user.id);

        if (error) throw error;
        setFavorites(prev => prev.filter(id => id !== fileId));
        toast.success("Removed from favorites");
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ file_id: fileId, user_id: user.id });

        if (error) throw error;
        setFavorites(prev => [...prev, fileId]);
        toast.success("Added to favorites");
      }
    } catch (error: any) {
      console.error("Error toggling favorite:", error);
      toast.error("Failed to update favorite");
    }
  };

  const isFavorite = (fileId: string) => favorites.includes(fileId);

  return { favorites, loading, toggleFavorite, isFavorite, loadFavorites };
};
