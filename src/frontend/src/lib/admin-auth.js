const ADMIN_AUTH_KEY = "codinglab-admin-auth";

export const ADMIN_EMAIL = "admin@example.com";
export const ADMIN_PASSWORD = "admin123";

export const loginAdmin = (email, password) => {
  const isValid = email === ADMIN_EMAIL && password === ADMIN_PASSWORD;

  if (isValid) {
    localStorage.setItem(ADMIN_AUTH_KEY, "true");
  }

  return isValid;
};

export const isAdminAuthenticated = () => {
  return localStorage.getItem(ADMIN_AUTH_KEY) === "true";
};

export const logoutAdmin = () => {
  localStorage.removeItem(ADMIN_AUTH_KEY);
};
