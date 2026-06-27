import axios from "axios";

const BASE_URL = "https://postrack.onrender.com";

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const getNotificationsApi = () =>
  axios.get(`${BASE_URL}/notifications/`, {
    headers: getHeaders(),
  });

export const markNotificationReadApi = (id: number) =>
  axios.patch(
    `${BASE_URL}/notifications/${id}/read`,
    {},
    {
      headers: getHeaders(),
    }
  );