import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { footballService } from '../footballService'
import { supabase } from '../utils/supabase'
import {
  AttendanceStatus,
  MatchResult,
  type PenaltySettings,
  type PlayerAttendance,
} from '../common/types'
import useAuth from '../hooks/useAuth'
import Modal from '../components/Modal'
import MonthlyFundList from '../components/finance/MonthlyFundList'
import PenaltyList from '../components/finance/PenaltyList'

interface MonthlyFundRow {
  user_id: string
  name: string
  is_paid: boolean
  amount: number
}

interface PenaltyRow {
  id: string
  user_id: string
  name: string
  date: string
  reason: string
  amount: number
  is_paid: boolean
}

interface AttendanceRecordView {
  id: string
  user_id: string
  name: string
  date: string
  status: AttendanceStatus
  match_result: MatchResult
}

interface DateSummary {
  date: string
  total: number
  present: number
  late: number
  forgot: number
  noShow: number
  result: MatchResult
}

type TimeFilter = 'day' | 'week' | 'month'
type FinanceView = 'fund' | 'penalty'

const formatDateInput = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatMonthInput = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const getIsoWeekInfo = (date: Date) => {
  const target = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  )
  const dayNumber = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(
    ((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  )
  return { year: target.getUTCFullYear(), week: weekNo }
}

const formatWeekInput = (date: Date) => {
  const { year, week } = getIsoWeekInfo(date)
  return `${year}-W${String(week).padStart(2, '0')}`
}

const weekInputToAnchorDate = (weekValue: string, fallbackDate: string) => {
  const [yearPart, weekPart] = weekValue.split('-W')
  const year = Number(yearPart)
  const week = Number(weekPart)

  if (!year || !week) return fallbackDate

  const jan4 = new Date(year, 0, 4)
  const jan4Day = (jan4.getDay() + 6) % 7
  const mondayOfWeek1 = new Date(jan4)
  mondayOfWeek1.setDate(jan4.getDate() - jan4Day)

  const targetDate = new Date(mondayOfWeek1)
  targetDate.setDate(mondayOfWeek1.getDate() + (week - 1) * 7)

  return formatDateInput(targetDate)
}

const parseLocalDate = (value: string) => new Date(`${value}T00:00:00`)

const getAnchorDate = (
  preset: TimeFilter,
  day: string,
  week: string,
  month: string,
) => {
  if (preset === 'day') return day
  if (preset === 'week') return weekInputToAnchorDate(week, day)
  return `${month}-01`
}

const getRangeBounds = (preset: TimeFilter, anchorDate: string) => {
  const base = parseLocalDate(anchorDate)

  if (preset === 'day') {
    return { startDate: anchorDate, endDate: anchorDate }
  }

  if (preset === 'week') {
    const dayIndex = base.getDay()
    const offsetToMonday = (dayIndex + 6) % 7
    const start = new Date(base)
    start.setDate(base.getDate() - offsetToMonday)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)

    return {
      startDate: formatDateInput(start),
      endDate: formatDateInput(end),
    }
  }

  const start = new Date(base.getFullYear(), base.getMonth(), 1)
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0)

  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
  }
}

const getPeriodLabel = (preset: TimeFilter) => {
  if (preset === 'day') return 'Theo ngày'
  if (preset === 'week') return 'Theo tuần'
  return 'Theo tháng'
}

