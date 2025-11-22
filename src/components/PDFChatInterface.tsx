import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Trash2, Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface PDFChatInterfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  fileName: string;
}

export function PDFChatInterface({ open, onOpenChange, fileId, fileName }: PDFChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && fileId) {
      loadConversation();
    }
  }, [open, fileId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadConversation = async () => {
    try {
      const { data } = await supabase
        .from('pdf_conversations')
        .select('id, messages')
        .eq('pdf_file_id', fileId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setConversationId(data.id);
        setMessages((data.messages as unknown) as Message[]);
      }
    } catch (error) {
      // No existing conversation, start fresh
      setMessages([]);
      setConversationId(null);
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: question,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-with-pdf', {
        body: { fileId, question, conversationId }
      });

      if (error) throw error;

      setConversationId(data.conversationId);
      setMessages((data.messages as unknown) as Message[]);
    } catch (error: any) {
      console.error("Error asking question:", error);
      toast.error(error.message || "Failed to get response");
      // Remove the user message if failed
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleClearConversation = async () => {
    if (conversationId) {
      await supabase
        .from('pdf_conversations')
        .delete()
        .eq('id', conversationId);
    }
    setMessages([]);
    setConversationId(null);
    toast.success("Conversation cleared");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div>
                <DialogTitle>Chat with PDF</DialogTitle>
                <DialogDescription>{fileName}</DialogDescription>
              </div>
              {loading && (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3 animate-pulse" />
                  Thinking
                </Badge>
              )}
            </div>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearConversation}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <p>Ask any question about this PDF</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground animate-pulse">AI is analyzing the PDF...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Input
            placeholder="Ask a question about this PDF..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !loading && handleAsk()}
            disabled={loading}
          />
          <Button onClick={handleAsk} disabled={loading || !question.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}