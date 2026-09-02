"use client";

import { useState } from "react";
import { Conversation, Message } from "@/types/modules/hub";
import { hubService } from "@/services/hub/hub";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/utils/formatters";
import { HUB_LABELS } from "@/utils/constants";
import { cn } from "@/lib/utils";
import { MessageSquare, Plus, Send } from "lucide-react";

export function MessagingView({
  conversations,
  online,
  onChanged,
}: {
  conversations: Conversation[];
  online: boolean;
  onChanged: () => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openConversation = async (id: string) => {
    setSelectedId(id);
    setLoading(true);
    setError(null);
    try {
      const data = await hubService.getMessages(id);
      setMessages(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    if (!selectedId || !draft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const message = await hubService.sendMessage({
        conversation_id: selectedId,
        body: draft.trim(),
      });
      setMessages((prev) => [...prev, message]);
      setDraft("");
      await onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const createConversation = async () => {
    if (!contact.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const conversation = await hubService.createConversation(contact.trim());
      setContact("");
      setNewOpen(false);
      await onChanged();
      await openConversation(conversation.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="text-lg font-light">{HUB_LABELS.CONVERSATIONS}</h3>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-white/10"
          onClick={() => setNewOpen(true)}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {HUB_LABELS.NEW_CONVERSATION}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* HUB-32 : liste des conversations */}
        <div className="space-y-2 lg:col-span-1">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => openConversation(conversation.id)}
              className={cn(
                "w-full rounded-xl border p-3 text-left transition",
                selectedId === conversation.id
                  ? "border-primary/50 bg-primary/10"
                  : "border-white/10 bg-white/5 hover:border-white/20",
              )}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{conversation.participant}</p>
                {conversation.unread > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    {conversation.unread}
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {conversation.last_message || "Nouvelle conversation"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(conversation.updated_at)}
              </p>
            </button>
          ))}
        </div>

        {/* HUB-33 : fil de conversation */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {selected ? selected.participant : HUB_LABELS.CONTACT}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {!selectedId && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Sélectionnez une conversation.
                </p>
              )}
              {loading && (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              )}
              {!loading &&
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                      message.sender === "me"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-white/10 text-foreground",
                    )}
                  >
                    <p>{message.body}</p>
                    <p className="mt-0.5 text-right text-[10px] opacity-70">
                      {formatDateTime(message.created_at)}
                    </p>
                  </div>
                ))}
            </div>

            {selectedId && (
              <div className="flex items-center gap-2">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder={HUB_LABELS.TYPE_MESSAGE}
                />
                <Button
                  size="icon"
                  onClick={send}
                  disabled={busy || !online || !draft.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </CardContent>
        </Card>
      </div>

      {/* HUB-34 : nouvelle conversation */}
      <Dialog open={newOpen} onOpenChange={(o) => !o && setNewOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{HUB_LABELS.NEW_CONVERSATION}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Nom du contact"
            />
            <Button
              className="w-full"
              onClick={createConversation}
              disabled={busy || !online || !contact.trim()}
            >
              {HUB_LABELS.NEW_CONVERSATION}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
