import ModalComponent from "react-modal";


const Modal = ({open, onClose, children}: {open: boolean, onClose: () => void, children: React.ReactNode}) => {
    return (
        <ModalComponent
            isOpen={open}
            onRequestClose={onClose}
            className="bg-white p-4 rounded-lg shadow-lg max-w-md mx-auto mt-20"
            overlayClassName="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center"
        >
            {children}
        </ModalComponent>
    )
}

export default Modal;