import {
  AttendanceStatus,
  MatchResult,
  type PenaltySettings,
  type PlayerAttendance,
} from './common/types'
import { supabase } from './utils/supabase'

interface AttendanceRecord {
  id: string
  user_id: string
  name: string
  date: string
  status: AttendanceStatus
  match_result: MatchResult | null
}

const loadUsers = async () => {
  const { data, error } = await supabase.from('bmfc_user').select('id, name')
  if (error) throw error
  return data || []
}

const buildPenaltyRecords = (
  attendanceRows: AttendanceRecord[],
  penaltyDate: string,
  config: PenaltySettings,
) => {
  const penaltyRecords: Array<{
    user_id: string
    type: string
    reason: string
    amount: number
    date: string
    is_paid: boolean
  }> = []

  attendanceRows.forEach((player) => {
    if (player.status === AttendanceStatus.FORGOT) {
      penaltyRecords.push({
        user_id: player.user_id,
        type: 'penalty',
        reason: `Quên điểm danh ngày ${penaltyDate}`,
        amount: config.penalty_forgot || 20000,
        date: penaltyDate,
        is_paid: false,
      })
    }

    if (player.status === AttendanceStatus.NO_SHOW) {
      penaltyRecords.push({
        user_id: player.user_id,
        type: 'penalty',
        reason: `Điểm danh nhưng không ra sân ngày ${penaltyDate}`,
        amount: config.penalty_no_show || 50000,
        date: penaltyDate,
        is_paid: false,
      })
    }

    if (player.status === AttendanceStatus.LATE) {
      penaltyRecords.push({
        user_id: player.user_id,
        type: 'penalty',
        reason: `Đi muộn ngày ${penaltyDate}`,
        amount: config.penalty_late || 20000,
        date: penaltyDate,
        is_paid: false,
      })
    }

    if (
      player.status === AttendanceStatus.PRESENT ||
      player.status === AttendanceStatus.LATE
    ) {
      if (player.match_result === MatchResult.LOSS) {
        penaltyRecords.push({
          user_id: player.user_id,
          type: 'penalty',
          reason: `Thua buổi ngày ${penaltyDate}`,
          amount: config.penalty_loss || 20000,
          date: penaltyDate,
          is_paid: false,
        })
      } else if (player.match_result === MatchResult.DRAW) {
        penaltyRecords.push({
          user_id: player.user_id,
          type: 'penalty',
          reason: `Hòa buổi ngày ${penaltyDate} (Tính phạt như thua 💸)`,
          amount: config.penalty_loss || 20000,
          date: penaltyDate,
          is_paid: false,
        })
      }
    }
  })

  return penaltyRecords
}

const syncDailyPenalties = async (
  date: string,
  attendanceRows: AttendanceRecord[],
) => {
  const { data: settings, error: settingsError } = await supabase
    .from('bmfc_settings')
    .select('key, value')

  if (settingsError) throw settingsError

  const config: PenaltySettings = Object.fromEntries(
    (settings || []).map((item) => [item.key, Number(item.value)]),
  )

  await supabase
    .from('bmfc_finances')
    .delete()
    .eq('date', date)
    .eq('type', 'penalty')

  const penaltyRecords = buildPenaltyRecords(attendanceRows, date, config)

  if (penaltyRecords.length > 0) {
    const { error } = await supabase
      .from('bmfc_finances')
      .insert(penaltyRecords)
    if (error) throw error
  }
}

export const footballService = {
  getAttendanceByDate: async (date: string): Promise<PlayerAttendance[]> => {
    const users = await loadUsers()
    const { data, error } = await supabase
      .from('bmfc_attendance')
      .select('id, user_id, date, status, match_result')
      .eq('date', date)

    if (error) throw error
    const attendanceRows = (data || []) as AttendanceRecord[]

    return users.map((user: { id: string; name: string }) => {
      const attRecord = attendanceRows.find((row) => row.user_id === user.id)
      return {
        id: user.id,
        name: user.name,
        status: attRecord
          ? (attRecord.status as AttendanceStatus)
          : AttendanceStatus.ABSENT,
        match_result: attRecord?.match_result || null,
      }
    })
  },

  getAttendanceByRange: async (
    startDate: string,
    endDate: string,
  ): Promise<AttendanceRecord[]> => {
    const users = await loadUsers()
    const { data, error } = await supabase
      .from('bmfc_attendance')
      .select('id, user_id, date, status, match_result')
      .gte('date', startDate)
      .lte('date', endDate)

    if (error) throw error
    const attendanceRows = (data || []) as AttendanceRecord[]

    return attendanceRows.map((row) => ({
      ...row,
      name:
        users.find(
          (user: { id: string; name: string }) => user.id === row.user_id,
        )?.name || '',
    }))
  },

  saveAttendance: async (
    date: string,
    attendanceList: PlayerAttendance[],
  ): Promise<boolean> => {
    const { error: deleteError } = await supabase
      .from('bmfc_attendance')
      .delete()
      .eq('date', date)

    if (deleteError) throw deleteError

    const insertData = attendanceList.map((item) => ({
      date,
      user_id: item.id,
      status: item.status,
      match_result: item.match_result,
    }))

    if (insertData.length > 0) {
      const { error: insertError } = await supabase
        .from('bmfc_attendance')
        .insert(insertData)
      if (insertError) throw insertError
    }

    if (attendanceList.some((item) => item.match_result)) {
      const attendanceRows: AttendanceRecord[] = insertData.map((item) => ({
        id: '',
        user_id: item.user_id,
        name: '',
        date: item.date,
        status: item.status as AttendanceStatus,
        match_result: item.match_result,
      }))
      await syncDailyPenalties(date, attendanceRows)
    } else {
      await supabase
        .from('bmfc_finances')
        .delete()
        .eq('date', date)
        .eq('type', 'penalty')
    }

    return true
  },

  applyDayResult: async (
    date: string,
    result: MatchResult | null,
  ): Promise<boolean> => {
    const { data: existingRows, error } = await supabase
      .from('bmfc_attendance')
      .select('id, user_id, date, status, match_result')
      .eq('date', date)

    if (error) throw error

    const attendanceRows = (existingRows || []) as AttendanceRecord[]

    if (attendanceRows.length > 0) {
      const { error: updateError } = await supabase
        .from('bmfc_attendance')
        .update({ match_result: result })
        .eq('date', date)

      if (updateError) throw updateError
    }

    if (result) {
      const refreshedRows = attendanceRows.map((row) => ({
        ...row,
        match_result: result,
      }))
      await syncDailyPenalties(date, refreshedRows)
    } else {
      await supabase
        .from('bmfc_finances')
        .delete()
        .eq('date', date)
        .eq('type', 'penalty')
    }

    return true
  },

  getPenaltySettings: async (): Promise<PenaltySettings> => {
    const { data, error } = await supabase
      .from('bmfc_settings')
      .select('key, value')
    if (error) throw error

    return Object.fromEntries(
      (data || []).map((item) => [item.key, Number(item.value)]),
    )
  },
}
