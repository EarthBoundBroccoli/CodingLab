import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSession } from "../lib/auth-client";
import { getAdminSession } from "../lib/admin-auth";

export const useAdminAccess = () => {
  const { data: session, isPending } = useSession();
  const { pathname } = useLocation();
  const key = `${pathname}:${session?.user?.id || "anonymous"}`;
  const [access, setAccess] = useState({ key: null, user: null, error: "" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (isPending) return;
    let active = true;
    const verify = async () => {
      try {
        const result = await getAdminSession();
        if (active) setAccess({ key, user: result?.user || null, error: "" });
      } catch (error) {
        if (active) setAccess({ key, user: null, error: error.message });
      }
    };
    verify();
    window.addEventListener("focus", verify);
    return () => {
      active = false;
      window.removeEventListener("focus", verify);
    };
  }, [key, isPending, attempt]);

  return {
    user: access.key === key ? access.user : null,
    loading: isPending || access.key !== key,
    error: access.key === key ? access.error : "",
    retry: () => setAttempt(value => value + 1),
  };
};
