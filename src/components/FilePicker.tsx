import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, FileText, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
type AIModalType = "summary" | "study-guide" | "voice" | "translate" | "chat";

interface PDFFile {
  id: string;
  name: string;
  signedUrl?: string;
  thumbnailUrl?: string;
  file_size: number;
  created_at: string;
}

interface FilePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: PDFFile[];
  onSelectFile: (fileId: string, fileName: string) => void;
  featureType: AIModalType;
}

const featureNames = {
  summary: "Summarize",
  "study-guide": "Study Guide",
  voice: "Voice Reader",
  translate: "Translate",
  chat: "Chat with PDF",
};

const featureDescriptions = {
  summary: "Get a concise summary of your document",
  "study-guide": "Generate comprehensive study materials",
  voice: "Listen to your PDF with text-to-speech",
  translate: "Translate your document to another language",
  chat: "Ask questions about your document",
};

export function FilePicker({ open, onOpenChange, files, onSelectFile, featureType }: FilePickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const featureName = featureType ? featureNames[featureType] : "AI Feature";
  const featureDescription = featureType ? featureDescriptions[featureType] : "";

  const handleSelect = (file: PDFFile) => {
    setSelectedId(file.id);
    // Small delay for visual feedback
    setTimeout(() => {
      onSelectFile(file.id, file.name);
      setSelectedId(null);
      setSearchQuery("");
    }, 200);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-0">
        <SheetHeader className="px-6 pb-4 border-b">
          <SheetTitle className="text-left">
            <span className="text-2xl font-bold">Select PDF</span>
            <p className="text-sm font-normal text-muted-foreground mt-1">
              Choose a file to {featureName.toLowerCase()}
            </p>
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full">
          {/* Search */}
          <div className="px-6 py-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search your PDFs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 rounded-xl bg-muted/50 border-0 text-base"
              />
            </div>
          </div>

          {/* File List */}
          {filteredFiles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <FileText className="w-10 h-10 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-foreground mb-1">
                {files.length === 0 ? "No PDFs yet" : "No results"}
              </p>
              <p className="text-sm text-muted-foreground text-center">
                {files.length === 0 
                  ? "Upload a PDF to get started with AI features" 
                  : "Try a different search term"}
              </p>
            </div>
          ) : (
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-2 pb-6">
                <AnimatePresence>
                  {filteredFiles.map((file, index) => (
                    <motion.button
                      key={file.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => handleSelect(file)}
                      className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center gap-4 ${
                        selectedId === file.id 
                          ? "bg-primary/10 border-primary" 
                          : "bg-card hover:bg-accent border-border"
                      }`}
                    >
                      {/* PDF Icon Placeholder */}
                      <div className={`w-14 h-18 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        selectedId === file.id 
                          ? "bg-primary/20" 
                          : "bg-gradient-to-br from-primary/20 to-primary/5"
                      }`}>
                        <div className="flex flex-col items-center">
                          <FileText className={`w-7 h-7 ${selectedId === file.id ? "text-primary" : "text-primary/70"}`} />
                          <div className="mt-1 space-y-0.5 w-8">
                            <div className="h-0.5 bg-primary/30 rounded-full"></div>
                            <div className="h-0.5 bg-primary/20 rounded-full w-3/4"></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base truncate">{file.name}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {(file.file_size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>

                      {/* Selection indicator */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                        selectedId === file.id 
                          ? "bg-primary text-primary-foreground scale-100" 
                          : "bg-muted scale-90 opacity-0"
                      }`}>
                        <Check className="w-4 h-4" />
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
