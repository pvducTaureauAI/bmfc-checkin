import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

interface User {
    id: string;
    email: string;
}

const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const tUser = await supabase.auth.getUser();
      if (tUser.data.user) {
        setUser({
          id: tUser.data.user.id,
          email: tUser.data.user.email || "",
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    } finally {
      setLoading(false);
    }
  }

    const logout = async () => {
        try {
            await supabase.auth.signOut();
            setUser(null);
        } catch (error) {
            console.error("Error logging out:", error);
        }        
    }

    useEffect(() => {
        fetchUser();
    }, []);

    return { user, loading, fetchUser, logout };
};

export default useAuth;