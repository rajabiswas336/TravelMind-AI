import { ChatMessage } from "@/lib/types";

export function ChatBubble({ message }: { message: ChatMessage }) {
  const isAssistant = message.role === "assistant";
  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 font-body text-[15px] leading-relaxed ${
          isAssistant
            ? "bg-white text-ink rounded-tl-sm border border-ink/8"
            : "bg-ink text-paper rounded-tr-sm"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}
