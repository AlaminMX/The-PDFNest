import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Copy } from "lucide-react";
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
  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [note, setNote] = useState("");

  const loadTranslation = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-pdf', {
        body: { fileId, targetLanguage }
      });

      if (error) throw error;
      setOriginalText(data.originalText);
      setTranslatedText(data.translatedText);
      setNote(data.note || "");
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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>AI Translator</DialogTitle>
          <DialogDescription>{fileName}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4">
          <Select value={targetLanguage} onValueChange={setTargetLanguage}>
            <SelectTrigger className="w-[200px]">
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
          <Button onClick={handleTranslate} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Translate
          </Button>
        </div>

        {note && (
          <p className="text-sm text-muted-foreground">{note}</p>
        )}

        {(originalText || translatedText) && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Original</h3>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(originalText)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <ScrollArea className="h-[400px] border rounded-md p-3">
                <pre className="text-xs whitespace-pre-wrap font-sans">{originalText}</pre>
              </ScrollArea>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">{targetLanguage}</h3>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(translatedText)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <ScrollArea className="h-[400px] border rounded-md p-3">
                <pre className="text-xs whitespace-pre-wrap font-sans">{translatedText}</pre>
              </ScrollArea>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}