const summarizeAttendanceByDate = (
  records: AttendanceRecordView[],
): DateSummary[] => {
  const grouped = new Map<string, AttendanceRecordView[]>()

  records.forEach((record) => {
    const current = grouped.get(record.date) || []
    current.push(record)
    grouped.set(record.date, current)
  })

  return Array.from(grouped.entries())
    .map(([date, items]) => {
      const result =
        items.find((item) => item.match_result)?.match_result ||
        MatchResult.UNKNOWN
      return {
        date,
        total: items.length,
        present: items.filter(
          (item) => item.status === AttendanceStatus.PRESENT,
        ).length,
        late: items.filter((item) => item.status === AttendanceStatus.LATE)
          .length,
        forgot: items.filter((item) => item.status === AttendanceStatus.FORGOT)
          .length,
        noShow: items.filter((item) => item.status === AttendanceStatus.NO_SHOW)
          .length,
        result,
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

export default function FootballManager() {
  const { user, logout, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const canEdit = Boolean(user)
  const today = new Date()
  const defaultDay = formatDateInput(today)
  const defaultWeek = formatWeekInput(today)
  const defaultMonth = formatMonthInput(today)

  const [activeTab, setActiveTab] = useState<'daily' | 'finance' | 'settings'>(
    'daily',
  )
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('day')
  const [selectedDate, setSelectedDate] = useState<string>(defaultDay)
  const [selectedDay, setSelectedDay] = useState<string>(defaultDay)
  const [selectedWeek, setSelectedWeek] = useState<string>(defaultWeek)
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth)
  const [financeView, setFinanceView] = useState<FinanceView>('fund')
  const [fundMonth, setFundMonth] = useState<string>(defaultMonth)
  const [penaltyFilter, setPenaltyFilter] = useState<TimeFilter>('day')
  const [penaltyDay, setPenaltyDay] = useState<string>(defaultDay)
  const [penaltyWeek, setPenaltyWeek] = useState<string>(defaultWeek)
  const [penaltyMonth, setPenaltyMonth] = useState<string>(defaultMonth)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [draftFilter, setDraftFilter] = useState<TimeFilter>('day')
  const [draftDay, setDraftDay] = useState<string>(defaultDay)
  const [draftWeek, setDraftWeek] = useState<string>(defaultWeek)
  const [draftMonth, setDraftMonth] = useState<string>(defaultMonth)
  const [draftFundMonth, setDraftFundMonth] = useState<string>(defaultMonth)
  const [draftPenaltyFilter, setDraftPenaltyFilter] =
    useState<TimeFilter>('day')
  const [draftPenaltyDay, setDraftPenaltyDay] = useState<string>(defaultDay)
  const [draftPenaltyWeek, setDraftPenaltyWeek] = useState<string>(defaultWeek)
  const [draftPenaltyMonth, setDraftPenaltyMonth] =
    useState<string>(defaultMonth)
  const [attendanceSummaries, setAttendanceSummaries] = useState<DateSummary[]>(
    [],
  )
  const [players, setPlayers] = useState<PlayerAttendance[]>([])
  const [monthlyFundRows, setMonthlyFundRows] = useState<MonthlyFundRow[]>([])
  const [penaltyRows, setPenaltyRows] = useState<PenaltyRow[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [penaltySettings, setPenaltySettings] = useState<PenaltySettings>({
    penalty_forgot: 30000,
    penalty_late: 20000,
    penalty_no_show: 30000,
    penalty_missed_week: 30000,
    penalty_loss: 10000,
    monthly_fee: 120000,
  })
  const [searchByPlayerName, setSearchByPlayerName] = useState<string>('')

  useEffect(() => {
    void fetchInitialData()
  }, [
    activeTab,
    timeFilter,
    selectedDate,
    financeView,
    fundMonth,
    penaltyFilter,
    penaltyDay,
    penaltyWeek,
    penaltyMonth,
  ])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const { startDate, endDate } = getRangeBounds(timeFilter, selectedDate)

      if (activeTab === 'daily') {
        if (timeFilter === 'day') {
          const [dayPlayers, dayRows] = await Promise.all([
            footballService.getAttendanceByDate(selectedDate),
            footballService.getAttendanceByRange(selectedDate, selectedDate),
          ])

          const normalizedRows: AttendanceRecordView[] = dayRows.map((row) => ({
            id: row.id,
            user_id: row.user_id,
            name: row.name,
            date: row.date,
            status: row.status,
            match_result: row.match_result || MatchResult.UNKNOWN,
          }))

          setAttendanceSummaries(summarizeAttendanceByDate(normalizedRows))
          setPlayers(dayPlayers)
        } else {
          const rows = await footballService.getAttendanceByRange(
            startDate,
            endDate,
          )

          const normalizedRows: AttendanceRecordView[] = rows.map((row) => ({
            id: row.id,
            user_id: row.user_id,
            name: row.name,
            date: row.date,
            status: row.status,
            match_result: row.match_result || MatchResult.UNKNOWN,
          }))

          setAttendanceSummaries(summarizeAttendanceByDate(normalizedRows))
          const activeDayRows = normalizedRows.filter(
            (row) => row.date === selectedDate,
          )
          setPlayers(
            activeDayRows.map((row) => ({
              id: row.user_id,
              name: row.name,
              status: row.status,
              match_result: row.match_result,
            })),
          )
        }
        return
      }

      if (activeTab === 'finance') {
        const latestSettings = await footballService.getPenaltySettings()
        setPenaltySettings((prev) => ({ ...prev, ...latestSettings }))
        const monthlyFee = Number(
          latestSettings.monthly_fee || penaltySettings.monthly_fee || 100000,
        )

        if (financeView === 'fund') {
          const monthAnchor = `${fundMonth}-01`
          const { startDate: monthStart, endDate: monthEnd } = getRangeBounds(
            'month',
            monthAnchor,
          )

          const [
            { data: usersData, error: userErr },
            { data: fundData, error: fundErr },
          ] = await Promise.all([
            supabase.from('bmfc_user').select('id, name'),
            supabase
              .from('bmfc_finances')
              .select('id, user_id, amount, is_paid, type, date')
              .eq('type', 'monthly')
              .gte('date', monthStart)
              .lte('date', monthEnd),
          ])

          if (userErr || fundErr) throw userErr || fundErr

          const rows: MonthlyFundRow[] = (usersData || [])
            .map((userRow: any) => {
              const monthlyRecord = (fundData || []).find(
                (record: any) => record.user_id === userRow.id,
              )

              return {
                user_id: userRow.id,
                name: userRow.name,
                is_paid: Boolean(monthlyRecord?.is_paid),
                amount: Number(monthlyRecord?.amount || monthlyFee),
              }
            })
            .sort((a, b) => a.name.localeCompare(b.name))

          setMonthlyFundRows(rows)
          setPenaltyRows([])
        } else {
          const penaltyAnchor = getAnchorDate(
            penaltyFilter,
            penaltyDay,
            penaltyWeek,
            penaltyMonth,
          )
          const { startDate: penaltyStart, endDate: penaltyEnd } =
            getRangeBounds(penaltyFilter, penaltyAnchor)

          const [
            { data: usersData, error: userErr },
            { data: dataRows, error: finErr },
          ] = await Promise.all([
            supabase.from('bmfc_user').select('id, name'),
            supabase
              .from('bmfc_finances')
              .select('id, user_id, date, reason, amount, is_paid, type')
              .eq('type', 'penalty')
              .gte('date', penaltyStart)
              .lte('date', penaltyEnd),
          ])

          if (userErr || finErr) throw userErr || finErr

          const nameMap = new Map<string, string>(
            (usersData || []).map((userRow: any) => [userRow.id, userRow.name]),
          )

          const rows: PenaltyRow[] = (dataRows || [])
            .map((item: any) => ({
              id: item.id,
              user_id: item.user_id,
              name: nameMap.get(item.user_id) || 'Không rõ',
              date: item.date,
              reason: item.reason || 'Phạt nội bộ',
              amount: Number(item.amount || 0),
              is_paid: Boolean(item.is_paid),
            }))
            .sort((a, b) => b.date.localeCompare(a.date))

          setPenaltyRows(rows)
          setMonthlyFundRows([])
        }
        return
      }

      const settings = await footballService.getPenaltySettings()
      setPenaltySettings((prev) => ({ ...prev, ...settings }))
    } catch (error: any) {
      alert('Lỗi tải dữ liệu: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/dang-nhap', { replace: true })
  }

  const openFilterModal = () => {
    if (activeTab === 'daily') {
      setDraftFilter(timeFilter)
      setDraftDay(selectedDay)
      setDraftWeek(selectedWeek)
      setDraftMonth(selectedMonth)
    } else if (activeTab === 'finance') {
      if (financeView === 'fund') {
        setDraftFundMonth(fundMonth)
      } else {
        setDraftPenaltyFilter(penaltyFilter)
        setDraftPenaltyDay(penaltyDay)
        setDraftPenaltyWeek(penaltyWeek)
        setDraftPenaltyMonth(penaltyMonth)
      }
    }
    setIsFilterModalOpen(true)
  }

  const applyFilterFromModal = () => {
    if (activeTab === 'finance') {
      if (financeView === 'fund') {
        setFundMonth(draftFundMonth)
      } else {
        setPenaltyFilter(draftPenaltyFilter)
        if (draftPenaltyFilter === 'day') {
          setPenaltyDay(draftPenaltyDay)
        } else if (draftPenaltyFilter === 'week') {
          setPenaltyWeek(draftPenaltyWeek)
        } else {
          setPenaltyMonth(draftPenaltyMonth)
        }
      }

      setIsFilterModalOpen(false)
      return
    }

    let nextAnchorDate = selectedDate

    if (draftFilter === 'day') {
      nextAnchorDate = draftDay
      setSelectedDay(draftDay)
    } else if (draftFilter === 'week') {
      nextAnchorDate = weekInputToAnchorDate(draftWeek, selectedDate)
      setSelectedWeek(draftWeek)
    } else {
      nextAnchorDate = `${draftMonth}-01`
      setSelectedMonth(draftMonth)
    }

    setTimeFilter(draftFilter)
    setSelectedDate(nextAnchorDate)
    setIsFilterModalOpen(false)
  }

  const handleSetSelectedDate = (date: string) => {
    setTimeFilter('day')
    setSelectedDay(date)
    setSelectedDate(date)
  }

  const handleTickAttendance = async (
    playerId: string,
    newStatus: AttendanceStatus,
  ) => {
    if (!canEdit) return

    const previousPlayers = players
    const nextPlayers = players.map((player) =>
      player.id === playerId ? { ...player, status: newStatus } : player,
    )

    setPlayers(nextPlayers)

    try {
      setSubmitting(true)
      await footballService.saveAttendance(selectedDate, nextPlayers)
      await fetchInitialData()
    } catch (error: any) {
      setPlayers(previousPlayers)
      alert('Lỗi lưu điểm danh tự động: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleChangePlayerResult = async (
    playerId: string,
    result: MatchResult | null,
  ) => {
    if (!canEdit) return

    const previousPlayers = players
    const nextPlayers = players.map((player) =>
      player.id === playerId ? { ...player, match_result: result } : player,
    )

    try {
      setSubmitting(true)
      setPlayers(nextPlayers)
      await footballService.saveAttendance(selectedDate, nextPlayers)
      await fetchInitialData()
    } catch (error: any) {
      setPlayers(previousPlayers)
      alert('Lỗi cập nhật kết quả của user: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateSettings = async () => {
    if (!canEdit) {
      alert('Chỉ admin mới có quyền cập nhật cấu hình.')
      return
    }

    try {
      setSubmitting(true)
      const upsertData = Object.entries(penaltySettings).map(
        ([key, value]) => ({
          key,
          value,
        }),
      )
      const { error } = await supabase.from('bmfc_settings').upsert(upsertData)
      if (error) throw error
      alert('Cập nhật định mức phạt thành công!')
    } catch (error: any) {
      alert('Lỗi cập nhật cấu hình: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClearDebt = async (userId: string) => {
    if (!canEdit) {
      alert('Chỉ admin mới có quyền cập nhật trạng thái đóng tiền.')
      return
    }

    try {
      setSubmitting(true)
      const latestSettings = await footballService.getPenaltySettings()
      setPenaltySettings((prev) => ({ ...prev, ...latestSettings }))
      const monthlyFee = Number(
        latestSettings.monthly_fee || penaltySettings.monthly_fee || 100000,
      )

      const monthAnchor = `${fundMonth}-01`
      const { startDate: monthStart, endDate: monthEnd } = getRangeBounds(
        'month',
        monthAnchor,
      )

      const { data: existingRows, error: existingErr } = await supabase
        .from('bmfc_finances')
        .select('id, is_paid')
        .eq('type', 'monthly')
        .eq('user_id', userId)
        .gte('date', monthStart)
        .lte('date', monthEnd)

      if (existingErr) throw existingErr

      const existing = (existingRows || [])[0]
      const nextPaid = !Boolean(existing?.is_paid)

      if (existing?.id) {
        const { error } = await supabase
          .from('bmfc_finances')
          .update({ is_paid: nextPaid })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('bmfc_finances').insert({
          user_id: userId,
          type: 'monthly',
          reason: `Quỹ tháng ${fundMonth}`,
          amount: monthlyFee,
          date: monthStart,
          is_paid: true,
        })
        if (error) throw error
      }

      await fetchInitialData()
    } catch (error: any) {
      alert('Lỗi cập nhật trạng thái quỹ: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleTogglePenaltyPaid = async (
    recordId: string,
    nextPaid: boolean,
  ) => {
    if (!canEdit) return

    try {
      setSubmitting(true)
      const { error } = await supabase
        .from('bmfc_finances')
        .update({ is_paid: nextPaid })
        .eq('id', recordId)

      if (error) throw error
      await fetchInitialData()
    } catch (error: any) {
      alert('Lỗi cập nhật trạng thái phạt: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return null
  }

  const { startDate, endDate } = getRangeBounds(timeFilter, selectedDate)
  const dailyRangeLabel =
    timeFilter === 'day'
      ? `Ngày ${selectedDate}`
      : `${getPeriodLabel(timeFilter)}: ${startDate} - ${endDate}`

  const fundRangeLabel = `Tháng ${fundMonth}`
  const penaltyAnchor = getAnchorDate(
    penaltyFilter,
    penaltyDay,
    penaltyWeek,
    penaltyMonth,
  )
  const { startDate: penaltyStart, endDate: penaltyEnd } = getRangeBounds(
    penaltyFilter,
    penaltyAnchor,
  )
  const penaltyRangeLabel =
    penaltyFilter === 'day'
      ? `Ngày ${penaltyDay}`
      : `${getPeriodLabel(penaltyFilter)}: ${penaltyStart} - ${penaltyEnd}`

  const rangeLabel =
    activeTab === 'daily'
      ? dailyRangeLabel
      : financeView === 'fund'
        ? fundRangeLabel
        : penaltyRangeLabel

  const activeDaySummary = attendanceSummaries.find(
    (item) => item.date === selectedDate,
  )

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-24 font-sans selection:bg-emerald-500 selection:text-white">
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
            ⚽ BMFC Manager
          </h1>
          <p className="text-xs text-slate-400">Điều hành nội bộ đội bóng</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span
            className={`text-xs px-2.5 py-1 rounded-full border ${
              canEdit
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            {canEdit ? 'Admin' : 'Chế độ xem'}
          </span>
          {user ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                {user.email.charAt(0).toUpperCase()}
              </span>
              <span className="max-w-40 truncate hidden sm:inline">
                {user.email}
              </span>
              <span className="text-rose-300">Đăng xuất</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/dang-nhap')}
              className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 transition-colors"
            >
              Đăng nhập
            </button>
          )}
        </div>
      </header>

      {activeTab !== 'settings' && (
        <div className="max-w-4xl mx-auto px-4 pt-4 space-y-4">
          <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-3 shadow-xl flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400">
                Bộ lọc thời gian
              </p>
              <p className="text-sm font-semibold text-slate-100">
                {rangeLabel}
              </p>
            </div>
            <button
              onClick={openFilterModal}
              className="shrink-0 bg-slate-900 hover:bg-slate-700 border border-slate-600 text-slate-100 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
            >
              Bộ lọc
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center pt-32 space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400">
            Đang đồng bộ dữ liệu sân bóng...
          </p>
        </div>
      ) : (
        <main className="max-w-md mx-auto p-4 sm:max-w-xl md:max-w-2xl space-y-4">
          {activeTab === 'daily' && (
            <>
              {timeFilter === 'day' ? (
                <>
                  {activeDaySummary && (
                    <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700/60 shadow-xl text-xs text-slate-300 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div>Đá: {activeDaySummary.present}</div>
                      <div>Đi muộn: {activeDaySummary.late}</div>
                      <div>Quên ĐD: {activeDaySummary.forgot}</div>
                      <div>Bùng: {activeDaySummary.noShow}</div>
                    </div>
                  )}

                  <div className="bg-slate-800 rounded-2xl border border-slate-700/60 shadow-xl overflow-hidden">
                    <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Danh Sách Ra Sân
                      </h3>
                      <input
                        type="text"
                        placeholder="Tìm kiếm theo tên..."
                        value={searchByPlayerName}
                        onChange={(e) => setSearchByPlayerName(e.target.value)}
                        className="bg-slate-700 text-slate-200 placeholder:text-slate-400 border border-slate-600 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="divide-y divide-slate-700/40">
                      {players
                        .filter((player) =>
                          player.name
                            .toLowerCase()
                            .includes(searchByPlayerName.toLowerCase()),
                        )
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((player) => (
                          <div
                            key={player.id}
                            className="p-3 flex flex-col gap-2.5 bg-slate-800/30 hover:bg-slate-800/80 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-200">
                                {player.name.charAt(0)}
                              </div>
                              <span className="text-sm font-semibold">
                                {player.name}
                              </span>
                            </div>

                            <div className="grid grid-cols-5 gap-1">
                              {[
                                {
                                  key: AttendanceStatus.PRESENT,
                                  label: 'Đá',
                                  cls: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40',
                                },
                                {
                                  key: AttendanceStatus.ABSENT,
                                  label: 'Nghỉ',
                                  cls: 'bg-slate-700 text-slate-300 border-slate-500',
                                },
                                {
                                  key: AttendanceStatus.LATE,
                                  label: 'Đi muộn',
                                  cls: 'bg-cyan-600/20 text-cyan-300 border-cyan-500/40',
                                },
                                {
                                  key: AttendanceStatus.FORGOT,
                                  label: 'Quên ĐD',
                                  cls: 'bg-amber-600/20 text-amber-400 border-amber-500/40',
                                },
                                {
                                  key: AttendanceStatus.NO_SHOW,
                                  label: 'Bùng 😡',
                                  cls: 'bg-rose-600/20 text-rose-400 border-rose-500/40',
                                },
                              ].map((btn) => (
                                <button
                                  key={btn.key}
                                  disabled={submitting || !canEdit}
                                  onClick={() =>
                                    void handleTickAttendance(
                                      player.id,
                                      btn.key,
                                    )
                                  }
                                  className={`py-1.5 text-[11px] font-medium rounded-lg text-center border transition-all ${
                                    player.status === btn.key
                                      ? `${btn.cls} font-bold ring-1 ring-offset-1 ring-offset-slate-800 ring-current`
                                      : 'bg-slate-900/40 border-slate-700 text-slate-400'
                                  } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                                >
                                  {btn.label}
                                </button>
                              ))}
                            </div>

                            <div className="grid grid-cols-4 gap-1 pt-1">
                              {[
                                {
                                  value: MatchResult.UNKNOWN,
                                  label: 'Không xác định',
                                },
                                { value: MatchResult.WIN, label: 'Thắng' },
                                { value: MatchResult.DRAW, label: 'Hòa' },
                                { value: MatchResult.LOSS, label: 'Thua' },
                              ].map((item) => (
                                <button
                                  key={String(item.label)}
                                  disabled={submitting || !canEdit}
                                  onClick={() =>
                                    void handleChangePlayerResult(
                                      player.id,
                                      item.value,
                                    )
                                  }
                                  className={`py-1.5 text-[11px] font-medium rounded-lg text-center border transition-all ${
                                    player.match_result === item.value
                                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold ring-1 ring-offset-1 ring-offset-slate-800 ring-amber-400'
                                      : 'bg-slate-900/40 border-slate-700 text-slate-400'
                                  } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700/60 shadow-xl">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Tổng hợp theo kỳ
                    </h3>
                    <p className="text-xs text-slate-400">
                      Chạm vào từng ngày để mở về chế độ chỉnh sửa theo ngày.
                    </p>
                  </div>

                  {attendanceSummaries.map((summary) => (
                    <button
                      key={summary.date}
                      onClick={() => handleSetSelectedDate(summary.date)}
                      className="w-full text-left bg-slate-800 p-4 rounded-2xl border border-slate-700/60 shadow-xl hover:bg-slate-800/90 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-100">
                            {summary.date}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {summary.total} người - kết quả{' '}
                            {summary.result || 'chưa chốt'}
                          </p>
                        </div>
                        <span className="text-[11px] text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                          Xem ngày này
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 sm:grid-cols-4">
                        <span>Đá: {summary.present}</span>
                        <span>Muộn: {summary.late}</span>
                        <span>Quên: {summary.forgot}</span>
                        <span>Bùng: {summary.noShow}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-4">
              <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-2 shadow-xl grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFinanceView('fund')}
                  className={`rounded-xl py-2 text-xs font-semibold border transition-colors ${
                    financeView === 'fund'
                      ? 'bg-emerald-500 text-white border-emerald-400'
                      : 'bg-slate-900 text-slate-300 border-slate-700'
                  }`}
                >
                  Quỹ
                </button>
                <button
                  onClick={() => setFinanceView('penalty')}
                  className={`rounded-xl py-2 text-xs font-semibold border transition-colors ${
                    financeView === 'penalty'
                      ? 'bg-emerald-500 text-white border-emerald-400'
                      : 'bg-slate-900 text-slate-300 border-slate-700'
                  }`}
                >
                  Phạt
                </button>
              </div>

              {!canEdit && (
                <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs text-slate-300">
                  Chế độ xem công khai chỉ cho phép đọc dữ liệu. Các thao tác
                  cập nhật trạng thái đóng tiền cần đăng nhập admin.
                </div>
              )}

              {financeView === 'fund' ? (
                <MonthlyFundList
                  rows={monthlyFundRows}
                  canEdit={canEdit}
                  submitting={submitting}
                  monthLabel={fundMonth}
                  onTogglePaid={(userId, _nextPaid) => {
                    void handleClearDebt(userId)
                  }}
                />
              ) : (
                <PenaltyList
                  rows={penaltyRows}
                  canEdit={canEdit}
                  submitting={submitting}
                  periodLabel={penaltyRangeLabel}
                  onTogglePaid={(recordId, nextPaid) => {
                    void handleTogglePenaltyPaid(recordId, nextPaid)
                  }}
                />
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700/60 shadow-xl space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Thiết Lập Định Mức Phạt
                </h3>
                {!canEdit && (
                  <span className="text-[11px] text-slate-500">
                    Chỉ admin được sửa
                  </span>
                )}
              </div>

              <div className="space-y-3.5">
                {[
                  { key: 'monthly_fee', label: 'Tiền quỹ đóng hàng tháng' },
                  { key: 'penalty_forgot', label: 'Tiền phạt quên điểm danh' },
                  { key: 'penalty_late', label: 'Tiền phạt đi muộn' },
                  {
                    key: 'penalty_no_show',
                    label: 'Tiền phạt điểm danh rồi bùng (No-show)',
                  },
                  {
                    key: 'penalty_missed_week',
                    label: 'Tiền phạt thiếu buổi tuần (dưới 2 buổi)',
                  },
                  {
                    key: 'penalty_loss',
                    label: 'Tiền phạt thua / hòa buổi',
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-4 bg-slate-900/40 p-3 rounded-xl border border-slate-700/40"
                  >
                    <label className="text-xs font-medium text-slate-300">
                      {item.label}
                    </label>
                    <div className="relative rounded-lg shadow-sm w-28">
                      <input
                        type="number"
                        disabled={submitting || !canEdit}
                        value={penaltySettings[item.key] || 0}
                        onChange={(e) =>
                          setPenaltySettings({
                            ...penaltySettings,
                            [item.key]: Number(e.target.value),
                          })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-2 pr-6 py-1 text-xs text-right font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                      />
                      <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-[10px] text-slate-500">
                        đ
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => void handleUpdateSettings()}
                disabled={submitting || !canEdit}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/10 disabled:opacity-50"
              >
                {submitting ? 'Đang cập nhật...' : '✔️ Lưu Cấu Hình Phạt Mới'}
              </button>
            </div>
          )}
        </main>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex justify-around items-center h-16 shadow-2xl">
        {[
          { id: 'daily', label: 'Điểm danh', icon: '📋' },
          { id: 'finance', label: 'Quỹ & Phạt', icon: '💰' },
          { id: 'settings', label: 'Cấu hình', icon: '⚙️' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() =>
              setActiveTab(tab.id as 'daily' | 'finance' | 'settings')
            }
            className={`flex flex-col items-center justify-center w-full h-full text-[11px] font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-emerald-400 font-bold'
                : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            <span className="text-lg mb-0.5">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <Modal
        open={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
      >
        <div className="space-y-4">
          <div className="border-b border-slate-700/60 pb-3">
            <h3 className="text-base font-bold text-slate-100">Lọc dữ liệu</h3>
            <p className="text-xs text-slate-400 mt-1">
              {activeTab === 'daily'
                ? 'Chọn chế độ lọc rồi chọn thời gian tương ứng.'
                : financeView === 'fund'
                  ? 'Phần quỹ chỉ lọc theo tháng.'
                  : 'Phần phạt hỗ trợ lọc theo ngày, tuần, tháng.'}
            </p>
          </div>

          {activeTab === 'finance' && financeView === 'fund' ? (
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Chọn tháng</label>
              <input
                type="month"
                value={draftFundMonth}
                onChange={(e) => setDraftFundMonth(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'day', label: 'Ngày' },
                  { key: 'week', label: 'Tuần' },
                  { key: 'month', label: 'Tháng' },
                ].map((item) => {
                  const isSelected =
                    activeTab === 'daily'
                      ? draftFilter === item.key
                      : draftPenaltyFilter === item.key

                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        if (activeTab === 'daily') {
                          setDraftFilter(item.key as TimeFilter)
                        } else {
                          setDraftPenaltyFilter(item.key as TimeFilter)
                        }
                      }}
                      className={`rounded-lg border py-2 text-xs font-semibold ${
                        isSelected
                          ? 'bg-emerald-500 text-white border-emerald-400'
                          : 'bg-slate-900 text-slate-300 border-slate-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>

              {(activeTab === 'daily' ? draftFilter : draftPenaltyFilter) ===
                'day' && (
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">
                    Chọn ngày cụ thể
                  </label>
                  <input
                    type="date"
                    value={activeTab === 'daily' ? draftDay : draftPenaltyDay}
                    onChange={(e) => {
                      if (activeTab === 'daily') {
                        setDraftDay(e.target.value)
                      } else {
                        setDraftPenaltyDay(e.target.value)
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {(activeTab === 'daily' ? draftFilter : draftPenaltyFilter) ===
                'week' && (
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">
                    Chọn tuần (ISO week)
                  </label>
                  <input
                    type="week"
                    value={activeTab === 'daily' ? draftWeek : draftPenaltyWeek}
                    onChange={(e) => {
                      if (activeTab === 'daily') {
                        setDraftWeek(e.target.value)
                      } else {
                        setDraftPenaltyWeek(e.target.value)
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {(activeTab === 'daily' ? draftFilter : draftPenaltyFilter) ===
                'month' && (
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Chọn tháng</label>
                  <input
                    type="month"
                    value={
                      activeTab === 'daily' ? draftMonth : draftPenaltyMonth
                    }
                    onChange={(e) => {
                      if (activeTab === 'daily') {
                        setDraftMonth(e.target.value)
                      } else {
                        setDraftPenaltyMonth(e.target.value)
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsFilterModalOpen(false)}
              className="bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 py-2 px-4 rounded-xl text-xs font-semibold"
            >
              Hủy
            </button>
            <button
              onClick={applyFilterFromModal}
              className="bg-emerald-500 hover:bg-emerald-600 text-white py-2 px-4 rounded-xl text-xs font-semibold"
            >
              Áp dụng
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
