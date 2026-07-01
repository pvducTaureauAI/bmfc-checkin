import Modal from "./Modal";

const AlertConfirm = ({ open, onClose, onConfirm, message }: { open: boolean; onClose: () => void; onConfirm: () => void; message: string }) => {
    return (
        <Modal
            open={open}
            onClose={onClose}
        >
            <div className="p-4">
                <p className="mb-4">{message}</p>
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="bg-gray-300 text-gray-800 py-2 px-4 rounded hover:bg-gray-400 transition duration-200"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition duration-200"
                    >
                        Xác nhận
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export default AlertConfirm;