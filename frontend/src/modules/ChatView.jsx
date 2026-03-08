import {useCallback, useEffect, useRef, useState} from "react";
import {api} from "../api/index.js";

export function ChatView({ token, session, agent, onComplete, onResumeUploaded }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [completed, setCompleted] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
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

    const send = async () => {
        const text = input.trim();
        if (!text || sending || completed) return;
        setInput(""); setSending(true);
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

    const uploadFile = async (file) => {
        if (!file || uploadingFile) return;
        setUploadingFile(true);

        // Показываем файл в чате сразу
        const fileMsg = {
            role: "user",
            type: "file",
            filename: file.name,
            filesize: file.size,
            created_at: new Date().toISOString(),
        };
        setMessages(p => [...p, fileMsg]);

        try {
            const form = new FormData();
            const mimeType = file.name.endsWith(".pdf")
                ? "application/pdf"
                : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            const fixedFile = new File([file], file.name, { type: mimeType });
            form.append("file", fixedFile);

            // Загружаем резюме
            const resume = await api("/resume/upload", { method: "POST", body: form }, token);
            if (onResumeUploaded) onResumeUploaded(resume);

            // Отправляем текст резюме агенту как сообщение
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
                                            {formatSize(m.filesize)} · {uploadingFile && i === messages.length - 1 ? "Загружается..." : "Загружено"}
                                        </div>
                                    </div>
                                    {uploadingFile && i === messages.length - 1 && (
                                        <span className="spinner" style={{ width: 16, height: 16, flexShrink: 0 }} />
                                    )}
                                </div>
                            ) : (
                                <div className="msg-bubble">
                                    {m.content?.includes("```")
                                        ? m.content.split(/(```[\s\S]*?```)/g).map((chunk, ci) =>
                                            chunk.startsWith("```")
                                                ? <pre key={ci}>{chunk.replace(/```\w*\n?/, "").replace(/```$/, "")}</pre>
                                                : chunk)
                                        : m.content}
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
                {/* Скрытый input для файла */}
                <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.docx"
                    style={{ display: "none" }}
                    onChange={e => uploadFile(e.target.files[0])}
                />
                <div className="chat-input-row">
                    {/* Кнопка прикрепить файл */}
                    <button
                        className="attach-btn"
                        onClick={() => fileRef.current?.click()}
                        disabled={completed || uploadingFile}
                        title="Прикрепить резюме (PDF или DOCX)"
                    >
                        📎
                    </button>
                    <textarea
                        ref={textareaRef}
                        className="chat-input"
                        placeholder={completed ? "Сессия завершена" : "Напиши ответ или перетащи резюме сюда..."}
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
                    <button className="send-btn" onClick={send} disabled={!input.trim() || sending || completed}>
                        {sending ? <span className="spinner" style={{ width: 16, height: 16 }} /> : "↑"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ChatView;
