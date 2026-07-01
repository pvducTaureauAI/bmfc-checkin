import { useMemo, useState } from 'react'
import {
  AttendanceStatus,
  MatchResult,
  type PlayerAttendance,
} from '../../common/types'

interface DateSummary {
  date: string
  total: number
  present: number
  late: number
  forgot: number
  noShow: number
  result: MatchResult
}

type PlayerSort =
  | 'name_asc'
  | 'name_desc'
  | 'present_first'
  | 'absent_first'
  | 'late_first'
  | 'forgot_first'
  | 'no_show_first'

interface DailyTabProps {
  timeFilter: 'day' | 'week' | 'month'
  canEdit: boolean
  submitting: boolean
  players: PlayerAttendance[]
  searchByPlayerName: string
  onChangeSearch: (value: string) => void
  attendanceSummaries: DateSummary[]
  selectedDate: string
  onSetSelectedDate: (date: string) => void
  onTickAttendance: (playerId: string, status: AttendanceStatus) => void
  onChangePlayerResult: (playerId: string, result: MatchResult) => void
}

export default function DailyTab({
  timeFilter,
  canEdit,
  submitting,
  players,
  searchByPlayerName,
  onChangeSearch,
  attendanceSummaries,
  selectedDate,
  onSetSelectedDate,
  onTickAttendance,
  onChangePlayerResult,
}: DailyTabProps) {
  const [sortBy, setSortBy] = useState<PlayerSort>('name_asc')

  const activeDaySummary = attendanceSummaries.find(
    (item) => item.date === selectedDate,
  )

  const sortedPlayers = useMemo(() => {
    const filtered = players.filter((player) =>
      player.name.toLowerCase().includes(searchByPlayerName.toLowerCase()),
    )

    if (sortBy === 'name_asc') {
      return filtered.sort((a, b) => a.name.localeCompare(b.name))
    }

    if (sortBy === 'name_desc') {
      return filtered.sort((a, b) => b.name.localeCompare(a.name))
    }

    const sortByStatus = (status: AttendanceStatus) =>
      filtered.sort((a, b) => {
        const diff = Number(b.status === status) - Number(a.status === status)
        if (diff !== 0) return diff
        return a.name.localeCompare(b.name)
      })

    if (sortBy === 'present_first')
      return sortByStatus(AttendanceStatus.PRESENT)
    if (sortBy === 'absent_first') return sortByStatus(AttendanceStatus.ABSENT)
    if (sortBy === 'late_first') return sortByStatus(AttendanceStatus.LATE)
    if (sortBy === 'forgot_first') return sortByStatus(AttendanceStatus.FORGOT)
    return sortByStatus(AttendanceStatus.NO_SHOW)
  }, [players, searchByPlayerName, sortBy])

  if (timeFilter !== 'day') {
    return (
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
            onClick={() => onSetSelectedDate(summary.date)}
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
    )
  }

  return (
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
        <div className="p-4 border-b border-slate-700 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Danh Sách Ra Sân
          </h3>

          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Tìm kiếm theo tên..."
              value={searchByPlayerName}
              onChange={(e) => onChangeSearch(e.target.value)}
              className="flex-1 sm:w-44 bg-slate-700 text-slate-200 placeholder:text-slate-400 border border-slate-600 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as PlayerSort)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="name_asc">Tên A-Z</option>
              <option value="name_desc">Tên Z-A</option>
              <option value="present_first">Đá trước</option>
              <option value="absent_first">Nghỉ trước</option>
              <option value="late_first">Đi muộn trước</option>
              <option value="forgot_first">Quên ĐD trước</option>
              <option value="no_show_first">Bùng trước</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-700/40">
          {sortedPlayers.map((player) => (
            <div
              key={player.id}
              className="p-3 flex flex-col gap-2.5 bg-slate-800/30 hover:bg-slate-800/80 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-200">
                  {player.name.charAt(0)}
                </div>
                <span className="text-sm font-semibold">{player.name}</span>
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
                    onClick={() => onTickAttendance(player.id, btn.key)}
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
                  { value: MatchResult.UNKNOWN, label: 'Không xác định' },
                  { value: MatchResult.WIN, label: 'Thắng' },
                  { value: MatchResult.DRAW, label: 'Hòa' },
                  { value: MatchResult.LOSS, label: 'Thua' },
                ].map((item) => (
                  <button
                    key={String(item.label)}
                    disabled={submitting || !canEdit}
                    onClick={() => onChangePlayerResult(player.id, item.value)}
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
  )
}
