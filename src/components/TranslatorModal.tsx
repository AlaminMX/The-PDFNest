import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Copy, Download, Sparkles, Languages } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TranslatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  fileName: string;
}

const LANGUAGES = [
  "Spanish", "French", "German", "Italian", "Portuguese", "Dutch",
  "Chinese (Simplified)", "Chinese (Traditional)", "Japanese", "Korean",
  "Arabic", "Russian", "Hindi", "Turkish", "Polish", "Swedish",
  "Norwegian", "Danish", "Finnish", "Greek"
];

export function TranslatorModal({ open, onOpenChange, fileId, fileName }: TranslatorModalProps) {
  const [loading, setLoading] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("Spanish");
  const [startPage, setStartPage] = useState("1");
  const [endPage, setEndPage] = useState("10");
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open && fileId) {
      // Reset state when modal opens
      setOriginalText("");
      setTranslatedText("");
      setNote("");
      setStartPage("1");
      setEndPage("10");
    }
  }, [open, fileId]);

  const loadTranslation = async () => {
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
        toast.error("Maximum 50 pages can be translated at once");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('translate-pdf', {
        body: { 
          fileId, 
          targetLanguage,
          startPage: start,
          endPage: end
        }
      });

      if (error) throw error;
      setOriginalText(data.originalText);
      setTranslatedText(data.translatedText);
      setNote(data.note || "");
      setTotalPages(data.totalPages);
    } catch (error: any) {
      console.error("Error translating:", error);
      toast.error(error.message || "Failed to translate");
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = () => {
    loadTranslation();
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleDownload = () => {
    const content = `=== ORIGINAL TEXT ===\n\n${originalText}\n\n\n=== TRANSLATED TO ${targetLanguage.toUpperCase()} ===\n\n${translatedText}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}-translation-${targetLanguage}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Translation downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Languages className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">AI Translator</DialogTitle>
                <DialogDescription className="text-xs mt-1">{fileName}</DialogDescription>
              </div>
            </div>
            {loading && (
              <Badge variant="secondary" className="gap-1.5">
                <Sparkles className="h-3 w-3 animate-pulse" />
                Translating
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="px-6 py-4 bg-muted/20 border-b space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Target Language</Label>
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
            <Button onClick={handleTranslate} disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Translating pages {startPage}-{endPage}...
                </>
              ) : (
                <>
                  <Languages className="h-4 w-4" />
                  Translate Pages {startPage}-{endPage}
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
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <Loader2 className="h-14 w-14 animate-spin text-primary" />
              <Sparkles className="h-6 w-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Translating to {targetLanguage}...</p>
              <p className="text-xs text-muted-foreground">Processing pages {startPage}-{endPage}</p>
            </div>
          </div>
        )}

        {(originalText || translatedText) && !loading && (
          <ScrollArea className="flex-1 px-6">
            <div className="pb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Original Text</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleCopy(originalText, "Original text")}
                      className="h-8"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Card className="bg-muted/30 border-muted">
                    <ScrollArea className="h-[400px] p-4">
                      <div className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                        {originalText}
                      </div>
                    </ScrollArea>
                  </Card>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">{targetLanguage} Translation</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleCopy(translatedText, "Translation")}
                      className="h-8"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Card className="bg-muted/30 border-muted">
                    <ScrollArea className="h-[400px] p-4">
                      <div className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                        {translatedText}
                      </div>
                    </ScrollArea>
                  </Card>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="default" size="sm" onClick={handleDownload} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download Translation
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}