import { useCallback, useEffect, useState } from "react";

export function VacancySection({ token, api }) {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [vacancies, setVacancies] = useState([]);  // массив сохранённых

    const load = useCallback(async () => {
        try {
            const data = await api("/vacancy/saved", {}, token);
            setVacancies(Array.isArray(data) ? data : []);
        } catch {
            setError("Не удалось загрузить вакансии");
        }
    }, [token]);

    useEffect(() => { load(); }, [load]);

    const extractId = (url) => {
        const match = url.match(/vacancy\/(\d+)/);
        return match ? match[1] : null;
    };

    const submit = async () => {
        setError(""); setSuccess("");
        const id = extractId(url);
        if (!id) { setError("Некорректная ссылка. Пример: https://hh.ru/vacancy/671337"); return; }
        setLoading(true);
        try {
            const saved = await api(`/vacancy/save/${id}`, { method: "POST" }, token);
            await load();
            setSuccess(`Вакансия сохранена: ${saved.title}`);
            setUrl("");
        } catch (e) {
            setError(e.message);
        }
        setLoading(false);
    };

    return (
        <div className="resume-page">
            <h2>Вакансии</h2>
            <p className="sub" style={{ marginBottom: 20 }}>
                Вставь ссылку с hh.ru — агенты учтут требования при интервью
            </p>

            {error && <div className="error-msg">⚠️ {error}</div>}
            {success && <div className="success-msg">✅ {success}</div>}

            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <input
                    style={{
                        flex: 1,
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: "10px 14px",
                        color: "var(--text)",
                        fontFamily: "var(--mono)",
                        fontSize: 13,
                        outline: "none",
                    }}
                    placeholder="https://hh.ru/vacancy/131008746"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && submit()}
                />
                <button
                    className="btn"
                    style={{ width: "auto", padding: "10px 20px" }}
                    onClick={submit}
                    disabled={loading || !url.trim()}
                >
                    {loading ? <span className="spinner" /> : "Загрузить"}
                </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {vacancies.map(v => (
                    <div key={v.id} style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "16px 20px",
                    }}>
                        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                            {v.title || "Без названия"}
                        </div>
                        {v.company && (
                            <div style={{ fontSize: 13, color: "var(--muted)" }}>
                                🏢 {v.company}
                            </div>
                        )}
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                            ID: {v.vacancy_id}
                        </div>
                    </div>
                ))}

                {vacancies.length === 0 && (
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>
                        Нет сохранённых вакансий
                    </div>
                )}
            </div>
        </div>
    );
}

export default VacancySection;