import type { PenaltySettings } from '../../common/types'

interface SettingsTabProps {
  canEdit: boolean
  submitting: boolean
  penaltySettings: PenaltySettings
  setPenaltySettings: (value: PenaltySettings) => void
  onUpdateSettings: () => void
}

export default function SettingsTab({
  canEdit,
  submitting,
  penaltySettings,
  setPenaltySettings,
  onUpdateSettings,
}: SettingsTabProps) {
  return (
    <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700/60 shadow-xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Thiết Lập Định Mức Phạt
        </h3>
        {!canEdit && (
          <span className="text-[11px] text-slate-500">Chỉ admin được sửa</span>
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
        onClick={onUpdateSettings}
        disabled={submitting || !canEdit}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/10 disabled:opacity-50"
      >
        {submitting ? 'Đang cập nhật...' : '✔️ Lưu Cấu Hình Phạt Mới'}
      </button>
    </div>
  )
}
