import api from "./api";
const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

// Unread notifications (for bell)
export const getNewNotificationsApi = () =>
  api.get(`/notifications/new`, {
    headers: getHeaders(),
  });

// All notifications (history page)
export const getAllNotificationsApi = () =>
  api.get(`/notifications/all`, {
    headers: getHeaders(),
  });

// Mark one notification as read
export const markNotificationReadApi = (id: number) =>
  api.patch(
    `/notifications/${id}/read`,
    {},
    {
      headers: getHeaders(),
    }
  );

// Mark every notification as read
export const markAllNotificationsReadApi = () =>
  api.patch(
    `/notifications/read-all`,
    {},
    {
      headers: getHeaders(),
    }
  );