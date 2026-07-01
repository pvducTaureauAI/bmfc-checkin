import { Outlet, NavLink, useNavigate } from "react-router";
import { useState } from "react";
import useAuth from "../hooks/useAuth";
import Modal from "./Modal";

const ModalAuth = ({open, onClose}: {open: boolean, onClose: () => void}) => {
    const { logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        onClose();
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
        >
            <button
                onClick={handleLogout}
                className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition duration-200"
            >
                Đăng xuất
            </button>
        </Modal>
    )
}

export default function Layout() {
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();

    const navigateToLogin = () => {
        navigate("/dang-nhap");
    }

  // Danh sách các menu điều hướng
  const navItems = [
    { path: "/", label: "Trang chủ", icon: "🏠" },
    { path: "/quan-ly-thu-chi", label: "Quản lý thu chi", icon: "🔍" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 md:flex">
      
      {/* 1. SIDEBAR (Chỉ hiển thị từ màn hình Desktop `md:` trở lên) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-slate-200 p-4">
        <div className="text-xl font-bold p-2 text-indigo-600 mb-6">Bình Minh FC</div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-indigo-50 text-indigo-600" 
                    : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* 2. KHU VỰC NỘI DUNG CHÍNH */}
      {/* Trên desktop, cần dịch lề trái `md:pl-64` để không bị Sidebar đè lên */}
      <div className="flex-1 flex flex-col md:pl-64">
        
        {/* HEADER (Sticky cố định ở trên cho cả mobile và desktop) */}
        <header className="sticky top-0 z-0 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur px-4 md:px-8">
          <div className="font-semibold text-lg md:text-xl">
            {/* Trên mobile hiện logo nhỏ, lên desktop có thể ẩn đi vì đã có ở sidebar */}
            <span className="md:hidden text-indigo-600 font-bold">My App</span>
            <span className="hidden md:inline">Bảng điều khiển</span>
          </div>
          
          {user && (
            <button className="flex items-center gap-4" onClick={() => setIsModalOpen(true)}>
              <div className="w-8 h-8 rounded-full bg-slate-300 overflow-hidden flex items-center justify-center text-slate-600 font-semibold">
                {user.email.charAt(0).toUpperCase()}
              </div>
                <span className="hidden md:inline">{user.email}</span>
            </button>
          )}
            {!user && (
                <button className="flex items-center gap-4" onClick={navigateToLogin}>
                    Đăng nhập
                </button>
            )}
        </header>

        {/* MAIN CONTENT WORKSPACE */}
        {/* pb-20 để dành chỗ cho Bottom Nav trên mobile không che mất nội dung cuối trang */}
        <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* 3. BOTTOM NAVIGATION (Chỉ hiển thị trên Mobile, ẩn khi lên `md:hidden`) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-0 bg-white/90 backdrop-blur border-t border-slate-200 flex justify-around items-center h-16 pb-safe">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full text-xs font-medium transition-colors ${
                isActive ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
              }`
            }
          >
            <span className="text-xl mb-0.5">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

        <ModalAuth open={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}