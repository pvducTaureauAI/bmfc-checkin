import ModalComponent from "react-modal";

const Modal = ({open, onClose, children}: {open: boolean, onClose: () => void, children: React.ReactNode}) => {
    return (
        <ModalComponent
            isOpen={open}
            onRequestClose={onClose}
            ariaHideApp={false}
            className="bg-slate-800 border border-slate-700/80 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 focus:outline-none text-slate-100 transform transition-all"
            overlayClassName="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[100]"
        >
            {children}
        </ModalComponent>
    )
}

export default Modal;