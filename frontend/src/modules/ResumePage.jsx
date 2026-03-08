import {useCallback, useEffect, useRef, useState} from "react";
import {api} from "../api/index.js";

function ResumePreviewModal({ resume, onClose }) {
    useEffect(() => {
        const handler = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 24 }}>{resume.filename?.endsWith(".pdf") ? "📕" : "📘"}</span>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{resume.filename || `Резюме #${resume.id}`}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>ID: {resume.id}</div>
                        </div>
                    </div>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    {resume.raw_text?.trim()
                        ? <pre className="resume-preview-text">{resume.raw_text}</pre>
                        : <div style={{ color: "var(--muted)", textAlign: "center", padding: 40 }}>Текст не извлечён</div>
                    }
                </div>
            </div>
        </div>
    );
}

export function ResumePage({ token, sessions = [] }) {
    const [resumes, setResumes] = useState([]);
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [drag, setDrag] = useState(false);
    const [resumeSession, setResumeSession] = useState({});
    const [sending, setSending] = useState({});
    const fileRef = useRef();

    const load = useCallback(async () => {
        try { setResumes(await api("/resume/", {}, token)); }
        catch { setError("Не удалось загрузить резюме"); }
        setLoading(false);
    }, [token]);

    useEffect(() => { load(); }, [load]);

    const upload = async (file) => {
        if (!file) return;
        setError(""); setSuccess(""); setUploading(true);
        const form = new FormData();
        const mimeType = file.name.endsWith(".pdf") ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        const fixedFile = new File([file], file.name, { type: mimeType });
        form.append("file", fixedFile);
        try {
            await api("/resume/upload", { method: "POST", body: form }, token);
            setSuccess("Резюме успешно загружено!");
            load();
        } catch (e) { setError(e.message); }
        setUploading(false);
    };

    const handleDrop = (e) => {
        e.preventDefault(); setDrag(false);
        const file = e.dataTransfer.files[0];
        if (file) upload(file);
    };

    const sendToSession = async (resumeId) => {
        const sessionId = resumeSession[resumeId];
        if (!sessionId) return;
        setSending(p => ({ ...p, [resumeId]: true }));
        try {
            const resume = resumes.find(r => r.id === resumeId);
            await api(`/session/${sessionId}/message`, {
                method: "POST",
                body: { content: `[РЕЗЮМЕ]: ${resume.raw_text}` }
            }, token);
            setSuccess(`Резюме отправлено в сессию #${sessionId}`);
        } catch (e) {
            setError(e.message);
        }
        setSending(p => ({ ...p, [resumeId]: false }));
    };

    if (loading) return <div className="loading-center"><div className="spinner" /></div>;

    return (
        <div className="resume-page">
            <h2>Мои резюме</h2>
            <p className="sub">Загрузи своё резюме — агенты проанализируют его перед интервью</p>
            {error && <div className="error-msg">⚠️ {error}</div>}
            {success && <div className="success-msg">✅ {success}</div>}

            <div
                className={`upload-zone ${drag ? "drag" : ""}`}
                onDragOver={e => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
            >
                <input ref={fileRef} type="file" accept=".pdf,.docx" onChange={e => upload(e.target.files[0])} />
                <div className="upload-icon">{uploading ? "⏳" : "📄"}</div>
                <h3>{uploading ? "Загружаем..." : "Перетащи файл или нажми"}</h3>
                <p>Поддерживаются PDF и DOCX</p>
            </div>

            {resumes.length > 0 && (
                <div className="resume-list">
                    {resumes.map(r => (
                        <div
                            key={r.id}
                            className="resume-card"
                            onClick={() => setPreview(r)}
                            style={{ cursor: "pointer" }}
                        >
                            <div className="resume-card-icon">{r.filename?.endsWith(".pdf") ? "📕" : "📘"}</div>
                            <div className="resume-card-info">
                                <div className="resume-card-name">{r.filename || `Резюме #${r.id}`}</div>
                                <div className="resume-card-meta">
                                    ID: {r.id} · {r.raw_text ? `${r.raw_text.length} символов` : "нет текста"}
                                </div>
                            </div>

                            {sessions.length > 0 && (
                                <div
                                    style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}
                                    onClick={e => e.stopPropagation()}
                                >
                                    <select
                                        value={resumeSession[r.id] || ""}
                                        onChange={e => setResumeSession(p => ({ ...p, [r.id]: e.target.value }))}
                                        style={{
                                            background: "var(--surface2)",
                                            border: "1px solid var(--border)",
                                            borderRadius: 6,
                                            color: "var(--text)",
                                            padding: "4px 8px",
                                            fontSize: 12,
                                            fontFamily: "var(--font)",
                                            cursor: "pointer",
                                            outline: "none",
                                            maxWidth: 140,
                                        }}
                                    >
                                        <option value="">Сессия...</option>
                                        {sessions.map(s => (
                                            <option key={s.id} value={s.id}>
                                                #{s.id} {s.agent_type}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        className="btn small"
                                        disabled={!resumeSession[r.id] || sending[r.id]}
                                        onClick={() => sendToSession(r.id)}
                                        style={{ padding: "5px 10px", fontSize: 11 }}
                                    >
                                        {sending[r.id] ? <span className="spinner" style={{ width: 12, height: 12 }} /> : "→"}
                                    </button>
                                </div>
                            )}

                            <span style={{ color: "var(--muted)", fontSize: 14, flexShrink: 0, marginLeft: 8 }}>👁</span>
                        </div>
                    ))}
                </div>
            )}

            {resumes.length === 0 && !uploading && (
                <div style={{ textAlign: "center", color: "var(--muted)", padding: "40px 0", fontSize: 14 }}>
                    Резюме пока нет. Загрузи первое!
                </div>
            )}

            {preview && <ResumePreviewModal resume={preview} onClose={() => setPreview(null)} />}
        </div>
    );
}

export default ResumePage;
