import { useCallback, useEffect, useState } from "react";
import { api } from "../api/index.js";
import ReactMarkdown from "react-markdown";

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

const STATUS_COLORS = {
    done: "var(--success)",
    in_progress: "var(--accent)",
    todo: "var(--border)",
};

function RoadmapCard({ item, onStatusChange, onDelete, updating, deleting }) {
    const [expanded, setExpanded] = useState(false);

    const handleStatusClick = (e) => {
        e.stopPropagation();
        if (!updating && !deleting) onStatusChange(item.id, item.status);
    };

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        onDelete(item.id);
    };

    const toggleExpand = () => {
        if (item.description) setExpanded(p => !p);
    };

    const borderColor = STATUS_COLORS[item.status];

    return (
        <div
            style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderLeft: `4px solid ${borderColor}`,
                borderRadius: 10,
                marginBottom: 10,
                overflow: "hidden",
                opacity: updating || deleting ? 0.6 : 1,
                transition: "opacity 0.2s, border-color 0.3s",
            }}
        >
            {/* Основная строка карточки */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                    cursor: item.description ? "pointer" : "default",
                    userSelect: "none",
                }}
                onClick={toggleExpand}
            >
                {/* Иконка статуса — клик меняет статус */}
                <button
                    onClick={handleStatusClick}
                    disabled={updating || deleting}
                    title="Изменить статус"
                    style={{
                        background: "none",
                        border: "none",
                        cursor: updating ? "wait" : "pointer",
                        fontSize: 20,
                        padding: 0,
                        flexShrink: 0,
                        lineHeight: 1,
                    }}
                >
                    {updating
                        ? <span className="spinner" style={{ width: 18, height: 18 }} />
                        : STATUS_ICONS[item.status]}
                </button>

                {/* Заголовок */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: item.status === "done" ? "var(--muted)" : "var(--text)",
                            textDecoration: item.status === "done" ? "line-through" : "none",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {item.title}
                    </div>
                    {item.category && (
                        <div style={{
                            fontSize: 11,
                            color: "var(--muted)",
                            marginTop: 2,
                            fontFamily: "var(--mono)",
                        }}>
                            {item.category}
                        </div>
                    )}
                </div>

                {/* Статус-лейбл */}
                <div style={{
                    fontSize: 11,
                    color: item.status === "done"
                        ? "var(--success)"
                        : item.status === "in_progress"
                            ? "var(--accent)"
                            : "var(--muted)",
                    fontFamily: "var(--mono)",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                }}>
                    {STATUS_LABELS[item.status]}
                </div>

                {/* Стрелка раскрытия (только если есть description) */}
                {item.description && (
                    <div style={{
                        color: "var(--muted)",
                        fontSize: 12,
                        flexShrink: 0,
                        transition: "transform 0.2s",
                        transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                    }}>
                        ▾
                    </div>
                )}

                {/* Кнопка удаления */}
                <button
                    onClick={handleDeleteClick}
                    disabled={deleting}
                    title="Удалить"
                    style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--muted)",
                        fontSize: 14,
                        padding: "0 2px",
                        flexShrink: 0,
                        opacity: 0.5,
                        lineHeight: 1,
                    }}
                >
                    {deleting
                        ? <span className="spinner" style={{ width: 12, height: 12 }} />
                        : "🗑"}
                </button>
            </div>

            {/* Раскрывающееся описание */}
            {expanded && item.description && (
                <div
                    style={{
                        padding: "0 16px 16px 52px",
                        borderTop: "1px solid var(--border)",
                        paddingTop: 12,
                    }}
                >
                    <div
                        className="markdown-body"
                        style={{
                            fontSize: 13,
                            color: "var(--text)",
                            lineHeight: 1.7,
                        }}
                    >
                        <ReactMarkdown>{item.description}</ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    );
}

