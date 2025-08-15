import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";

export default function ProtectedRoute({ children }) {
    const [isAuth, setIsAuth] = useState(null);

    useEffect(() => {
        axios
            .get("http://localhost:5000/api/me", { withCredentials: true })
            .then(() => setIsAuth(true))
            .catch(() => setIsAuth(false));
    }, []);

    if (isAuth === null) return <p>Đang kiểm tra đăng nhập...</p>;
    if (!isAuth) return <Navigate to="/" replace />;

    return children;
}