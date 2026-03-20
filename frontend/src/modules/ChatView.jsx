import {useCallback, useEffect, useRef, useState} from "react";
import {api} from "../api/index.js";
import ReactMarkdown from 'react-markdown'

// ─── Модалка выбора резюме / вакансии из библиотеки ───────────────────────
function AttachLibraryModal({ token, onAttach, onClose }) {
    const [tab, setTab] = useState("resume"); // "resume" | "vacancy"
    const [resumes, setResumes] = useState([]);
    const [vacancies, setVacancies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const handler = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            api("/resume/", {}, token).catch(() => []),
            api("/vacancy/saved", {}, token).catch(() => []),
        ]).then(([r, v]) => {
            setResumes(r || []);
            setVacancies(Array.isArray(v) ? v : []);
            setLoading(false);
        });
    }, [token]);

    const handleSelect = (item, type) => {
        onAttach(item, type);
        onClose();
    };

    return (
        <div
            style={{
                position: "fixed", inset: 0, zIndex: 1000,
                background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
                display: "flex", alignItems: "flex-end", justifyContent: "center",
            }}
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "16px 16px 0 0",
                    width: "100%",
                    maxWidth: 560,
                    maxHeight: "60vh",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
            >
                {/* Шапка */}
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "16px 20px 0",
                }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>Прикрепить из библиотеки</span>
                    <button onClick={onClose} style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--muted)", fontSize: 18, lineHeight: 1,
                    }}>✕</button>
                </div>

                {/* Табы */}
                <div style={{ display: "flex", gap: 4, padding: "12px 20px 0" }}>
                    {[
                        { id: "resume", label: "📄 Резюме" },
                        { id: "vacancy", label: "🏢 Вакансии" },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            style={{
                                background: tab === t.id ? "var(--accent)" : "var(--surface2)",
                                color: tab === t.id ? "#fff" : "var(--muted)",
                                border: "none", borderRadius: 8,
                                padding: "6px 14px", fontSize: 12,
                                fontWeight: 600, cursor: "pointer",
                                transition: "all 0.15s",
                            }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Список */}
                <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px 20px" }}>
                    {loading ? (
                        <div style={{ textAlign: "center", padding: 32 }}>
                            <span className="spinner" />
                        </div>
                    ) : tab === "resume" ? (
                        resumes.length === 0 ? (
                            <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: 32 }}>
                                Нет загруженных резюме
                            </div>
                        ) : resumes.map(r => (
                            <button
                                key={r.id}
                                onClick={() => handleSelect(r, "resume")}
                                style={{
                                    width: "100%", display: "flex", alignItems: "center",
                                    gap: 12, background: "var(--surface2)",
                                    border: "1px solid var(--border)", borderRadius: 10,
                                    padding: "12px 14px", marginBottom: 8,
                                    cursor: "pointer", textAlign: "left",
                                    transition: "border-color 0.15s",
                                }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
                                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
                            >
                                <span style={{ fontSize: 22, flexShrink: 0 }}>
                                    {r.filename?.endsWith(".pdf") ? "📕" : "📘"}
                                </span>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                                        {r.filename || `Резюме #${r.id}`}
                                    </div>
                                    <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>
                                        {r.raw_text ? `${r.raw_text.length} символов` : "нет текста"} · ID {r.id}
                                    </div>
                                </div>
                            </button>
                        ))
                    ) : (
                        vacancies.length === 0 ? (
                            <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: 32 }}>
                                Нет сохранённых вакансий
                            </div>
                        ) : vacancies.map(v => (
                            <button
                                key={v.id}
                                onClick={() => handleSelect(v, "vacancy")}
                                style={{
                                    width: "100%", display: "flex", alignItems: "center",
                                    gap: 12, background: "var(--surface2)",
                                    border: "1px solid var(--border)", borderRadius: 10,
                                    padding: "12px 14px", marginBottom: 8,
                                    cursor: "pointer", textAlign: "left",
                                    transition: "border-color 0.15s",
                                }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
                                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
                            >
                                <span style={{ fontSize: 22, flexShrink: 0 }}>🏢</span>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                                        {v.title || "Без названия"}
                                    </div>
                                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                                        {v.company || ""}{v.company ? " · " : ""}ID {v.vacancy_id}
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Основной компонент ────────────────────────────────────────────────────
export function ChatView({ token, session, agent, onComplete, onResumeUploaded }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [completed, setCompleted] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [savingRoadmap, setSavingRoadmap] = useState(false);
    const [roadmapSaved, setRoadmapSaved] = useState(false);
    const [showLibrary, setShowLibrary] = useState(false);
    const bottomRef = useRef();
    const textareaRef = useRef();
    const fileRef = useRef();

    const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });

    const loadHistory = useCallback(async () => {
        if (!session?.id) { setLoading(false); return; }
        try {
            const data = await api(`/session/${session.id}`, {}, token);
            setMessages(data.messages || []);
            setCompleted(data.status === "completed");
        } catch { }
        setLoading(false);
    }, [session?.id, token]);

    useEffect(() => { setLoading(true); setMessages([]); loadHistory(); }, [loadHistory]);
    useEffect(() => { scrollToBottom(); }, [messages]);

    const send = async (overrideText) => {
        const text = (overrideText ?? input).trim();
        if (!text || sending || completed) return;
        if (!overrideText) setInput("");
        setSending(true);
        const userMsg = { role: "user", content: text, created_at: new Date().toISOString() };
        setMessages(p => [...p, userMsg]);
        try {
            const res = await api(`/session/${session.id}/message`, { method: "POST", body: { content: text } }, token);
            setMessages(p => [...p, { role: "assistant", content: res.content || res.message || JSON.stringify(res), created_at: new Date().toISOString() }]);
        } catch (e) {
            setMessages(p => [...p, { role: "assistant", content: `⚠️ Ошибка: ${e.message}`, created_at: new Date().toISOString() }]);
        }
        setSending(false);
    };

    // Прикрепить из библиотеки
    const attachFromLibrary = async (item, type) => {
        if (completed || sending) return;

        let content = "";
        let previewMsg = {};

        if (type === "resume") {
            content = `Вот моё резюме:\n\n${item.raw_text}`;
            previewMsg = {
                role: "user", type: "file",
                filename: item.filename || `Резюме #${item.id}`,
                filesize: item.raw_text?.length || 0,
                fromLibrary: true,
                created_at: new Date().toISOString(),
            };
        } else {
            // vacancy — парсим raw_json если есть, иначе шлём название+компанию
            let vacancyText = `Вакансия: ${item.title || ""}`;
            if (item.company) vacancyText += `\nКомпания: ${item.company}`;
            if (item.raw_json) {
                try {
                    const parsed = JSON.parse(item.raw_json);
                    const desc = parsed.description || parsed.snippet?.requirement || "";
                    if (desc) vacancyText += `\n\nОписание:\n${desc}`;
                } catch {}
            }
            content = `Вот вакансия на которую я готовлюсь:\n\n${vacancyText}`;
            previewMsg = {
                role: "user", type: "vacancy",
                title: item.title || "Вакансия",
                company: item.company || "",
                fromLibrary: true,
                created_at: new Date().toISOString(),
            };
        }

        setMessages(p => [...p, previewMsg]);
        await send(content);
    };

    const uploadFile = async (file) => {
        if (!file || uploadingFile) return;
        setUploadingFile(true);
        const fileMsg = {
            role: "user", type: "file",
            filename: file.name, filesize: file.size,
            created_at: new Date().toISOString(),
        };
        setMessages(p => [...p, fileMsg]);
        try {
            const form = new FormData();
            const mimeType = file.name.endsWith(".pdf")
                ? "application/pdf"
                : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            form.append("file", new File([file], file.name, { type: mimeType }));
            const resume = await api("/resume/upload", { method: "POST", body: form }, token);
            if (onResumeUploaded) onResumeUploaded(resume);
            setSending(true);
            const res = await api(`/session/${session.id}/message`, {
                method: "POST",
                body: { content: `Вот моё резюме:\n\n${resume.raw_text}` }
            }, token);
            setMessages(p => [...p, {
                role: "assistant",
                content: res.content || res.message || JSON.stringify(res),
                created_at: new Date().toISOString(),
            }]);
        } catch (e) {
            setMessages(p => [...p, {
                role: "assistant",
                content: `⚠️ Не удалось загрузить файл: ${e.message}`,
                created_at: new Date().toISOString(),
            }]);
        }
        setSending(false);
        setUploadingFile(false);
        if (fileRef.current) fileRef.current.value = "";
    };

    const handleFileDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) uploadFile(file);
    };

    const complete = async () => {
        try {
            await api(`/session/${session.id}/complete`, { method: "PATCH" }, token);
            setCompleted(true);
            if (onComplete) onComplete();
        } catch (e) { alert(e.message); }
    };

    const saveRoadmap = async () => {
        setSavingRoadmap(true);
        try {
            const res = await api(`/session/${session.id}/save_roadmap`, { method: "POST" }, token);
            setRoadmapSaved(true);
            setTimeout(() => setRoadmapSaved(false), 3000);

            if (res.added > 0) {
                alert(`✅ Добавлено ${res.added} пунктов в Roadmap!`);
            } else {
                const d = res.debug || {};
                const msg = [
                    `⚠️ Добавлено 0 пунктов.`,
                    ``,
                    `Раздел плана найден: ${d.plan_section_found ? "ДА" : "НЕТ"}`,
                    d.plan_section_preview ? `Превью:\n"${d.plan_section_preview}"` : "",
                    d.items_found?.length
                        ? `Пункты: ${d.items_found.join(" | ")}`
                        : "Нумерованных пунктов не найдено в разделе.",
                    ``,
                    `Убедись что ментор дал ответ с нумерованным планом (1. ... 2. ...) и попробуй снова.`,
                ].filter(Boolean).join('\n');
                alert(msg);
            }
        } catch (e) { alert(e.message); }
        setSavingRoadmap(false);
    };

    const handleKey = (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    };

    const formatTime = (str) => {
        try { return new Date(str).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }); }
        catch { return ""; }
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    if (!session) {
        return (
            <div className="chat-container">
                <div className="empty-chat">
                    <div className="big">{agent?.icon || "💬"}</div>
                    <h3>{agent ? `${agent.label} готов` : "Выбери агента"}</h3>
                    <p>{agent ? "Создаётся новая сессия..." : "Выбери агента из меню слева, чтобы начать интервью"}</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="chat-container"
            onDragOver={e => e.preventDefault()}
            onDrop={handleFileDrop}
        >
            <div className="chat-header">
                <div className="chat-agent-icon">{agent?.icon}</div>
                <div>
                    <div className="chat-agent-name">{agent?.label}</div>
                    <div className="chat-agent-desc">{agent?.desc} · сессия #{session.id}</div>
                </div>
                <div className="chat-actions">
                    {agent?.id === "mentor" && (
                        <button
                            className="btn small"
                            onClick={saveRoadmap}
                            disabled={savingRoadmap || messages.length < 2}
                            style={{ marginRight: 8 }}
                            title="Сохранить план подготовки в Roadmap"
                        >
                            {savingRoadmap
                                ? <span className="spinner" style={{ width: 14, height: 14 }} />
                                : roadmapSaved ? "✅ Сохранено" : "🗺 В Roadmap"}
                        </button>
                    )}
                    {completed
                        ? <div className="session-complete">✅ Завершено</div>
                        : <button className="btn small danger" onClick={complete}>Завершить</button>}
                </div>
            </div>

            <div className="messages">
                {loading && <div className="loading-center"><div className="spinner" /></div>}
                {!loading && messages.length === 0 && (
                    <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 14, marginTop: 40 }}>
                        {agent?.icon} Скажи что-нибудь или прикрепи резюме 📄
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`message ${m.role}`}>
                        <div className="msg-avatar">{m.role === "user" ? "👤" : agent?.icon || "🤖"}</div>
                        <div>
                            {m.type === "file" ? (
                                <div className="msg-file-bubble">
                                    <div className="msg-file-icon">
                                        {m.filename?.endsWith(".pdf") ? "📕" : "📘"}
                                    </div>
                                    <div className="msg-file-info">
                                        <div className="msg-file-name">{m.filename}</div>
                                        <div className="msg-file-size">
                                            {m.fromLibrary
                                                ? "Из библиотеки"
                                                : `${formatSize(m.filesize)} · ${uploadingFile && i === messages.length - 1 ? "Загружается..." : "Загружено"}`
                                            }
                                        </div>
                                    </div>
                                    {!m.fromLibrary && uploadingFile && i === messages.length - 1 && (
                                        <span className="spinner" style={{ width: 16, height: 16, flexShrink: 0 }} />
                                    )}
                                </div>
                            ) : m.type === "vacancy" ? (
                                <div className="msg-file-bubble">
                                    <div className="msg-file-icon">🏢</div>
                                    <div className="msg-file-info">
                                        <div className="msg-file-name">{m.title}</div>
                                        <div className="msg-file-size">
                                            {m.company ? `${m.company} · ` : ""}Из библиотеки
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="msg-bubble markdown-body">
                                    <ReactMarkdown>{m.content}</ReactMarkdown>
                                </div>
                            )}
                            <div className="msg-time">{formatTime(m.created_at)}</div>
                        </div>
                    </div>
                ))}
                {sending && (
                    <div className="message assistant">
                        <div className="msg-avatar">{agent?.icon || "🤖"}</div>
                        <div className="msg-bubble">
                            <div className="typing-indicator">
                                <span /><span /><span />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            <div className="chat-input-area">
                <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.docx"
                    style={{ display: "none" }}
                    onChange={e => uploadFile(e.target.files[0])}
                />
                <div className="chat-input-row">
                    {/* Кнопка прикрепить файл — новый файл */}
                    <button
                        className="attach-btn"
                        onClick={() => fileRef.current?.click()}
                        disabled={completed || uploadingFile}
                        title="Загрузить новый файл резюме (PDF или DOCX)"
                    >
                        📎
                    </button>

                    {/* Кнопка выбрать из библиотеки */}
                    <button
                        className="attach-btn"
                        onClick={() => setShowLibrary(true)}
                        disabled={completed || sending}
                        title="Прикрепить резюме или вакансию из библиотеки"
                        style={{
                            fontSize: 16,
                            opacity: completed ? 0.4 : 1,
                        }}
                    >
                        🗂
                    </button>

                    <textarea
                        ref={textareaRef}
                        className="chat-input"
                        placeholder={completed ? "Сессия завершена" : "Напиши ответ или прикрепи резюме / вакансию..."}
                        value={input}
                        disabled={completed || sending}
                        onChange={e => {
                            setInput(e.target.value);
                            e.target.style.height = "44px";
                            e.target.style.height = e.target.scrollHeight + "px";
                        }}
                        onKeyDown={handleKey}
                        rows={1}
                    />
                    <button className="send-btn" onClick={() => send()} disabled={!input.trim() || sending || completed}>
                        {sending ? <span className="spinner" style={{ width: 16, height: 16 }} /> : "↑"}
                    </button>
                </div>
            </div>

            {/* Модалка выбора из библиотеки */}
            {showLibrary && (
                <AttachLibraryModal
                    token={token}
                    onAttach={attachFromLibrary}
                    onClose={() => setShowLibrary(false)}
                />
            )}
        </div>
    );
}

export default ChatView;