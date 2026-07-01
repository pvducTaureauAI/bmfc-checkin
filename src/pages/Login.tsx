import { toast } from "react-toastify";
import { supabase } from "../utils/supabase";

const Login = () => {
    const loginHandler = async (username: string, password: string) => {
        try {
            const res = await supabase.auth.signInWithPassword({
                email: username,
                password: password,
            });
            
            if (res.error) {
                toast.error("Đăng nhập thất bại!");
            } else {
                toast.success("Đăng nhập thành công!");
                window.location.href = "/";
            }
        } catch (error) {
            console.error("Error logging in:", error);
        }
    };

    const submitHandler = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        const { username, password } = event.currentTarget.elements as any;
        const usernameValue = username.value;
        const passwordValue = password.value;

        loginHandler(usernameValue, passwordValue);
    }

    return (
        <div className="w-full h-full flex items-center justify-center">
            <div className="w-full max-w-md p-8 bg-white rounded shadow-md border border-gray-300">
                <h2 className="text-2xl font-bold mb-6 text-center">Đăng nhập</h2>
                <form onSubmit={submitHandler}>
                    <div className="mb-4">
                        <label htmlFor="username" className="block text-gray-700 font-semibold mb-2">Tên đăng nhập</label>
                        <input type="text" id="username" name="username" className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300" />
                    </div>
                    <div className="mb-6">
                        <label htmlFor="password" className="block text-gray-700 font-semibold mb-2">Mật khẩu</label>
                        <input type="password" id="password" name="password" className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300" />
                    </div>
                    <button type="submit" className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition duration-200">Đăng nhập</button>
                </form>
            </div>
        </div>
    );
}

export default Login;