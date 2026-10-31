export const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, { credentials: "include", ...options });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
};
