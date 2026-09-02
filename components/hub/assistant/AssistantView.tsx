"use client";

import { useState } from "react";
import { aiAssistant } from "@/lib/ai/assistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HUB_LABELS } from "@/utils/constants";
import { cn } from "@/lib/utils";
import { Send, Sparkles } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const WELCOME: ChatMessage = {
  role: "assistant",
  text: "Bonjour, je suis l'assistant IA d'AssoShop. Posez-moi une question sur vos cotisations, prêts, tontines ou la marketplace.",
};

export function AssistantView() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const question = input.trim();
    if (!question) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setBusy(true);

    try {
      const result = await aiAssistant.ask(question);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: result.answer },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-lg font-light">{HUB_LABELS.ASSISTANT_TITLE}</h3>
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="max-h-96 space-y-3 overflow-y-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                message.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-white/10 text-foreground",
              )}
            >
              {message.text}
            </div>
          ))}
          {busy && (
            <p className="text-xs text-muted-foreground">
              L&apos;assistant rédige…
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={HUB_LABELS.ASSISTANT_PROMPT}
          />
          <Button size="icon" onClick={send} disabled={busy || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
