import {AGENTS} from "../constants.ts";
import AuthScreen from "./AuthScreen.jsx";

export function AgentsPage({ token, onSelectAgent }) {
    return (
        <div className="agents-page">
            <h2>Выбери AI-агента</h2>
            <p className="sub">Каждый агент специализируется на своём типе интервью</p>
            <div className="agents-grid">
                {AGENTS.map(a => (
                    <div
                        key={a.id}
                        className="agent-card"
                        style={{ "--card-color": a.color }}
                        onClick={() => onSelectAgent(a)}
                    >
                        <div className="agent-icon">{a.icon}</div>
                        <div className="agent-label">{a.label}</div>
                        <div className="agent-desc">{a.desc}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
export default AgentsPage;
