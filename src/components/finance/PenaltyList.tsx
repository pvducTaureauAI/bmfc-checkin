interface PenaltyRow {
  id: string
  user_id: string
  name: string
  date: string
  reason: string
  amount: number
  is_paid: boolean
}

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
  return (
    <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700/60 shadow-xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Quản Lý Tiền Phạt
        </h3>
        <span className="text-[11px] text-slate-500">{periodLabel}</span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-3 text-xs text-slate-300">
          Không có khoản phạt trong kỳ này.
        </div>
      ) : (
        <div className="divide-y divide-slate-700/50">
          {rows.map((row) => (
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
