import axios from "axios";

const BASE_URL = "https://postrack.onrender.com";

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

// Unread notifications (for bell)
export const getNewNotificationsApi = () =>
  axios.get(`${BASE_URL}/notifications/new`, {
    headers: getHeaders(),
  });

// All notifications (history page)
export const getAllNotificationsApi = () =>
  axios.get(`${BASE_URL}/notifications/all`, {
    headers: getHeaders(),
  });

// Mark one notification as read
export const markNotificationReadApi = (id: number) =>
  axios.patch(
    `${BASE_URL}/notifications/${id}/read`,
    {},
    {
      headers: getHeaders(),
    }
  );

// Mark every notification as read
export const markAllNotificationsReadApi = () =>
  axios.patch(
    `${BASE_URL}/notifications/read-all`,
    {},
    {
      headers: getHeaders(),
    }
  );