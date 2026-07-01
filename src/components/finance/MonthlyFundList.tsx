import { useMemo, useState } from 'react'

interface MonthlyFundRow {
  user_id: string
  name: string
  is_paid: boolean
  amount: number
}

type MonthlyFundSort =
  | 'name_asc'
  | 'name_desc'
  | 'paid_first'
  | 'unpaid_first'
  | 'amount_desc'
  | 'amount_asc'

interface MonthlyFundListProps {
  rows: MonthlyFundRow[]
  canEdit: boolean
  submitting: boolean
  monthLabel: string
  onTogglePaid: (userId: string, nextPaid: boolean) => void
}

export default function MonthlyFundList({
  rows,
  canEdit,
  submitting,
  monthLabel,
  onTogglePaid,
}: MonthlyFundListProps) {
  const [sortBy, setSortBy] = useState<MonthlyFundSort>('name_asc')

  const sortedRows = useMemo(() => {
    const list = [...rows]

    if (sortBy === 'name_asc') {
      return list.sort((a, b) => a.name.localeCompare(b.name))
    }

    if (sortBy === 'name_desc') {
      return list.sort((a, b) => b.name.localeCompare(a.name))
    }

    if (sortBy === 'paid_first') {
      return list.sort((a, b) => {
        const diff = Number(b.is_paid) - Number(a.is_paid)
        if (diff !== 0) return diff
        return a.name.localeCompare(b.name)
      })
    }

    if (sortBy === 'unpaid_first') {
      return list.sort((a, b) => {
        const diff = Number(a.is_paid) - Number(b.is_paid)
        if (diff !== 0) return diff
        return a.name.localeCompare(b.name)
      })
    }

    if (sortBy === 'amount_desc') {
      return list.sort((a, b) => b.amount - a.amount)
    }

    return list.sort((a, b) => a.amount - b.amount)
  }, [rows, sortBy])

  return (
    <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700/60 shadow-xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Quản Lý Quỹ Tháng
          </h3>
          <span className="text-[11px] text-slate-500">Tháng {monthLabel}</span>
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as MonthlyFundSort)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-500"
        >
          <option value="name_asc">Tên A-Z</option>
          <option value="name_desc">Tên Z-A</option>
          <option value="paid_first">Đã đóng trước</option>
          <option value="unpaid_first">Chưa đóng trước</option>
          <option value="amount_desc">Tiền cao-thấp</option>
          <option value="amount_asc">Tiền thấp-cao</option>
        </select>
      </div>

      <div className="divide-y divide-slate-700/50">
        {sortedRows.map((row) => (
          <div
            key={row.user_id}
            className="py-3 flex items-center justify-between gap-3"
          >
            <div>
              <p className="text-sm font-semibold text-slate-200">{row.name}</p>
              <p className="text-[11px] text-slate-400">
                Mức quỹ: {row.amount.toLocaleString()}đ
              </p>
            </div>

            <button
              disabled={!canEdit || submitting}
              onClick={() => onTogglePaid(row.user_id, !row.is_paid)}
              className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
                row.is_paid
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {row.is_paid ? 'Đã đóng' : 'Chưa đóng'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
