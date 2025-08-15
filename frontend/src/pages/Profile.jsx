import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Profile() {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        axios.get("http://localhost:5000/api/me", { withCredentials: true })
            .then(res => setUser(res.data))
            .catch(() => navigate("/"));
    }, [navigate]);

    if (!user) return <p>Loading...</p>;

    return (
        <div style={{ padding: 20 }}>
            <h1>Xin chào {user.profile_name}</h1>
            <img src={user.avatar} alt="avatar" width="100" />
            <p>SteamID64: {user.steamid64}</p>
            <button onClick={() => {
                axios.get("http://localhost:5000/auth/logout", { withCredentials: true })
                    .then(() => navigate("/"));
            }}>
                Đăng xuất
            </button>
        </div>
    );
}
