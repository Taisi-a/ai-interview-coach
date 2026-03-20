import { AGENTS } from "../constants.ts";

export const Sidebar = ({ sessions, user, page, setPage, activeSession, openSession, logout }) => {
    const initials = (email) => email ? email[0].toUpperCase() : "?";
    return (
        <div className="sidebar">
            <div className="logo">
                <div className="logo-icon">🎯</div>
                <div>
                    <div className="logo-text">Interview</div>
                    <div className="logo-sub">AI Coach</div>
                </div>
            </div>

            <div className="sidebar-section">
                <div className="sidebar-label">Навигация</div>
                <button className={`sidebar-btn ${page === "agents" ? "active" : ""}`} onClick={() => setPage("agents")}>
                    <span className="icon">🤖</span><span className="label">Агенты</span>
                </button>
                <button className={`sidebar-btn ${page === "resume" ? "active" : ""}`} onClick={() => setPage("resume")}>
                    <span className="icon">📄</span><span className="label">Резюме</span>
                </button>
                <button className={`sidebar-btn ${page === "vacancy" ? "active" : ""}`} onClick={() => setPage("vacancy")}>
                    <span className="icon">💼</span><span className="label">Вакансия</span>
                </button>
                <button className={`sidebar-btn ${page === "roadmap" ? "active" : ""}`} onClick={() => setPage("roadmap")}>
                    <span className="icon">🗺️</span><span className="label">Roadmap</span>
                </button>
            </div>

            {sessions.length > 0 && (
                <div className="sidebar-section" style={{ flex: 1, overflowY: "auto" }}>
                    <div className="sidebar-label">Сессии <span className="badge">{sessions.length}</span></div>
                    {sessions.map((s, index) => {
                        const ag = AGENTS.find(a => a.id === s.agent_type);
                        return (
                            <button
                                key={s.id}
                                className={`sidebar-btn ${activeSession?.id === s.id ? "active" : ""}`}
                                onClick={() => openSession(s)}
                            >
                                <span className="icon">{ag?.icon || "💬"}</span>
                                {/* Показываем порядковый номер среди сессий юзера, а не ID из БД */}
                                <span className="label">#{index + 1} {ag?.label || s.agent_type}</span>
                                {s.status === "completed" && <span style={{ color: "var(--success)", fontSize: 11 }}>✓</span>}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="sidebar-footer">
                <div className="user-card">
                    <div className="avatar">{initials(user?.email || "")}</div>
                    <span className="user-name">{user?.email || "Пользователь"}</span>
                    <button className="logout-btn" onClick={logout} title="Выйти">⎋</button>
                </div>
            </div>
        </div>
    );
};
export default Sidebar;