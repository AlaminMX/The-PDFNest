import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, FileText } from "lucide-react";
import { AIModalType } from "@/pages/Index";

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
  summary: "Summarize PDF",
  "study-guide": "Generate Study Guide",
  voice: "Voice Reader",
  translate: "Translate PDF",
  chat: "Chat with PDF",
};

export function FilePicker({ open, onOpenChange, files, onSelectFile, featureType }: FilePickerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const featureName = featureType ? featureNames[featureType] : "AI Feature";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select PDF for {featureName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search PDFs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {files.length === 0 ? "No PDFs uploaded yet" : "No matching PDFs found"}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {filteredFiles.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => onSelectFile(file.id, file.name)}
                    className="w-full p-4 rounded-lg border hover:bg-accent transition-colors text-left flex items-start gap-4"
                  >
                    {file.thumbnailUrl ? (
                      <img
                        src={file.thumbnailUrl}
                        alt={file.name}
                        className="w-12 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
                        <FileText className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
