import axios from "axios";

const AI_URL =
  "https://your-n8n-domain.com/webhook/biztrack-ai";

export const askAiApi = async (
  message: string
) => {
  return axios.post(AI_URL, {
    message,
  });
};