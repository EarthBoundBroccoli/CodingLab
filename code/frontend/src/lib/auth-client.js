import { createAuthClient } from "better-auth/react"
import { inferAdditionalFields } from "better-auth/client/plugins";

export const getBackendURL = () => {
    if (import.meta.env.VITE_API_BASE_URL) {
        return import.meta.env.VITE_API_BASE_URL;
    }
    // Fallback: use current window location hostname with port 5000
    const hostname = window.location.hostname;
    return `http://${hostname}:5000`;
};

export const authClient = createAuthClient({
    baseURL: getBackendURL(), // Backend URL
    plugins: [
        inferAdditionalFields() // This allows us to access custom fields like 'role'
    ]
})

export const { signIn, signUp, useSession, signOut } = authClient;

