interface MonthlyFundRow {
  user_id: string
  name: string
  is_paid: boolean
  amount: number
}

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
  return (
    <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700/60 shadow-xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Quản Lý Quỹ Tháng
        </h3>
        <span className="text-[11px] text-slate-500">Tháng {monthLabel}</span>
      </div>

      <div className="divide-y divide-slate-700/50">
        {rows.map((row) => (
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
