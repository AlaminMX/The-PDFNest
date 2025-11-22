import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Volume2 } from "lucide-react";
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
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (open && fileId) {
      loadPageText();
    }
  }, [open, fileId, currentPage]);

  const loadPageText = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pdf-to-speech', {
        body: { fileId, page: currentPage, voice: 'alloy' }
      });

      if (error) throw error;
      setText(data.text);
      setTotalPages(data.totalPages);
      
      if (data.message) {
        toast.info(data.message);
      }
    } catch (error: any) {
      console.error("Error loading text:", error);
      toast.error(error.message || "Failed to extract text");
    } finally {
      setLoading(false);
    }
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Voice Reader</DialogTitle>
          <DialogDescription>{fileName} - Page {currentPage} of {totalPages}</DialogDescription>
        </DialogHeader>

        <Alert>
          <Volume2 className="h-4 w-4" />
          <AlertDescription>
            Using browser's built-in text-to-speech. For enhanced AI voices, OpenAI API integration is required.
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="max-h-[300px] overflow-y-auto p-4 bg-muted/30 rounded-md">
              <p className="text-sm">{text}</p>
            </div>

            <div className="flex gap-2 justify-between">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous Page
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next Page
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleStop}>
                  Stop
                </Button>
                <Button size="sm" onClick={handleSpeak}>
                  <Volume2 className="h-4 w-4 mr-2" />
                  Speak
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}