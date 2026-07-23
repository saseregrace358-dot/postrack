import { useState } from "react";
import { askAI } from "../../api/ai";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function AIChat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
  if (!message.trim()) return;

  const userMessage = message;

  // Add user's message
  setMessages((prev) => [
    ...prev,
    {
      role: "user",
      content: userMessage,
    },
  ]);

  setMessage("");
  setLoading(true);

  try {
    const res = await askAI(userMessage);

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: res.data.reply,
      },
    ]);
  } catch (err) {
    console.error(err);

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Sorry, I couldn't process your request.",
      },
    ]);
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="max-w-4xl mx-auto p-6">

      <h1 className="text-3xl font-bold mb-6">
        DGTrack AI
      </h1>

      <div className="border rounded-lg h-[500px] overflow-y-auto p-4 mb-4 bg-white">

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`mb-4 ${
              msg.role === "user"
                ? "text-right"
                : "text-left"
            }`}
          >
            <div
              className={`inline-block px-4 py-3 rounded-xl max-w-[80%] ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-black"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <p className="text-gray-500">
            DGTrack AI is thinking...
          </p>
        )}

      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask DGTrack AI anything..."
        className="w-full border rounded-lg p-3"
        rows={4}
      />

      <button
        onClick={sendMessage}
        disabled={loading}
        className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg"
      >
        {loading ? "Thinking..." : "Send"}
      </button>

    </div>
  );
}