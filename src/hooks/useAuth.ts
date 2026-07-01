// useAuth.ts (Bản tối ưu hóa reactive)
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

interface User {
  id: string;
  email: string;
}

const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Kiểm tra session hiện tại khi ứng dụng khởi chạy
    const getSession = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          setUser({ id: currentUser.id, email: currentUser.email || "" });
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // 2. ĐĂNG KÝ LẮNG NGHE SỰ KIỆN THAY ĐỔI AUTH (Login/Logout từ mọi nơi trong app)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || "" });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Clean up sự kiện khi component unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error("Error logging out:", error);
    }        
  };

  return { user, loading, logout };
};

export default useAuth;