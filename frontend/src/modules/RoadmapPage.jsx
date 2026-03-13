import { useCallback, useEffect, useState } from "react";
import { api } from "../api/index.js";

const STATUS_LABELS = {
    todo: "Не начато",
    in_progress: "В процессе",
    done: "Выполнено",
};

const STATUS_ICONS = {
    todo: "⬜",
    in_progress: "🔄",
    done: "✅",
};

const STATUS_ORDER = ["todo", "in_progress", "done"];

export function RoadmapPage({ token }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updating, setUpdating] = useState({});

    const load = useCallback(async () => {
        try {
            const res = await api("/roadmap/", {}, token);
            setData(res);
        } catch {
            setError("Не удалось загрузить roadmap");
        }
        setLoading(false);
    }, [token]);

    useEffect(() => { load(); }, [load]);

    const updateStatus = async (itemId, currentStatus) => {
        // Переключаем статус по кругу: todo → in_progress → done → todo
        const nextIndex = (STATUS_ORDER.indexOf(currentStatus) + 1) % STATUS_ORDER.length;
        const nextStatus = STATUS_ORDER[nextIndex];

        setUpdating(p => ({ ...p, [itemId]: true }));
        try {
            await api(`/roadmap/${itemId}`, { method: "PATCH", body: { status: nextStatus } }, token);
            await load();
        } catch (e) {
            setError(e.message);
        }
        setUpdating(p => ({ ...p, [itemId]: false }));
    };

    if (loading) return <div className="loading-center"><div className="spinner" /></div>;

    return (
        <div className="resume-page">
            <h2>Мой план подготовки</h2>
            <p className="sub">Отмечай прогресс — кликни на пункт чтобы изменить статус</p>

            {error && <div className="error-msg">⚠️ {error}</div>}

            {/* Прогресс-бар */}
            {data && data.total > 0 && (
                <div style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "20px 24px",
                    marginBottom: 24,
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>Прогресс</span>
                        <span style={{ color: "var(--accent)", fontWeight: 700, fontFamily: "var(--mono)" }}>
                            {data.done} / {data.total} · {data.percent}%
                        </span>
                    </div>
                    <div style={{
                        background: "var(--surface2)",
                        borderRadius: 99,
                        height: 10,
                        overflow: "hidden",
                    }}>
                        <div style={{
                            height: "100%",
                            width: `${data.percent}%`,
                            background: data.percent === 100
                                ? "var(--success)"
                                : "var(--accent)",
                            borderRadius: 99,
                            transition: "width 0.4s ease",
                        }} />
                    </div>
                    {data.percent === 100 && (
                        <div style={{ textAlign: "center", marginTop: 12, fontSize: 14, color: "var(--success)" }}>
                            🎉 Все темы изучены! Ты готов к интервью.
                        </div>
                    )}
                </div>
            )}

            {/* Список пунктов */}
            {data && data.items.length > 0 ? (
                <div className="resume-list">
                    {data.items.map(item => (
                        <div
                            key={item.id}
                            className="resume-card"
                            onClick={() => !updating[item.id] && updateStatus(item.id, item.status)}
                            style={{
                                cursor: updating[item.id] ? "wait" : "pointer",
                                opacity: updating[item.id] ? 0.6 : 1,
                                borderLeft: item.status === "done"
                                    ? "3px solid var(--success)"
                                    : item.status === "in_progress"
                                        ? "3px solid var(--accent)"
                                        : "3px solid var(--border)",
                            }}
                        >
                            <div style={{ fontSize: 22, flexShrink: 0 }}>
                                {updating[item.id]
                                    ? <span className="spinner" style={{ width: 20, height: 20 }} />
                                    : STATUS_ICONS[item.status]}
                            </div>

                            <div className="resume-card-info">
                                <div
                                    className="resume-card-name"
                                    style={{
                                        textDecoration: item.status === "done" ? "line-through" : "none",
                                        color: item.status === "done" ? "var(--muted)" : "var(--text)",
                                    }}
                                >
                                    {item.title}
                                </div>
                                {item.description && (
                                    <div className="resume-card-meta">{item.description}</div>
                                )}
                            </div>

                            <div style={{
                                fontSize: 11,
                                color: item.status === "done"
                                    ? "var(--success)"
                                    : item.status === "in_progress"
                                        ? "var(--accent)"
                                        : "var(--muted)",
                                fontFamily: "var(--mono)",
                                flexShrink: 0,
                            }}>
                                {STATUS_LABELS[item.status]}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: "center", color: "var(--muted)", padding: "40px 0", fontSize: 14 }}>
                    План пока пуст. Начни сессию с Ментором — он составит твой roadmap!
                </div>
            )}
        </div>
    );
}

export default RoadmapPage;