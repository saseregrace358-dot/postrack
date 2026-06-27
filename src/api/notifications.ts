import axios from "axios";

const BASE_URL = "https://postrack.onrender.com";

const token = localStorage.getItem("token");

const headers = {
  Authorization: `Bearer ${token}`,
};

export const getNotificationsApi = () =>
  axios.get(`${BASE_URL}/notifications/`, {
    headers,
  });

export const markNotificationReadApi = (
  id: number
) =>
  axios.patch(
    `${BASE_URL}/notifications/${id}/read`,
    {},
    { headers }
  );