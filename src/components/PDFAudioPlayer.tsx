import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Volume2, Sparkles, Copy, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

  useEffect(() => {
    if (open && fileId) {
      // Reset state when modal opens
      setText("");
      setNote("");
      setStartPage("1");
      setEndPage("10");
    }
  }, [open, fileId]);

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

  const handleExtract = () => {
    loadPageText();
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
      window.speechSynthesis.speak(utterance);
      toast.success("Speaking...");
    } else {
      toast.error("Text-to-speech not supported in this browser");
    }
  };

  const handleStop = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Volume2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">AI Voice Reader</DialogTitle>
                <DialogDescription className="text-xs mt-1">{fileName}</DialogDescription>
              </div>
            </div>
            {loading && (
              <Badge variant="secondary" className="gap-1.5">
                <Sparkles className="h-3 w-3 animate-pulse" />
                Extracting
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="px-6 py-4 bg-muted/20 border-b space-y-4 flex-shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startPage">Start Page</Label>
              <Input
                id="startPage"
                type="number"
                min="1"
                value={startPage}
                onChange={(e) => setStartPage(e.target.value)}
                placeholder="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endPage">End Page</Label>
              <Input
                id="endPage"
                type="number"
                min="1"
                value={endPage}
                onChange={(e) => setEndPage(e.target.value)}
                placeholder="10"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleExtract} disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting pages {startPage}-{endPage}...
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4" />
                  Extract Pages {startPage}-{endPage}
                </>
              )}
            </Button>
            {totalPages && (
              <span className="text-xs text-muted-foreground">
                Total pages: {totalPages}
              </span>
            )}
          </div>

          {note && !loading && (
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">{note}</p>
          )}

          <Alert>
            <Volume2 className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Using browser's built-in text-to-speech. For enhanced AI voices, OpenAI API integration is required.
            </AlertDescription>
          </Alert>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 flex-1 overflow-hidden">
            <div className="relative">
              <Loader2 className="h-14 w-14 animate-spin text-primary" />
              <Sparkles className="h-6 w-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Extracting text for voice reader...</p>
              <p className="text-xs text-muted-foreground">Processing pages {startPage}-{endPage}</p>
            </div>
          </div>
        )}

        {text && !loading && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 px-6">
              <div className="pb-6">
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Extracted Text (Pages {startPage}-{endPage})</Label>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleCopy}
                        className="h-8"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Card className="bg-muted/30 border-muted">
                      <ScrollArea className="h-[300px] p-4">
                        <div className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                          {text}
                        </div>
                      </ScrollArea>
                    </Card>
                  </div>
                </div>

                <div className="flex gap-2 justify-between pt-4 border-t">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleStop}>
                      Stop
                    </Button>
                    <Button variant="default" size="sm" onClick={handleSpeak} className="gap-2">
                      <Volume2 className="h-4 w-4" />
                      Speak Text
                    </Button>
                  </div>
                  <Button variant="default" size="sm" onClick={handleDownload} className="gap-2">
                    <Download className="h-4 w-4" />
                    Download Text
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}