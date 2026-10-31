export const NOTIFICATIONS_CHANGED = "codinglab:notifications-changed";

export async function fetchNotifications(baseURL, signal, fetchImpl = fetch) {
  const response = await fetchImpl(`${baseURL}/api/notifications`, {
    credentials: "include", signal,
  });
  if (!response.ok) throw new Error("Could not load notifications. Please try again.");
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error("Could not load notifications. Please try again.");
  return data;
}

export async function markNotificationsRead(baseURL, notifications, signal, fetchImpl = fetch) {
  const ids = notifications.filter(item => !item.isRead).map(item => item._id);
  if (!ids.length) return notifications;
  const response = await fetchImpl(`${baseURL}/api/notifications/read-all`, {
    method: "PATCH", credentials: "include", signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) throw new Error("Your notifications loaded, but could not be marked as read. Please retry.");
  return notifications.map(item => ({ ...item, isRead: true }));
}

// Display the successfully fetched list before attempting the read update.
export async function loadNotificationInbox(baseURL, { signal, onLoaded, fetchImpl = fetch }) {
  const notifications = await fetchNotifications(baseURL, signal, fetchImpl);
  if (signal.aborted) return null;
  onLoaded(notifications);
  try {
    const readNotifications = await markNotificationsRead(baseURL, notifications, signal, fetchImpl);
    return { notifications: readNotifications, readError: "" };
  } catch (error) {
    if (signal.aborted) return null;
    return { notifications, readError: error.message };
  }
}
