import { createAuthClient } from "better-auth/react"
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
    baseURL: "http://localhost:5000", // Backend URL
    plugins: [
        inferAdditionalFields() // This allows us to access custom fields like 'role'
    ]
})

export const { signIn, signUp, useSession, signOut } = authClient;
