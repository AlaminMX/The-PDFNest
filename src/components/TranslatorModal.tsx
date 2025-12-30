import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Copy, Download, Sparkles, Languages, ArrowRight, FileDown } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AIContentRenderer } from "@/components/AIContentRenderer";
import { exportAndUpload } from "@/lib/exportPDF";
import { useAuth } from "@/hooks/useAuth";

interface TranslatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  fileName: string;
}

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese", "Dutch",
  "Chinese (Simplified)", "Chinese (Traditional)", "Japanese", "Korean",
  "Arabic", "Russian", "Hindi", "Turkish", "Polish", "Swedish",
  "Norwegian", "Danish", "Finnish", "Greek"
];

export function TranslatorModal({ open, onOpenChange, fileId, fileName }: TranslatorModalProps) {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("Spanish");
  const [startPage, setStartPage] = useState("1");
  const [endPage, setEndPage] = useState("10");
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [note, setNote] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    if (open && fileId) {
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

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleDownload = () => {
    const content = `=== ORIGINAL TEXT (Pages ${startPage}-${endPage}) ===\n\n${originalText}\n\n=== TRANSLATED TO ${targetLanguage.toUpperCase()} ===\n\n${translatedText}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}-translation-${targetLanguage.toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Translation downloaded");
  };

  const handleExportPDF = async () => {
    if (!user?.id) {
      toast.error("Please sign in to export");
      return;
    }
    
    setExporting(true);
    
    const sections = [
      { section: `Original Text (Pages ${startPage}-${endPage})`, content: originalText },
      { section: `Translated to ${targetLanguage}`, content: translatedText }
    ];
    
    await exportAndUpload({
      title: `Translation to ${targetLanguage}`,
      subtitle: `Pages ${startPage}-${endPage} from "${fileName}"`,
      content: sections,
      type: 'translation',
      sourceFileName: fileName
    }, user.id);
    
    setExporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Languages className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">AI Translator</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                  {fileName}
                </DialogDescription>
              </div>
            </div>
            {loading && (
              <Badge variant="secondary" className="gap-1.5 bg-primary/10 text-primary border-0">
                <Sparkles className="h-3 w-3 animate-pulse" />
                Translating
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="px-6 py-4 bg-muted/10 border-b border-border/50 flex-shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="language" className="text-xs">Target Language</Label>
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger id="language" className="h-9">
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

            <div className="space-y-1.5">
              <Label htmlFor="startPage" className="text-xs">Start Page</Label>
              <Input
                id="startPage"
                type="number"
                min="1"
                value={startPage}
                onChange={(e) => setStartPage(e.target.value)}
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
                className="h-9"
              />
            </div>

            <div className="flex items-end">
              <Button onClick={loadTranslation} disabled={loading} className="w-full h-9 gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Translating...
                  </>
                ) : (
                  <>
                    <Languages className="h-4 w-4" />
                    Translate
                  </>
                )}
              </Button>
            </div>
          </div>
          {totalPages && (
            <p className="text-xs text-muted-foreground mt-2">
              PDF has {totalPages} pages total
            </p>
          )}
          {note && !loading && (
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded mt-2">{note}</p>
          )}
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
              <p className="text-sm font-medium">Translating to {targetLanguage}...</p>
              <p className="text-xs text-muted-foreground">Processing pages {startPage}-{endPage}</p>
            </div>
          </div>
        ) : (originalText || translatedText) ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 px-6 py-4" style={{ maxHeight: "calc(85vh - 280px)" }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 bg-muted/20 border-border/30">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline" className="text-xs">Original</Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleCopy(originalText, "Original text")}
                      className="h-7 px-2"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <ScrollArea className="h-[280px]">
                    <AIContentRenderer content={originalText} className="text-muted-foreground" />
                  </ScrollArea>
                </Card>

                <Card className="p-4 bg-primary/5 border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="text-xs bg-primary/10 text-primary border-0">
                      <ArrowRight className="h-3 w-3 mr-1" />
                      {targetLanguage}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleCopy(translatedText, "Translated text")}
                      className="h-7 px-2"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <ScrollArea className="h-[280px]">
                    <AIContentRenderer content={translatedText} />
                  </ScrollArea>
                </Card>
              </div>
            </ScrollArea>

            <div className="px-6 py-4 border-t border-border/50 bg-muted/10 flex justify-end gap-2 flex-shrink-0 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2 h-9">
                <Download className="h-3.5 w-3.5" />
                Text
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleExportPDF}
                disabled={exporting}
                className="gap-2 h-9"
              >
                {exporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileDown className="h-3.5 w-3.5" />
                )}
                Export PDF
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
