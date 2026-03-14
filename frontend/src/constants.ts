export const AGENTS = [
    {
        id: "hr",
        label: "HR-агент",
        icon: "👤",
        desc: "Поведенческие вопросы, soft skills",
        color: "#6EE7B7",
        bg: "#064E3B",
    },
    {
        id: "tech_lead",
        label: "Tech Lead",
        icon: "⚙️",
        desc: "Алгоритмы, System Design",
        color: "#93C5FD",
        bg: "#1E3A5F",
    },
    {
        id: "mentor",
        label: "Ментор",
        icon: "🧭",
        desc: "Анализ резюме, roadmap",
        color: "#FCA5A5",
        bg: "#4C1D1D",
    },
    {
        id: "code_review",
        label: "Code Review",
        icon: "🔍",
        desc: "Разбор кода кандидата",
        color: "#FDE68A",
        bg: "#3D2700",
    },
];
export const STATUS_ICONS = {
    todo: "⬜",
    in_progress: "🔄",
    done: "✅",
};
export const STATUS_LABELS = {
    todo: "Не начато",
    in_progress: "В процессе",
    done: "Выполнено",
};
export const STATUS_ORDER = ["todo", "in_progress", "done"];
