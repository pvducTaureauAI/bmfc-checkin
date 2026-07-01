import { useEffect, useState } from "react";
import useAuth from "../hooks/useAuth";
import usePeople from "../hooks/usePeople";
import Modal from "../components/Modal";

const Home = () => {
    const { people, loading, addPerson, adding } = usePeople();
    const { user } = useAuth();

    const [isModalAddOpen, setIsModalAddOpen] = useState(false);

    if (loading) {
        return <div className="text-center mt-10">Đang tải...</div>;
    }

    if (!people?.length) {
        return <div className="text-center mt-10">Không thể tải danh sách người dùng.</div>;
    }

    return (
        <div className="text-center mt-10">
            {/* table cho danh sach người dùng, nếu user đã đăng nhập thì hiển thị thêm action để xóa và cập nhật người dùng */}
            <h1 className="text-4xl font-bold mb-4">Danh sách người dùng</h1>
            <button
                onClick={() => setIsModalAddOpen(true)}
                className="bg-green-500 text-white px-4 py-2 rounded mb-4 ml-100"
                disabled={adding}
            >
                {adding ? "Đang thêm..." : "Thêm người dùng"}
            </button>
            <table className="w-full border border-gray-300">
                <thead>
                    <tr>
                        <th className="border border-gray-300 px-4 py-2">Tên</th>
                        {user && <th className="border border-gray-300 px-4 py-2">Hành động</th>}
                    </tr>
                </thead>
                <tbody>
                    {people.map((person) => (
                        <tr key={person.id}>
                            <td className="border border-gray-300 px-4 py-2">{person.name}</td>
                            {user && (
                                <td className="border border-gray-300 px-4 py-2">
                                    
                                    
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>

            <ModalAdd open={isModalAddOpen} onClose={() => setIsModalAddOpen(false)} onAdd={addPerson} />
        </div>
    );
}

export default Home;



const ModalAdd = ({open, onClose, onAdd}: {open: boolean, onClose: () => void, onAdd: (name: string) => void}) => {
    const [name, setName] = useState("");
    
    const handleAdd = async () => {
        await onAdd(name);
        setName("");
        onClose();
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
        >
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên người dùng"
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300 mb-4"
            />
            <button
                onClick={handleAdd}
                className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition duration-200" 
            >
                Thêm người dùng
            </button>
        </Modal>
    )
}

const ModalUpdate = ({open, onClose, onUpdate, currentName}: {open: boolean, onClose: () => void, onUpdate: (name: string) => void, currentName: string}) => {
    const [name, setName] = useState(currentName);
    
    const handleUpdate = async () => {
        await onUpdate(name);
        setName("");
        onClose();
    }

    useEffect(() => {
        setName(currentName);
    }, [currentName]);

    return (
        <Modal
            open={open}
            onClose={onClose}
        >
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên người dùng"
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300 mb-4"
            />
            <button
                onClick={handleUpdate}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition duration-200"
            >
                Cập nhật người dùng
            </button>
        </Modal>
    )
}