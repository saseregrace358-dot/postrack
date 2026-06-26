import { useState } from "react";
import axios from "axios";

export default function AIChat() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");

  const sendMessage = async () => {
    const res = await axios.post(
      "https://postrack.onrender.com/ai/chat",
      {
        message
      }
    );

    setReply(res.data.reply);
  };

  return (
    <div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <button onClick={sendMessage}>
        Send
      </button>

      <div>{reply}</div>
    </div>
  );
}