export default function Home() {
  const backendURL = "http://localhost:5000"; // Backend

  return (
    <div style={{ padding: 20 }}>
      <h1>Trang chủ</h1>
      <a href={`${backendURL}/auth/steam`}>
        <button>Đăng nhập với Steam</button>
      </a>
    </div>
  );
}
