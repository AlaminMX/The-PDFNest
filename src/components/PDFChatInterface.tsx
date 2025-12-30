import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Trash2, Sparkles, MessageSquare, Bot, User, FileDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AIContentRenderer } from "@/components/AIContentRenderer";
import { exportAndUpload } from "@/lib/exportPDF";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/sessionLogger";

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
  const [exporting, setExporting] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (open && fileId) {
      loadConversation();
    }
  }, [open, fileId]);

  useEffect(() => {
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
      
      // Log activity
      await logActivity("ai_chat", { fileName, fileId, questionLength: question.length });
    } catch (error: any) {
      console.error("Error asking question:", error);
      toast.error(error.message || "Failed to get response");
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

  const handleExportPDF = async () => {
    if (!user?.id) {
      toast.error("Please sign in to export");
      return;
    }
    
    if (messages.length === 0) {
      toast.error("No conversation to export");
      return;
    }
    
    setExporting(true);
    
    const chatContent = messages.map(msg => {
      const role = msg.role === 'user' ? '**You:**' : '**AI Assistant:**';
      return `${role}\n${msg.content}`;
    }).join('\n\n---\n\n');
    
    await exportAndUpload({
      title: 'Chat Conversation',
      subtitle: `Discussion about "${fileName}"`,
      content: chatContent,
      type: 'chat',
      sourceFileName: fileName
    }, user.id);
    
    setExporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Chat with PDF</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                  {fileName}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {loading && (
                <Badge variant="secondary" className="gap-1.5 bg-primary/10 text-primary border-0">
                  <Sparkles className="h-3 w-3 animate-pulse" />
                  Thinking
                </Badge>
              )}
              {messages.length > 0 && (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleExportPDF}
                    disabled={exporting}
                    className="h-8 px-2 text-muted-foreground hover:text-primary"
                    title="Export as PDF"
                  >
                    {exporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileDown className="h-4 w-4" />
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleClearConversation}
                    className="h-8 px-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6" ref={scrollRef}>
          <div className="py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <MessageSquare className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Start a conversation
                </p>
                <p className="text-xs text-muted-foreground/70 max-w-[240px]">
                  Ask questions about the PDF content and get AI-powered answers
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted/50 rounded-bl-md'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    ) : (
                      <AIContentRenderer content={msg.content} />
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </div>
              ))
            )}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted/50 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t border-border/50 bg-muted/10 flex-shrink-0">
          <div className="flex gap-2">
            <Input
              placeholder="Ask a question about this PDF..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAsk()}
              disabled={loading}
              className="flex-1 h-10"
            />
            <Button 
              onClick={handleAsk} 
              disabled={loading || !question.trim()}
              size="icon"
              className="h-10 w-10"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
