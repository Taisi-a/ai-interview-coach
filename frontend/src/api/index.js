export const API_BASE = "http://localhost:8080";

export const api = async (path, opts = {}, token) => {
    const headers = { ...(opts.headers || {}) };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (opts.body && typeof opts.body === "object" && !(opts.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
        opts.body = JSON.stringify(opts.body);
    }
    const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
};