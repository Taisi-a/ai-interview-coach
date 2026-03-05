export const getStoredToken = () => sessionStorage.getItem("aic_token") || "";

export const getStoredUser = () => {
    try { return JSON.parse(sessionStorage.getItem("aic_user") || "null"); }
    catch { return null; }
};

export const saveSession = (token, user) => {
    sessionStorage.setItem("aic_token", token);
    sessionStorage.setItem("aic_user", JSON.stringify(user));
};

export const clearSession = () => sessionStorage.clear();