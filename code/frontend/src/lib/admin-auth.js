import { authClient, getBackendURL } from "./auth-client";

export const getAdminSession = async () => {
  const response = await fetch(`${getBackendURL()}/api/admin/session`, {
    credentials: "include",
    cache: "no-store",
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error("Unable to verify admin access. Please try again.");
  return response.json();
};

export const loginAdmin = async (email, password) => {
  const { error } = await authClient.signIn.email({ email, password });
  if (error) throw new Error(error.message || "Invalid email or password.");
  const session = await getAdminSession();
  if (!session) throw new Error("This account does not have admin access.");
  return session;
};

export const logoutAdmin = async () => {
  const { error } = await authClient.signOut();
  if (error) throw new Error(error.message || "Unable to sign out. Please try again.");
};
