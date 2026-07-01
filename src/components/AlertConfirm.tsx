import Modal from "./Modal";

interface AlertConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
  title?: string;
  isDestructive?: boolean;
}

const AlertConfirm = ({ 
  open, 
  onClose, 
  onConfirm, 
  message, 
  title = "Xác nhận hành động", 
  isDestructive = false 
}: AlertConfirmProps) => {
    return (
        <Modal open={open} onClose={onClose}>
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 border-b border-slate-700/60 pb-3">
                    <span className="text-xl">{isDestructive ? "⚠️" : "⚽"}</span>
                    <h3 className="font-bold text-slate-100 text-base">{title}</h3>
                </div>
                
                <p className="text-sm text-slate-300 leading-relaxed py-1">{message}</p>
                
                <div className="flex justify-end gap-2.5 mt-2">
                    <button
                        onClick={onClose}
                        className="bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 py-2 px-4 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
                    >
                        Hủy bỏ
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`${
                          isDestructive 
                            ? "bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/10" 
                            : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/10"
                        } py-2 px-4 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]`}
                    >
                        Xác nhận
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export default AlertConfirm;