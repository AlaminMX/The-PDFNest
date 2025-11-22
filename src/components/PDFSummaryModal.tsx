import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Copy, Download, Loader2, Sparkles, FileText } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PDFSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  fileName: string;
}

export function PDFSummaryModal({ open, onOpenChange, fileId, fileName }: PDFSummaryModalProps) {
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && fileId) {
      loadSummary();
    }
  }, [open, fileId]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('summarize-pdf', {
        body: { fileId }
      });

      if (error) throw error;
      setSummary(data.summary);
    } catch (error: any) {
      console.error("Error loading summary:", error);
      toast.error(error.message || "Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    toast.success("Summary copied to clipboard");
  };

  const handleDownload = () => {
    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}-summary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Summary downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">AI Summary</DialogTitle>
                <DialogDescription className="text-xs mt-1">{fileName}</DialogDescription>
              </div>
            </div>
            {loading && (
              <Badge variant="secondary" className="gap-1.5">
                <Sparkles className="h-3 w-3 animate-pulse" />
                Processing
              </Badge>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <Loader2 className="h-14 w-14 animate-spin text-primary" />
              <Sparkles className="h-6 w-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Analyzing PDF content with AI...</p>
              <p className="text-xs text-muted-foreground">This may take a few moments</p>
            </div>
          </div>
        ) : summary ? (
          <div className="flex flex-col h-full">
            <ScrollArea className="flex-1 px-6 py-4" style={{ maxHeight: "calc(85vh - 180px)" }}>
              <Card className="p-6 bg-muted/30 border-muted">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap font-sans leading-relaxed text-foreground">
                    {summary}
                  </div>
                </div>
              </Card>
            </ScrollArea>

            <div className="px-6 py-4 border-t bg-muted/20 flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                <Copy className="h-4 w-4" />
                Copy to Clipboard
              </Button>
              <Button variant="default" size="sm" onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                Download as TXT
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}