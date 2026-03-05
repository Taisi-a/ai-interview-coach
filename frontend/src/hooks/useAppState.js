import { useState, useEffect, useCallback } from "react";
import { api } from "../api/index.js";
import { clearSession, getStoredToken, getStoredUser, saveSession } from "../utils.js";

export function useAppState() {
    const [token, setToken] = useState(getStoredToken);
    const [user, setUser] = useState(getStoredUser);
    const [page, setPage] = useState("agents");
    const [sessions, setSessions] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [activeAgent, setActiveAgent] = useState(null);
    const [creatingSession, setCreatingSession] = useState(false);

    const loadSessions = useCallback(async () => {
        if (!token) return;
        try { setSessions(await api("/session/", {}, token)); } catch { }
    }, [token]);

    useEffect(() => { if (token) loadSessions(); }, [token, loadSessions]);

    const handleLogin = (tok, me) => {
        setToken(tok); setUser(me);
        saveSession(tok, me);
    };

    const logout = () => {
        setToken(""); setUser(null);
        clearSession();
        setSessions([]); setActiveSession(null); setActiveAgent(null);
    };

    const selectAgent = async (agent) => {
        setActiveAgent(agent);
        setPage("chat");
        setActiveSession(null);
        setCreatingSession(true);
        try {
            const sess = await api("/session/", { method: "POST", body: { agent_type: agent.id } }, token);
            setActiveSession(sess);
            await loadSessions();
        } catch (e) {
            alert("Не удалось создать сессию: " + e.message);
            setPage("agents");
        } finally {
            setCreatingSession(false);
        }
    };

    const openSession = (sess, agents) => {
        const agent = agents.find(a => a.id === sess.agent_type) || agents[0];
        setActiveAgent(agent);
        setActiveSession(sess);
        setPage("chat");
    };

    return {
        token, user, page, setPage,
        sessions, activeSession, activeAgent, creatingSession,
        handleLogin, logout, selectAgent, loadSessions, openSession,
    };
}