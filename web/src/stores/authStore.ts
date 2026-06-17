import { supabase } from "@/lib/supabase";
import { create } from "zustand";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: AdminUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data } = await supabase
          .from("users")
          .select("id, name, role")
          .eq("id", session.user.id)
          .single();

        if (data && ["admin", "supervisor"].includes(data.role)) {
          set({
            user: {
              id: data.id,
              name: data.name,
              role: data.role,
              email: session.user.email ?? "",
            },
          });
        } else {
          // Not an admin — sign out
          await supabase.auth.signOut();
          set({ user: null });
        }
      }
    } catch (err) {
      set({ user: null });
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },
}));
