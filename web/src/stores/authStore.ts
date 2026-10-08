import { supabase } from "@/lib/supabase";
import { create } from "zustand";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

interface AuthState {
  user: AdminUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (key: string) => boolean;
  isRole: (...roles: string[]) => boolean; // ← NEW ✅
}

// ── Valid web roles ───────────────────────────────────────────────────────────
const WEB_ROLES = [
  "admin",
  "admin_technician",
  "admin_sales",
  "manager",
  "developer",
];

// ── Store ─────────────────────────────────────────────────────────────────────
export const useAuthStore = create<AuthState>((set, get) => ({
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
        const { data: userData } = await supabase
          .from("users")
          .select("id, name, role")
          .eq("id", session.user.id)
          .single();

        if (!userData || !WEB_ROLES.includes(userData.role)) {
          await supabase.auth.signOut();
          set({ user: null });
          return;
        }

        const { data: rolePerms } = await supabase
          .from("ref_role_permissions")
          .select("permission_key")
          .eq("role_key", userData.role);

        const { data: userPerms } = await supabase
          .from("user_permissions")
          .select("permission_key, granted")
          .eq("user_id", userData.id);

        const permSet = new Set<string>(
          rolePerms?.map((p) => p.permission_key) ?? [],
        );
        userPerms?.forEach((p) => {
          if (p.granted) permSet.add(p.permission_key);
          else permSet.delete(p.permission_key);
        });

        set({
          user: {
            id: userData.id,
            name: userData.name,
            role: userData.role,
            email: session.user.email ?? "",
            permissions: [...permSet],
          },
        });
      }
    } catch {
      set({ user: null });
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },

  hasPermission: (key: string): boolean => {
    return get().user?.permissions.includes(key) ?? false;
  },

  // ── NEW: check if user has any of the given roles ✅ ──────────────────────
  isRole: (...roles: string[]): boolean => {
    const userRole = get().user?.role ?? "";
    return roles.includes(userRole);
  },
}));
