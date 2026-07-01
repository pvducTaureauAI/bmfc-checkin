import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import { toast } from "react-toastify";
import { EState } from "../common/index.ts";

interface Person {
    id: string;
    name: string;
}

const usePeople = () => {
    const [people, setPeople] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [adding, setAdding] = useState(false);
    const [updating, setUpdating] = useState(false);

    const fetchPeople = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.from("bmfc_user").select("*");
            if (error) throw error;
            setPeople(data);
        } catch (error) {
            console.error("Error fetching people:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPeople();
    }, []);

    const refreshPeople = async () => {
        await fetchPeople();
    }

    const deletePerson = async (id: string) => {
        setDeleting(true);
        try {
            const { error } = await supabase.from("bmfc_user").delete().eq("id", id);
            if (error) throw error;
            toast.success("Xóa người dùng thành công!");
            // Refresh the list after deletion
            await fetchPeople();
        } catch (error) {
            console.error("Error deleting person:", error);
            toast.error("Xóa người dùng thất bại!");
        } finally {
            setDeleting(false);
        }
    };

    const addPerson = async (name: string) => {
        setAdding(true);
        try {
            const { error } = await supabase.from("bmfc_user").insert([{ name }]);
            if (error) throw error;
            toast.success("Thêm người dùng thành công!");
            // Refresh the list after adding
            await fetchPeople();
        } catch (error) {
            console.error("Error adding person:", error);
            toast.error("Thêm người dùng thất bại!");
        } finally {
            setAdding(false);
        }
    };

    const updatePerson = async (id: string, name: string) => {
        setUpdating(true);
        try {
            const { error } = await supabase.from("bmfc_user").update({ name }).eq("id", id);
            if (error) throw error;
            toast.success("Cập nhật người dùng thành công!");
            // Refresh the list after updating
            await fetchPeople();
        } catch (error) {
            console.error("Error updating person:", error);
            toast.error("Cập nhật người dùng thất bại!");
        } finally {
            setUpdating(false);
        }
    };

    const checkinPerson = async (id: string) => {
        try {
            const { error } = await supabase.from("bmfc_checkin").update({ state: EState.DA_DIEM_DANH }).eq("user_id", id);
            if (error) throw error;
            toast.success("Điểm danh thành công!");
        } catch (error) {
            console.error("Error checking in person:", error);
            toast.error("Điểm danh thất bại!");
        }
    };

    const checkoutPerson = async (id: string) => {
        try {
            const { error } = await supabase.from("bmfc_checkin").update({ state: EState.KHONG_DIEM_DANH }).eq("user_id", id);
            if (error) throw error;
            toast.success("Hủy điểm danh thành công!");
        } catch (error) {
            console.error("Error checking out person:", error);
            toast.error("Hủy điểm danh thất bại!");
        }
    };

    const notAppearPerson = async (id: string) => {
        try {
            const { error } = await supabase.from("bmfc_checkin").update({ state: EState.DIEM_DANH_MA_KHONG_RA }).eq("user_id", id);
            if (error) throw error;
            toast.success("Cập nhật trạng thái không ra sân thành công!");
        } catch (error) {
            console.error("Error updating person to not appear:", error);
            toast.error("Cập nhật trạng thái không ra sân thất bại!");
        }
    };

    return { people, refreshPeople, deletePerson, addPerson, loading, deleting, adding, updating, updatePerson, checkinPerson, checkoutPerson, notAppearPerson };
}

export default usePeople;