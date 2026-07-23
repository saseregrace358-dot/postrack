import api from "./api";

export const askAI = (message: string) =>
  api.post("/ai/chat", {
    message,
  });