export function RoadmapPage({ token }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [updating, setUpdating] = useState({});
    const [deleting, setDeleting] = useState({});

    const [newTitle, setNewTitle] = useState("");
    const [adding, setAdding] = useState(false);

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

    const deleteItem = async (itemId) => {
        setDeleting(p => ({ ...p, [itemId]: true }));
        try {
            await api(`/roadmap/${itemId}`, { method: "DELETE" }, token);
            await load();
        } catch (e) {
            setError(e.message);
        }
        setDeleting(p => ({ ...p, [itemId]: false }));
    };

    const addItem = async () => {
        const title = newTitle.trim();
        if (!title) return;
        setAdding(true);
        setError("");
        try {
            await api("/roadmap/", {
                method: "POST",
                body: { title, order: data?.total || 0 }
            }, token);
            setNewTitle("");
            setSuccess("Пункт добавлен!");
            setTimeout(() => setSuccess(""), 2000);
            await load();
        } catch (e) {
            setError(e.message);
        }
        setAdding(false);
    };

    // Группировка по категориям
    const grouped = data?.items?.reduce((acc, item) => {
        const key = item.category || "Без категории";
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    const hasCategories = grouped && Object.keys(grouped).some(k => k !== "Без категории");

    if (loading) return <div className="loading-center"><div className="spinner" /></div>;

    return (
        <div className="resume-page">
            <h2>Мой план подготовки</h2>
            <p className="sub">
                Кликни на иконку статуса чтобы обновить прогресс · Нажми на карточку чтобы развернуть детали
            </p>

            {error && <div className="error-msg">⚠️ {error}</div>}
            {success && <div className="success-msg">✅ {success}</div>}

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
                            background: data.percent === 100 ? "var(--success)" : "var(--accent)",
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

            {/* Форма добавления */}
            <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                <input
                    style={{
                        flex: 1,
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: "10px 14px",
                        color: "var(--text)",
                        fontSize: 13,
                        outline: "none",
                        fontFamily: "var(--font)",
                    }}
                    placeholder="Добавить тему, например: Алгоритмы на графах"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addItem()}
                    disabled={adding}
                />
                <button
                    className="btn"
                    style={{ width: "auto", padding: "10px 20px" }}
                    onClick={addItem}
                    disabled={adding || !newTitle.trim()}
                >
                    {adding ? <span className="spinner" /> : "+ Добавить"}
                </button>
            </div>

            {/* Список карточек */}
            {data && data.items.length > 0 ? (
                hasCategories ? (
                    // Сгруппированный вид по категориям
                    Object.entries(grouped).map(([category, items]) => (
                        <div key={category} style={{ marginBottom: 28 }}>
                            <div style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: "var(--muted)",
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                marginBottom: 10,
                                paddingLeft: 4,
                            }}>
                                {category}
                                <span style={{
                                    marginLeft: 8,
                                    fontWeight: 400,
                                    color: "var(--muted)",
                                    fontSize: 11,
                                    fontFamily: "var(--mono)",
                                }}>
                                    {items.filter(i => i.status === "done").length}/{items.length}
                                </span>
                            </div>
                            {items.map(item => (
                                <RoadmapCard
                                    key={item.id}
                                    item={item}
                                    onStatusChange={updateStatus}
                                    onDelete={deleteItem}
                                    updating={!!updating[item.id]}
                                    deleting={!!deleting[item.id]}
                                />
                            ))}
                        </div>
                    ))
                ) : (
                    // Плоский список если нет категорий
                    <div>
                        {data.items.map(item => (
                            <RoadmapCard
                                key={item.id}
                                item={item}
                                onStatusChange={updateStatus}
                                onDelete={deleteItem}
                                updating={!!updating[item.id]}
                                deleting={!!deleting[item.id]}
                            />
                        ))}
                    </div>
                )
            ) : (
                <div style={{ textAlign: "center", color: "var(--muted)", padding: "40px 0", fontSize: 14 }}>
                    План пока пуст. Начни сессию с Ментором или добавь тему вручную!
                </div>
            )}
        </div>
    );
}

export default RoadmapPage;