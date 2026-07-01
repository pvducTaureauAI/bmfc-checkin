import MonthlyFundList from '../finance/MonthlyFundList'
import PenaltyList from '../finance/PenaltyList'

type FinanceView = 'fund' | 'penalty'

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

interface FinanceTabProps {
  canEdit: boolean
  submitting: boolean
  financeView: FinanceView
  setFinanceView: (view: FinanceView) => void
  monthlyFundRows: MonthlyFundRow[]
  penaltyRows: PenaltyRow[]
  fundMonth: string
  penaltyRangeLabel: string
  onToggleFundPaid: (userId: string) => void
  onTogglePenaltyPaid: (recordId: string, nextPaid: boolean) => void
}

export default function FinanceTab({
  canEdit,
  submitting,
  financeView,
  setFinanceView,
  monthlyFundRows,
  penaltyRows,
  fundMonth,
  penaltyRangeLabel,
  onToggleFundPaid,
  onTogglePenaltyPaid,
}: FinanceTabProps) {
  return (
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
          Chế độ xem công khai chỉ cho phép đọc dữ liệu. Các thao tác cập nhật
          trạng thái đóng tiền cần đăng nhập admin.
        </div>
      )}

      {financeView === 'fund' ? (
        <MonthlyFundList
          rows={monthlyFundRows}
          canEdit={canEdit}
          submitting={submitting}
          monthLabel={fundMonth}
          onTogglePaid={(userId) => {
            onToggleFundPaid(userId)
          }}
        />
      ) : (
        <PenaltyList
          rows={penaltyRows}
          canEdit={canEdit}
          submitting={submitting}
          periodLabel={penaltyRangeLabel}
          onTogglePaid={(recordId, nextPaid) => {
            onTogglePenaltyPaid(recordId, nextPaid)
          }}
        />
      )}
    </div>
  )
}
