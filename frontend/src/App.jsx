import './styles.css';
import { AuthScreen, AgentsPage, ResumePage, ChatView, Sidebar, VacancySection, RoadmapPage } from "./modules/index.js";
import { useAppState } from "./hooks/useAppState.js";
import { AGENTS } from "./constants.js";
import { api } from "./api/index.js";

export default function App() {
    const {
        token, user, page, setPage,
        sessions, activeSession, activeAgent, creatingSession,
        handleLogin, logout, selectAgent, loadSessions, openSession,
    } = useAppState();

    if (!token) return <AuthScreen onLogin={handleLogin} />;

    return (
        <div className="app">
            <Sidebar
                user={user}
                sessions={sessions}
                page={page}
                setPage={setPage}
                activeSession={activeSession}
                openSession={(sess) => openSession(sess, AGENTS)}
                logout={logout}
            />
            <div className="main">
                {page === "agents" && <AgentsPage token={token} onSelectAgent={selectAgent} />}
                {page === "resume" && <ResumePage token={token} sessions={sessions} />}
                {page === "chat" && (
                    creatingSession
                        ? <div className="loading-center"><div className="spinner" /></div>
                        : <ChatView
                            token={token}
                            session={activeSession}
                            agent={activeAgent}
                            onComplete={loadSessions}
                        />
                )}
                {page === "vacancy" && <VacancySection token={token} api={api} />}
                {page === "roadmap" && <RoadmapPage token={token} />}
            </div>
        </div>
    );
}