import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Volume2, Sparkles, Copy, Download, Square, Play } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AIContentRenderer } from "@/components/AIContentRenderer";

interface PDFAudioPlayerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  fileName: string;
}

export function PDFAudioPlayer({ open, onOpenChange, fileId, fileName }: PDFAudioPlayerProps) {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string>("");
  const [startPage, setStartPage] = useState("1");
  const [endPage, setEndPage] = useState("10");
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (open && fileId) {
      setText("");
      setNote("");
      setStartPage("1");
      setEndPage("10");
    }
  }, [open, fileId]);

  useEffect(() => {
    const handleEnd = () => setIsSpeaking(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.addEventListener?.('end', handleEnd);
    }
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.removeEventListener?.('end', handleEnd);
      }
    };
  }, []);

  const loadPageText = async () => {
    setLoading(true);
    try {
      const start = parseInt(startPage) || 1;
      const end = parseInt(endPage) || 10;

      if (start < 1) {
        toast.error("Start page must be at least 1");
        setLoading(false);
        return;
      }

      if (end < start) {
        toast.error("End page must be greater than or equal to start page");
        setLoading(false);
        return;
      }

      if (end - start > 50) {
        toast.error("Maximum 50 pages can be converted at once");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('pdf-to-speech', {
        body: { 
          fileId,
          startPage: start,
          endPage: end
        }
      });

      if (error) throw error;
      setText(data.text);
      setTotalPages(data.totalPages);
      setNote(data.note || "");
    } catch (error: any) {
      console.error("Error loading text:", error);
      toast.error(error.message || "Failed to extract text");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast.success("Text copied to clipboard");
  };

  const handleDownload = () => {
    const content = `=== VOICE READER TEXT (Pages ${startPage}-${endPage}) ===\n\n${text}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}-voice-reader-pages-${startPage}-${endPage}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Text downloaded");
  };

  const handleSpeak = () => {
    if ('speechSynthesis' in window && text) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      toast.success("Speaking...");
    } else {
      toast.error("Text-to-speech not supported in this browser");
    }
  };

  const handleStop = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Volume2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">AI Voice Reader</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                  {fileName}
                </DialogDescription>
              </div>
            </div>
            {loading && (
              <Badge variant="secondary" className="gap-1.5 bg-primary/10 text-primary border-0">
                <Sparkles className="h-3 w-3 animate-pulse" />
                Extracting
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="px-6 py-4 bg-muted/10 border-b border-border/50 space-y-4 flex-shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startPage" className="text-xs">Start Page</Label>
              <Input
                id="startPage"
                type="number"
                min="1"
                value={startPage}
                onChange={(e) => setStartPage(e.target.value)}
                placeholder="1"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="endPage" className="text-xs">End Page</Label>
              <Input
                id="endPage"
                type="number"
                min="1"
                value={endPage}
                onChange={(e) => setEndPage(e.target.value)}
                placeholder="10"
                className="h-9"
              />
            </div>

            <div className="flex items-end">
              <Button onClick={loadPageText} disabled={loading} className="w-full h-9 gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4" />
                    Extract Text
                  </>
                )}
              </Button>
            </div>
          </div>

          {totalPages && (
            <p className="text-xs text-muted-foreground">
              PDF has {totalPages} pages total
            </p>
          )}

          {note && !loading && (
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">{note}</p>
          )}

          <Alert className="bg-muted/30 border-border/50">
            <Volume2 className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Using browser's built-in text-to-speech for audio playback.
            </AlertDescription>
          </Alert>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 flex-1">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <Sparkles className="h-5 w-5 absolute -top-1 -right-1 text-primary animate-pulse" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Extracting text for voice reader...</p>
              <p className="text-xs text-muted-foreground">Processing pages {startPage}-{endPage}</p>
            </div>
          </div>
        ) : text ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 px-6 py-4">
              <Card className="p-5 bg-muted/20 border-border/30">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-sm font-medium">
                    Extracted Text (Pages {startPage}-{endPage})
                  </Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleCopy}
                    className="h-8 px-2"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <ScrollArea className="h-[240px]">
                  <AIContentRenderer content={text} />
                </ScrollArea>
              </Card>
            </ScrollArea>

            <div className="px-6 py-4 border-t border-border/50 bg-muted/10 flex gap-2 justify-between flex-shrink-0">
              <div className="flex gap-2">
                {isSpeaking ? (
                  <Button variant="outline" size="sm" onClick={handleStop} className="gap-2 h-9">
                    <Square className="h-3.5 w-3.5" />
                    Stop
                  </Button>
                ) : (
                  <Button variant="default" size="sm" onClick={handleSpeak} className="gap-2 h-9">
                    <Play className="h-3.5 w-3.5" />
                    Speak Text
                  </Button>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2 h-9">
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}