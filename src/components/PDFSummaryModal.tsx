import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Copy, Download, Loader2, Sparkles, FileText } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AIContentRenderer } from "@/components/AIContentRenderer";

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
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">AI Summary</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                  {fileName}
                </DialogDescription>
              </div>
            </div>
            {loading && (
              <Badge variant="secondary" className="gap-1.5 bg-primary/10 text-primary border-0">
                <Sparkles className="h-3 w-3 animate-pulse" />
                Processing
              </Badge>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <Sparkles className="h-5 w-5 absolute -top-1 -right-1 text-primary animate-pulse" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Analyzing PDF content...</p>
              <p className="text-xs text-muted-foreground">This may take a few moments</p>
            </div>
          </div>
        ) : summary ? (
          <div className="flex flex-col h-full">
            <ScrollArea className="flex-1 px-6 py-4" style={{ maxHeight: "calc(85vh - 180px)" }}>
              <Card className="p-5 bg-muted/20 border-border/30">
                <AIContentRenderer content={summary} />
              </Card>
            </ScrollArea>

            <div className="px-6 py-4 border-t border-border/50 bg-muted/10 flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2 h-9">
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
              <Button variant="default" size="sm" onClick={handleDownload} className="gap-2 h-9">
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