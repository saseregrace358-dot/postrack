import api from "./api";

export const askAiApi = (message: string) => {
  return api.post("/ai/chat", {
    message,
  });
};