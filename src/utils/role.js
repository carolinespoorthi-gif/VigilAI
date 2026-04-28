export const getRole = () => {
    return localStorage.getItem("role") || "user";
};

export const setRole = (role) => {
    localStorage.setItem("role", role);
};
