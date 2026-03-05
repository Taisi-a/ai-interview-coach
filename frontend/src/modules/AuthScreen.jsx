import {useState} from "react";
import {api} from "../api/index.js";


export function AuthScreen({ onLogin }) {
    const [tab, setTab] = useState("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const submit = async () => {
        setError(""); setSuccess("");
        if (!email || !password) { setError("Заполните все поля"); return; }
        setLoading(true);
        try {
            if (tab === "register") {
                await api("/register", { method: "POST", body: { email, password,name:'leonid' } });
                setSuccess("Аккаунт создан! Войдите.");
                setTab("login");
            } else {
                const data = await api("/login", {
                    method: "POST",
                    body: { email, password }
                });

                if (!data.access_token) {
                    throw new Error("Неверный email или пароль");
                }

                const me = await api("/me", {}, data.access_token);

                onLogin(data.access_token, me);
            }
        } catch (e) { setError(e.message); }
        setLoading(false);
    };

    return (
        <div className="auth-screen">
            <div className="auth-card">
                <div className="auth-logo">
                    <div className="auth-logo-icon">🎯</div>
                    <h1>AI Interview Coach</h1>
                    <p>Подготовься к интервью с AI-наставником</p>
                </div>
                <div className="auth-tabs">
                    <button className={`auth-tab ${tab === "login" ? "active" : ""}`} onClick={() => setTab("login")}>Войти</button>
                    <button className={`auth-tab ${tab === "register" ? "active" : ""}`} onClick={() => setTab("register")}>Регистрация</button>
                </div>
                {error && <div className="error-msg">⚠️ {error}</div>}
                {success && <div className="success-msg">✅ {success}</div>}
                <div className="field">
                    <label>EMAIL</label>
                    <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
                </div>
                <div className="field">
                    <label>ПАРОЛЬ</label>
                    <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
                </div>
                <button className="btn" disabled={loading} onClick={submit}>
                    {loading ? <span className="spinner" /> : tab === "login" ? "Войти" : "Создать аккаунт"}
                </button>
            </div>
        </div>
    );
}
export default AuthScreen;
