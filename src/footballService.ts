// footballService.ts
import { AttendanceStatus, Match, MatchResult, MatchStatus, type PenaltySettings, type PlayerAttendance } from "./common/types";
import { supabase } from "./utils/supabase";



export const footballService = {
  
  // 1. LẤY HOẶC TẠO TRẬN ĐẤU CHO NGÀY ĐƯỢC CHỌN (Trả về kiểu Match)
  getOrCreateMatch: async (date: string): Promise<Match> => {
    // Lấy tất cả các trận đấu vào ngày được chọn, sắp xếp theo thời gian tạo giảm dần để lấy trận mới nhất
    // Việc này tránh lỗi PostgREST "multiple (or no) rows returned" khi database bị trùng lặp dữ liệu
    const { data: matches, error } = await supabase
      .from("bmfc_matches")
      .select("*")
      .eq("date", date)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const match = matches && matches.length > 0 ? matches[0] : null;

    if (!match) {
      const { data: newMatches, error: createError } = await supabase
        .from("bmfc_matches")
        .insert([{ date: date, status: MatchStatus.PENDING }])
        .select();

      if (createError) throw createError;
      if (!newMatches || newMatches.length === 0) throw new Error("Không thể tạo trận đấu cho ngày được chọn.");
      return newMatches[0] as Match;
    }

    return match as Match;
  },

  // 2. LẤY DANH SÁCH ĐIỂM DANH (Trả về mảng PlayerAttendance)
  getAttendance: async (matchId: string): Promise<PlayerAttendance[]> => {
    // Lấy thành viên
    const { data: users, error: userError } = await supabase
      .from("bmfc_user")
      .select("id, name");
    if (userError) throw userError;

    // Lấy data điểm danh
    const { data: attendance, error: attError } = await supabase
      .from("bmfc_attendance")
      .select("*")
      .eq("match_id", matchId);
    if (attError) throw attError;

    return users.map((user: { id: string; name: string }) => {
      const attRecord = attendance?.find((a) => a.user_id === user.id);
      return {
        id: user.id,
        name: user.name,
        status: attRecord ? (attRecord.status as AttendanceStatus) : AttendanceStatus.ABSENT,
      };
    });
  },

  // 3. LƯU TẠM DANH SÁCH ĐIỂM DANH
  saveAttendance: async (matchId: string, attendanceList: PlayerAttendance[]): Promise<boolean> => {
    // Xóa các bản ghi điểm danh cũ của trận đấu này để tránh lỗi ON CONFLICT khi thiếu UNIQUE constraint
    const { error: deleteError } = await supabase
      .from("bmfc_attendance")
      .delete()
      .eq("match_id", matchId);

    if (deleteError) throw deleteError;

    const insertData = attendanceList.map((item) => ({
      match_id: matchId,
      user_id: item.id,
      status: item.status, // Ép chặt theo enum AttendanceStatus
    }));

    if (insertData.length > 0) {
      const { error: insertError } = await supabase
        .from("bmfc_attendance")
        .insert(insertData);

      if (insertError) throw insertError;
    }

    return true;
  },

  // 4. CHỐT SỔ CUỐI NGÀY & PHẠT TIỀN (Áp dụng luật Hòa phạt như Thua)
  confirmMatchAndCheckPenalties: async (
    matchId: string, 
    status: MatchStatus, 
    result: MatchResult | null,
    matchDate: string
  ): Promise<boolean> => {
    const today = matchDate;

    // Cập nhật trạng thái và kết quả trận đấu
    const { error: matchError } = await supabase
      .from("bmfc_matches")
      .update({ status, result })
      .eq("id", matchId);

    if (matchError) throw matchError;

    // Nếu không phải là trạng thái tổ chức trận đấu thì dừng lại không tính phạt
    if (status !== MatchStatus.ORGANIZED) return true;

    // Lấy cấu hình tiền phạt
    const { data: settings, error: settingsError } = await supabase
      .from("bmfc_settings")
      .select("key, value");
    if (settingsError) throw settingsError;

    const config: PenaltySettings = Object.fromEntries(
      settings.map((s) => [s.key, Number(s.value)])
    );

    // Lấy danh sách điểm danh thực tế
    const { data: attendance, error: attError } = await supabase
      .from("bmfc_attendance")
      .select("*")
      .eq("match_id", matchId);
    if (attError) throw attError;

    // Tạo mảng lưu các khoản phạt (Tận dụng Type Inference hoặc định nghĩa inline)
    const penaltyRecords: any[] = [];

    attendance?.forEach((player) => {
      // Quên điểm danh
      if (player.status === AttendanceStatus.FORGOT) {
        penaltyRecords.push({
          user_id: player.user_id,
          type: "penalty",
          reason: `Quên điểm danh ngày ${today}`,
          amount: config.penalty_forgot || 20000,
          date: today,
          is_paid: false,
        });
      }
      
      // Điểm danh nhưng bùng (No-show)
      if (player.status === AttendanceStatus.NO_SHOW) {
        penaltyRecords.push({
          user_id: player.user_id,
          type: "penalty",
          reason: `Điểm danh nhưng không ra sân ngày ${today}`,
          amount: config.penalty_no_show || 50000,
          date: today,
          is_paid: false,
        });
      }

      // Đi muộn
      if (player.status === AttendanceStatus.LATE) {
        penaltyRecords.push({
          user_id: player.user_id,
          type: "penalty",
          reason: `Đi muộn ngày ${today}`,
          amount: config.penalty_late || 20000,
          date: today,
          is_paid: false,
        });
      }

      // XỬ LÝ TRẬN ĐẤU: THUA HOẶC HÒA (Phạt như nhau)
      if (player.status === AttendanceStatus.PRESENT || player.status === AttendanceStatus.LATE) {
        if (result === MatchResult.LOSS) {
          penaltyRecords.push({
            user_id: player.user_id,
            type: "penalty",
            reason: `Thua trận ngày ${today}`,
            amount: config.penalty_loss || 20000,
            date: today,
            is_paid: false,
          });
        } else if (result === MatchResult.DRAW) {
          // LUẬT CỦA ĐỘI BÓNG: HÒA = THUA
          penaltyRecords.push({
            user_id: player.user_id,
            type: "penalty",
            reason: `Hòa trận ngày ${today} (Tính phạt như thua 💸)`,
            amount: config.penalty_loss || 20000, // Sử dụng luôn config phạt thua
            date: today,
            is_paid: false,
          });
        }
      }
    });

    // Đẩy dữ liệu vào bảng tài chính
    if (penaltyRecords.length > 0) {
      // Xóa bản ghi cũ cùng ngày để tránh admin ấn chốt lại bị nhân đôi số tiền
      await supabase
        .from("bmfc_finances")
        .delete()
        .eq("date", today)
        .eq("type", "penalty");

      const { error: financeError } = await supabase
        .from("bmfc_finances")
        .insert(penaltyRecords);

      if (financeError) throw financeError;
    }

    return true;
  },
};