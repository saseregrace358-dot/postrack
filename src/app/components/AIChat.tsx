import { useState, useEffect, useRef } from "react";
import { askAiApi } from "../../api/ai";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AIChatProps {
  open: boolean;
  onClose: () => void;
}

export default function AIChat({
  open,
  onClose,
}: AIChatProps) {

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMessage = message.trim();

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
      const res = await askAiApi(userMessage);

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
          content: "Sorry, something went wrong.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };
  

 return (
    
  <div
    className={`
      fixed inset-0 z-50
      ${open ? "flex" : "hidden"}
      justify-end
      bg-black/40
    `}
    
  >
    {/* Chat Panel */}
    <div
      onClick={(e) => e.stopPropagation()}
      className="
        w-full
        h-full
        md:w-[430px]
        bg-white
        dark:bg-slate-900
        shadow-2xl
        flex
        flex-col
      "
    >
     {/* Header */}
    <div
  className="
    sticky
    top-0
    z-10
    flex
    items-center
    justify-between
    border-b
    px-5
    py-4
    bg-white
    dark:bg-slate-900
  "
>
      <div>
        <h2 className="text-xl font-bold">DGTrack AI</h2>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Ask me anything.
        </p>
      </div>

      <button
        onClick={() => {
          setMessages([]);
          onClose();
        }}
        className="px-3 py-2 rounded-lg bg-red-600 text-white"
      >
        End Chat
      </button>
    </div>

    {/* Messages */}
    <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50 dark:bg-slate-950">

      {messages.length === 0 && (
        <div className="text-center text-gray-400 mt-20">
          <h2 className="text-2xl font-semibold mb-3">
            👋 Welcome to DGTrack AI
          </h2>

          <p>
            Ask me about your business, programming,
            finance or anything else.
          </p>
        </div>
      )}

      {messages.map((msg, index) => (
        <div
          key={index}
          className={`flex mb-5 ${
            msg.role === "user"
              ? "justify-end"
              : "justify-start"
          }`}
        >
          <div
            className={`max-w-[75%] px-5 py-3 rounded-2xl whitespace-pre-wrap ${
              msg.role === "user"
                ? "bg-blue-600 text-white rounded-br-md"
                : "bg-white dark:bg-slate-800 shadow border rounded-bl-md"
            }`}
          >
            {msg.content}
          </div>
        </div>
      ))}

      {loading && (
        <div className="flex justify-start mb-5">
          <div className="bg-white dark:bg-slate-800 border shadow rounded-2xl rounded-bl-md px-5 py-4">
            <div className="flex gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce [animation-delay:.15s]"></span>
              <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce [animation-delay:.3s]"></span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />

    </div>

    {/* Input */}
    <div className="border-t bg-white dark:bg-slate-900 p-4">

      <div className="flex gap-3">

        <textarea
            value={message}
            rows={1}
            placeholder="Message DGTrack AI..."
            className="flex-1 resize-none border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />

          <button
            onClick={sendMessage}
            disabled={loading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
      </div>

    </div>
</div>
  </div>
);}