import { useEffect, useState } from "react";
import axios from "axios";
import { getBackendURL, useSession } from "../lib/auth-client";

const paths = { stats: "/api/submissions/user-stats", recent: "/api/submissions/recent", daily: "/api/problems/daily" };
const initial = { loading: true, data: null, error: "" };

export const useGrowthData = () => {
  const { data: session, isPending } = useSession();
  const userId = session?.user?.id;
  const [resources, setResources] = useState({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (isPending || !userId) return;
    const controller = new AbortController();
    // Each section settles independently so an unavailable challenge cannot hide progress.
    Object.entries(paths).forEach(([name, path]) => {
      axios.get(`${getBackendURL()}${path}`, {
        withCredentials: true, signal: controller.signal, timeout: 15000,
      }).then(({ data }) => {
        if (!controller.signal.aborted) setResources(previous => ({
          ...previous, [name]: { userId, loading: false, data, error: "" },
        }));
      }).catch(error => {
        if (!controller.signal.aborted) setResources(previous => ({
          ...previous, [name]: {
            userId, loading: false, data: null,
            error: name === "daily" && error.response?.status === 404
              ? "No daily challenge is available yet. Browse the problem library instead."
              : "Could not load this section. Please try again.",
          },
        }));
      });
    });
    return () => controller.abort();
  }, [userId, isPending, attempt]);

  return {
    ...Object.fromEntries(Object.keys(paths).map(name => [name,
      !isPending && resources[name]?.userId === userId ? resources[name] : initial,
    ])),
    retry: () => { setResources({}); setAttempt(value => value + 1); },
  };
};
