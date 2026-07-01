import { useMemo, useState } from 'react'

interface PenaltyRow {
  id: string
  user_id: string
  name: string
  date: string
  reason: string
  amount: number
  is_paid: boolean
}

type PenaltySort =
  | 'date_desc'
  | 'date_asc'
  | 'name_asc'
  | 'amount_desc'
  | 'amount_asc'
  | 'unpaid_first'

interface PenaltyListProps {
  rows: PenaltyRow[]
  canEdit: boolean
  submitting: boolean
  periodLabel: string
  onTogglePaid: (recordId: string, nextPaid: boolean) => void
}

export default function PenaltyList({
  rows,
  canEdit,
  submitting,
  periodLabel,
  onTogglePaid,
}: PenaltyListProps) {
  const [sortBy, setSortBy] = useState<PenaltySort>('date_desc')

  const sortedRows = useMemo(() => {
    const list = [...rows]

    if (sortBy === 'date_desc') {
      return list.sort((a, b) => b.date.localeCompare(a.date))
    }

    if (sortBy === 'date_asc') {
      return list.sort((a, b) => a.date.localeCompare(b.date))
    }

    if (sortBy === 'name_asc') {
      return list.sort((a, b) => a.name.localeCompare(b.name))
    }

    if (sortBy === 'amount_desc') {
      return list.sort((a, b) => b.amount - a.amount)
    }

    if (sortBy === 'amount_asc') {
      return list.sort((a, b) => a.amount - b.amount)
    }

    return list.sort((a, b) => {
      const diff = Number(a.is_paid) - Number(b.is_paid)
      if (diff !== 0) return diff
      return b.date.localeCompare(a.date)
    })
  }, [rows, sortBy])

  return (
    <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700/60 shadow-xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Quản Lý Tiền Phạt
          </h3>
          <span className="text-[11px] text-slate-500">{periodLabel}</span>
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as PenaltySort)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-500"
        >
          <option value="date_desc">Ngày mới-cũ</option>
          <option value="date_asc">Ngày cũ-mới</option>
          <option value="name_asc">Tên A-Z</option>
          <option value="amount_desc">Tiền cao-thấp</option>
          <option value="amount_asc">Tiền thấp-cao</option>
          <option value="unpaid_first">Chưa thu trước</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-3 text-xs text-slate-300">
          Không có khoản phạt trong kỳ này.
        </div>
      ) : (
        <div className="divide-y divide-slate-700/50">
          {sortedRows.map((row) => (
            <div
              key={row.id}
              className="py-3 flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  {row.name}
                </p>
                <p className="text-[11px] text-slate-400">
                  {row.date} - {row.reason}
                </p>
                <p className="text-xs font-bold text-rose-300 mt-1">
                  {row.amount.toLocaleString()}đ
                </p>
              </div>

              <button
                disabled={!canEdit || submitting}
                onClick={() => onTogglePaid(row.id, !row.is_paid)}
                className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
                  row.is_paid
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {row.is_paid ? 'Đã thu' : 'Chưa thu'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
