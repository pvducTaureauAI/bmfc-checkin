// FootballManager.tsx
import { useState, useEffect } from "react";
import { footballService } from "../footballService";
import { supabase } from "../utils/supabase"; // Dùng để fetch nhanh data tài chính/settings
import { 
  AttendanceStatus, 
  MatchStatus, 
  MatchResult, 
  PlayerAttendance, 
  Match, 
  PenaltySettings 
} from "../common/types";
import useAuth from "../hooks/useAuth";

interface FinanceRow {
  id: string;
  name: string;
  is_paid: boolean;
  total_debt: number;
}

export default function FootballManager() {
  const {user} = useAuth();
  // --- Các State Quản Lý Giao Diện & Dữ Liệu ---
  const [activeTab, setActiveTab] = useState<"daily" | "finance" | "settings">("daily");
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<PlayerAttendance[]>([]);
  const [financeRecords, setFinanceRecords] = useState<FinanceRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // State cục bộ cho cấu hình phạt
  const [penaltySettings, setPenaltySettings] = useState<PenaltySettings>({
    penalty_forgot: 20000,
    penalty_no_show: 50000,
    penalty_missed_week: 30000,
    penalty_loss: 20000,
    monthly_fee: 100000,
  });

  // --- useEffect Tải Dữ Liệu Ban Đầu ---
  useEffect(() => {
    fetchInitialData();
  }, [activeTab]); // Load lại dữ liệu tương ứng khi chuyển Tab

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === "daily") {
        // 1. Lấy hoặc tạo trận đấu hôm nay
        const match = await footballService.getOrCreateTodayMatch();
        setCurrentMatch(match);
        
        // 2. Lấy danh sách điểm danh của trận đó
        const attendanceData = await footballService.getAttendance(match.id);
        setPlayers(attendanceData);
      } 
      
      else if (activeTab === "finance") {
        // Tải danh sách tài chính thành viên (Tổng hợp tiền nợ phạt từ bảng bmfc_finances)
        const { data: usersData, error: userErr } = await supabase.from("bmfc_user").select("id, name");
        const { data: finData, error: finErr } = await supabase.from("bmfc_finances").select("*");
        
        if (userErr || finErr) throw userErr || finErr;

        const summary: FinanceRow[] = usersData.map((u: any) => {
          const userDebts = finData?.filter((f: any) => f.user_id === u.id && !f.is_paid) || [];
          const totalDebt = userDebts.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
          // Giả định kiểm tra xem đã đóng quỹ tháng chưa (Ví dụ loại 'monthly' của tháng hiện tại)
          const hasPaidMonthly = finData?.some((f: any) => f.user_id === u.id && f.type === "monthly" && f.is_paid) || false;

          return {
            id: u.id,
            name: u.name,
            is_paid: hasPaidMonthly,
            total_debt: totalDebt
          };
        });
        setFinanceRecords(summary);
      } 
      
      else if (activeTab === "settings") {
        // Tải cấu hình định mức phạt từ DB
        const { data: settingsData } = await supabase.from("bmfc_settings").select("key, value");
        if (settingsData) {
          const config = Object.fromEntries(settingsData.map((s: { key: any; value: any; }) => [s.key, Number(s.value)]));
          setPenaltySettings((prev: any) => ({ ...prev, ...config }));
        }
      }
    } catch (error: any) {
      alert("Lỗi tải dữ liệu: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Các Hàm Xử Lý Sự Kiện (Handlers) ---
  
  // Thay đổi trạng thái điểm danh của từng thành viên trên UI
  const handleTickAttendance = (playerId: string, newStatus: AttendanceStatus) => {
    setPlayers(prev =>
      prev.map(p => p.id === playerId ? { ...p, status: newStatus } : p)
    );
  };

  // Lưu tạm danh sách điểm danh (khi admin đang bấm trên sân)
  const handleSaveDraft = async () => {
    if (!currentMatch) return;
    try {
      setSubmitting(true);
      await footballService.saveAttendance(currentMatch.id, players);
      alert("Đã lưu tạm trạng thái điểm danh công thành!");
    } catch (error: any) {
      alert("Lỗi lưu tạm: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // CHỐT SỔ CUỐI NGÀY: Cập nhật kết quả trận & Tự động phạt (Hòa = Thua)
  const handleConfirmMatch = async (status: MatchStatus, result: MatchResult | null) => {
    if (!currentMatch) return;
    const confirmText = result === MatchResult.DRAW 
      ? "Bạn chắc chắn chốt HÒA? Toàn bộ AE ra sân sẽ bị tính phạt như THUA theo luật! 💸" 
      : "Xác nhận chốt kết quả trận đấu hôm nay?";
      
    if (!window.confirm(confirmText)) return;

    try {
      setSubmitting(true);
      // 1. Đồng bộ danh sách điểm danh hiện tại lên DB trước
      await footballService.saveAttendance(currentMatch.id, players);
      // 2. Chốt trận và quét phạt tự động
      await footballService.confirmMatchAndCheckPenalties(currentMatch.id, status, result);
      
      alert("Đã chốt sổ thành công! Tiền phạt đã tự động ghi nhận vào tài khoản thành viên.");
      // Cập nhật lại trạng thái trận đấu cục bộ
      setCurrentMatch((prev: any) => prev ? { ...prev, status, result } : null);
    } catch (error: any) {
      alert("Lỗi chốt sổ: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Cập nhật cấu hình phạt lên Supabase
  const handleUpdateSettings = async () => {
    try {
      setSubmitting(true);
      const upsertData = Object.entries(penaltySettings).map(([key, value]) => ({ key, value }));
      const { error } = await supabase.from("bmfc_settings").upsert(upsertData);
      if (error) throw error;
      alert("Cập nhật định mức phạt thành công!");
    } catch (error: any) {
      alert("Lỗi cập nhật cấu hình: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Thu tiền phạt / tiền quỹ nhanh của thành viên
  const handleClearDebt = async (userId: string) => {
    if (!window.confirm("Xác nhận thành viên này đã đóng toàn bộ tiền nợ phạt?")) return;
    try {
      const { error } = await supabase
        .from("bmfc_finances")
        .update({ is_paid: true })
        .eq("user_id", userId)
        .eq("type", "penalty");
        
      if (error) throw error;
      alert("Đã ghi nhận đóng phạt!");
      fetchInitialData(); // Reload lại bảng tài chính
    } catch (error: any) {
      alert("Lỗi xử lý đóng tiền: " + error.message);
    }
  };


  // --- GIAO DIỆN COMPONENT (Mobile-First Layout) ---
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-24 font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-emerald-400 flex items-center gap-2">⚽ BMFC Manager</h1>
          <p className="text-xs text-slate-400">Điều hành nội bộ đội bóng</p>
        </div>
        <span className="text-xs bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700 text-slate-300">Admin Panel</span>
      </header>

      {/* LOADER */}
      {loading ? (
        <div className="flex flex-col items-center justify-center pt-32 space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400">Đang đồng bộ dữ liệu sân bóng...</p>
        </div>
      ) : (
        <main className="max-w-md mx-auto p-4 sm:max-w-xl md:max-w-2xl">
          
          {/* TAB 1: ĐIỂM DANH HÀNG NGÀY */}
          {activeTab === "daily" && currentMatch && (
            <div className="space-y-4">
              
              {/* Box Trạng Thái Trận Đấu */}
              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700/60 shadow-xl">
                <h3 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Trạng Thái Trận Hôm Nay</h3>
                
                {/* 3 nút chính */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { status: MatchStatus.PENDING, label: "⏳ Chờ đá" },
                    { status: MatchStatus.ORGANIZED, label: "✅ Lên trận" },
                    { status: MatchStatus.CANCELLED, label: "❌ Hủy buổi" }
                  ].map((item) => (
                    <button
                      key={item.status}
                      disabled={submitting}
                      onClick={() => handleConfirmMatch(item.status, item.status === MatchStatus.ORGANIZED ? MatchResult.DRAW : null)}
                      className={`py-2 px-1 text-xs font-medium rounded-xl border transition-all ${
                        currentMatch.status === item.status
                          ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20 font-bold"
                          : "bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Kết Quả Trận Đấu (Hiện ra khi chọn Lên trận - ORGANIZED) */}
                {currentMatch.status === MatchStatus.ORGANIZED && (
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/40">
                    <p className="text-xs text-slate-400 mb-2 font-medium">Kết quả thi đấu (Để tự động phạt):</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { res: MatchResult.WIN, label: "Thắng 👍" },
                        { res: MatchResult.LOSS, label: "Thua 👎 (Phạt)" },
                        { res: MatchResult.DRAW, label: "Hòa 🤝 (Phạt)" }
                      ].map((item) => (
                        <button
                          key={item.res}
                          disabled={submitting}
                          onClick={() => handleConfirmMatch(MatchStatus.ORGANIZED, item.res)}
                          className={`py-2 px-1 text-xs font-semibold rounded-lg border transition-all ${
                            currentMatch.result === item.res
                              ? item.res === MatchResult.WIN ? "bg-green-600 text-white border-green-500" 
                                : item.res === MatchResult.LOSS ? "bg-rose-600 text-white border-rose-500" 
                                : "bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-500/10" // Style cho nút Hòa Phạt
                              : "bg-slate-800 border-slate-700 text-slate-400"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Danh sách thành viên */}
              <div className="bg-slate-800 rounded-2xl border border-slate-700/60 shadow-xl overflow-hidden">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Danh Sách Ra Sân</h3>
                  <button 
                    onClick={handleSaveDraft}
                    disabled={submitting}
                    className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 active:scale-95 transition-transform"
                  >
                    💾 Lưu tạm nháp
                  </button>
                </div>
                
                <div className="divide-y divide-slate-700/40">
                  {players.map((player) => (
                    <div key={player.id} className="p-3 flex flex-col gap-2.5 bg-slate-800/30 hover:bg-slate-800/80 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-200">
                          {player.name.charAt(0)}
                        </div>
                        <span className="text-sm font-semibold">{player.name}</span>
                      </div>

                      {/* Hàng nút bấm chọn trạng thái điểm danh */}
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { key: AttendanceStatus.PRESENT, label: "Đá chính", cls: "bg-emerald-600/20 text-emerald-400 border-emerald-500/40" },
                          { key: AttendanceStatus.ABSENT, label: "Nghỉ", cls: "bg-slate-700 text-slate-300 border-slate-500" },
                          { key: AttendanceStatus.FORGOT, label: "Quên ĐD", cls: "bg-amber-600/20 text-amber-400 border-amber-500/40" },
                          { key: AttendanceStatus.NO_SHOW, label: "Bùng 😡", cls: "bg-rose-600/20 text-rose-400 border-rose-500/40" }
                        ].map((btn) => (
                          <button
                            key={btn.key}
                            disabled={submitting}
                            onClick={() => handleTickAttendance(player.id, btn.key)}
                            className={`py-1.5 text-[11px] font-medium rounded-lg text-center border transition-all ${
                              player.status === btn.key ? `${btn.cls} font-bold ring-1 ring-offset-1 ring-offset-slate-800 ring-current` : "bg-slate-900/40 border-slate-700 text-slate-400"
                            }`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: THÀNH VIÊN & TÀI CHÍNH */}
          {activeTab === "finance" && (
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700/60 shadow-xl space-y-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Theo Dõi Đóng Quỹ & Phạt</h3>
              
              <div className="divide-y divide-slate-700/50">
                {financeRecords.map((user) => (
                  <div key={user.id} className="py-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{user.name}</p>
                      <div className="flex gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${user.is_paid ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}>
                          {user.is_paid ? "● Quỹ Tháng: OK" : "○ Quỹ Tháng: Chưa"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`text-xs font-bold ${user.total_debt > 0 ? "text-rose-400" : "text-slate-400"}`}>
                        Nợ: {user.total_debt.toLocaleString()}đ
                      </p>
                      {user.total_debt > 0 && (
                        <button 
                          onClick={() => handleClearDebt(user.id)}
                          className="mt-1 text-[10px] bg-slate-900 hover:bg-slate-950 text-slate-300 px-2 py-0.5 rounded border border-slate-700 transition-colors"
                        >
                          Thu tiền
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CẤU HÌNH MỨC PHẠT */}
          {activeTab === "settings" && (
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700/60 shadow-xl space-y-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Thiết Lập Định Mức Phạt</h3>
              
              <div className="space-y-3.5">
                {[
                  { key: "monthly_fee", label: "Tiền quỹ đóng hàng tháng" },
                  { key: "penalty_forgot", label: "Tiền phạt quên điểm danh" },
                  { key: "penalty_no_show", label: "Tiền phạt điểm danh rồi bùng (No-show)" },
                  { key: "penalty_missed_week", label: "Tiền phạt thiếu buổi tuần (dưới 2 buổi)" },
                  { key: "penalty_loss", label: "Tiền phạt thua / hòa trận đấu" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-4 bg-slate-900/40 p-3 rounded-xl border border-slate-700/40">
                    <label className="text-xs font-medium text-slate-300">{item.label}</label>
                    <div className="relative rounded-lg shadow-sm w-28">
                      <input
                        type="number"
                        disabled={submitting}
                        value={penaltySettings[item.key] || 0}
                        onChange={(e) => setPenaltySettings({ ...penaltySettings, [item.key]: Number(e.target.value) })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-2 pr-6 py-1 text-xs text-right font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                      />
                      <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-[10px] text-slate-500">đ</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={handleUpdateSettings}
                disabled={submitting}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/10"
              >
                {submitting ? "Đang cập nhật..." : "✔️ Lưu Cấu Hình Phạt Mới"}
              </button>
            </div>
          )}

        </main>
      )}

      {/* BOTTOM NAVIGATION FIXED (Mobile-First Thumb-Zone) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex justify-around items-center h-16 shadow-2xl">
        {[
          { id: "daily", label: "Điểm danh", icon: "📋" },
          { id: "finance", label: "Quỹ & Phạt", icon: "💰" },
          { id: "settings", label: "Cấu hình", icon: "⚙️" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col items-center justify-center w-full h-full text-[11px] font-medium transition-colors ${
              activeTab === tab.id ? "text-emerald-400 font-bold" : "text-slate-500 hover:text-slate-400"
            }`}
          >
            <span className="text-lg mb-0.5">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

    </div>
  );
}