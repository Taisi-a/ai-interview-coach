import { useState } from "react";

export function VacancySection({ token, api }) {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [vacancy, setVacancy] = useState(null);

    const extractId = (url) => {
        const match = url.match(/vacancy\/(\d+)/);
        return match ? match[1] : null;
    };

    const submit = async () => {
        setError(""); setSuccess(""); setVacancy(null);
        const id = extractId(url);
        if (!id) { setError("Некорректная ссылка. Пример: https://hh.ru/vacancy/671337"); return; }
        setLoading(true);
        try {
            const data = await api(`/vacancy/${id}`, {}, token);
            setVacancy(data);
            setSuccess(`Вакансия загружена: ${data.name}`);
        } catch (e) {
            setError(e.message);
        }
        setLoading(false);
    };

    return (
        <div style={{ marginTop: 32 }}>
            <h2>Вакансия</h2>
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
                <button className="btn" style={{ width: "auto", padding: "10px 20px" }} onClick={submit} disabled={loading || !url.trim()}>
                    {loading ? <span className="spinner" /> : "Загрузить"}
                </button>
            </div>

            {vacancy && (
                <div style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "20px 24px",
                }}>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{vacancy.name}</div>
                    {vacancy.employer?.name && (
                        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
                            🏢 {vacancy.employer.name}
                        </div>
                    )}
                    {vacancy.salary && (
                        <div style={{ fontSize: 13, color: "var(--success)", marginBottom: 12 }}>
                            💰 {vacancy.salary.from && `от ${vacancy.salary.from}`} {vacancy.salary.to && `до ${vacancy.salary.to}`} {vacancy.salary.currency}
                        </div>
                    )}
                    {vacancy.snippet?.requirement && (
                        <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}
                             dangerouslySetInnerHTML={{ __html: vacancy.snippet.requirement }}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
export default VacancySection;