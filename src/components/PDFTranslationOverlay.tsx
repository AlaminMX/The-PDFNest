import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Languages, Download, FileText, Eye, EyeOff, ZoomIn, ZoomOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logActivity } from "@/lib/sessionLogger";

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  transform: number[];
}

interface PageData {
  pageNumber: number;
  width: number;
  height: number;
  textItems: TextItem[];
}

interface PDFTranslationOverlayProps {
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

export function PDFTranslationOverlay({ open, onOpenChange, fileId, fileName }: PDFTranslationOverlayProps) {
  const [loading, setLoading] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("Spanish");
  const [startPage, setStartPage] = useState("1");
  const [endPage, setEndPage] = useState("5");
  const [translatedPages, setTranslatedPages] = useState<PageData[]>([]);
  const [originalPages, setOriginalPages] = useState<PageData[]>([]);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [activeTab, setActiveTab] = useState("overlay");
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  useEffect(() => {
    if (open) {
      setTranslatedPages([]);
      setOriginalPages([]);
      setShowOriginal(false);
      setZoom(1);
    }
  }, [open, fileId]);

  const loadStructuredTranslation = async () => {
    setLoading(true);
    try {
      const start = parseInt(startPage) || 1;
      const end = parseInt(endPage) || 5;

      if (start < 1 || end < start || end - start > 20) {
        toast.error("Invalid page range. Maximum 20 pages for live translation.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('translate-pdf-structured', {
        body: { 
          fileId, 
          targetLanguage,
          startPage: start,
          endPage: end,
          mode: 'full'
        }
      });

      if (error) throw error;

      setTranslatedPages(data.pagesData || []);
      setOriginalPages(data.originalPagesData || []);
      setTotalPages(data.totalPages);

      await logActivity("ai_translate", { 
        fileName, 
        fileId, 
        targetLanguage, 
        startPage: start, 
        endPage: end 
      });

      toast.success(`Translated pages ${start}-${end} to ${targetLanguage}`);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to translate");
    } finally {
      setLoading(false);
    }
  };

  const renderPage = (page: PageData, index: number) => {
    const displayPages = showOriginal ? originalPages : translatedPages;
    const displayPage = displayPages[index];
    if (!displayPage) return null;

    const scaledWidth = displayPage.width * zoom;
    const scaledHeight = displayPage.height * zoom;

    return (
      <div 
        key={`page-${displayPage.pageNumber}`}
        className="relative bg-white shadow-lg mb-4 overflow-hidden"
        style={{ 
          width: scaledWidth, 
          height: scaledHeight,
          minWidth: scaledWidth,
        }}
      >
        {/* Text overlay */}
        <div className="absolute inset-0">
          {displayPage.textItems.map((item, idx) => (
            <span
              key={idx}
              className="absolute whitespace-pre text-black"
              style={{
                left: item.x * zoom,
                top: item.y * zoom,
                fontSize: item.height * zoom * 0.85,
                fontFamily: 'Arial, sans-serif',
                lineHeight: 1,
              }}
            >
              {item.str}
            </span>
          ))}
        </div>
        
        {/* Page number badge */}
        <Badge className="absolute bottom-2 right-2 text-xs">
          Page {displayPage.pageNumber}
        </Badge>
      </div>
    );
  };

  const handleExportText = () => {
    const pages = showOriginal ? originalPages : translatedPages;
    let content = `=== ${showOriginal ? 'ORIGINAL' : 'TRANSLATED TO ' + targetLanguage.toUpperCase()} ===\n\n`;
    
    pages.forEach(page => {
      content += `--- Page ${page.pageNumber} ---\n`;
      content += page.textItems.map(item => item.str).join(' ') + '\n\n';
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}-${showOriginal ? 'original' : targetLanguage.toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Text exported");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Languages className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Live PDF Translation</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate max-w-[300px]">
                  {fileName}
                </DialogDescription>
              </div>
            </div>
            {loading && (
              <Badge variant="secondary" className="gap-1.5 bg-primary/10 text-primary border-0">
                <Loader2 className="h-3 w-3 animate-spin" />
                Translating...
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Controls */}
        <div className="px-6 py-4 bg-muted/10 border-b flex-shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Target Language</Label>
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Start Page</Label>
              <Input
                type="number"
                min="1"
                value={startPage}
                onChange={(e) => setStartPage(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">End Page</Label>
              <Input
                type="number"
                min="1"
                value={endPage}
                onChange={(e) => setEndPage(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="flex items-end">
              <Button onClick={loadStructuredTranslation} disabled={loading} className="w-full h-9 gap-2">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Languages className="h-4 w-4" />
                )}
                Translate
              </Button>
            </div>

            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setZoom(z => Math.min(2, z + 0.25))}
                disabled={zoom >= 2}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {totalPages && (
            <p className="text-xs text-muted-foreground mt-2">
              PDF has {totalPages} pages total • Max 20 pages per translation
            </p>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 flex-1">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Translating to {targetLanguage}...</p>
              <p className="text-xs text-muted-foreground">Processing pages {startPage}-{endPage}</p>
            </div>
          </div>
        ) : translatedPages.length > 0 ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toggle and export controls */}
            <div className="px-6 py-3 border-b flex items-center justify-between bg-background">
              <div className="flex items-center gap-2">
                <Button
                  variant={showOriginal ? "outline" : "default"}
                  size="sm"
                  onClick={() => setShowOriginal(false)}
                  className="gap-2"
                >
                  <Languages className="h-3.5 w-3.5" />
                  Translated
                </Button>
                <Button
                  variant={showOriginal ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowOriginal(true)}
                  className="gap-2"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Original
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportText} className="gap-2">
                <Download className="h-3.5 w-3.5" />
                Export Text
              </Button>
            </div>

            {/* Pages view */}
            <ScrollArea className="flex-1 p-6">
              <div className="flex flex-col items-center gap-4">
                {translatedPages.map((page, idx) => renderPage(page, idx))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="text-center space-y-2">
              <Languages className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Select language and pages, then click Translate
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
