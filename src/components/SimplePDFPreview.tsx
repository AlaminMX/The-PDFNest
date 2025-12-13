import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Download, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface SimplePDFPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  fileName: string;
  fileSize?: number;
  createdAt?: string;
  thumbnailUrl?: string | null;
}

export function SimplePDFPreview({ 
  isOpen, 
  onClose, 
  pdfUrl, 
  fileName,
  fileSize,
  createdAt,
}: SimplePDFPreviewProps) {
  
  const handleReadPDF = () => {
    window.open(pdfUrl, '_blank');
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileName;
      link.click();
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="sr-only">PDF Preview</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-6 py-4">
          {/* PDF Icon Placeholder */}
          <div className="relative w-36 h-48 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/20 shadow-lg">
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
              <FileText className="w-16 h-16 text-primary mb-3" />
              <div className="w-full space-y-1.5">
                <div className="h-2 bg-primary/25 rounded-full w-full"></div>
                <div className="h-2 bg-primary/20 rounded-full w-4/5"></div>
                <div className="h-2 bg-primary/15 rounded-full w-3/5"></div>
                <div className="h-2 bg-primary/10 rounded-full w-4/5"></div>
              </div>
            </div>
          </div>

          {/* File Info */}
          <div className="text-center space-y-1 px-4">
            <h3 className="font-semibold text-lg leading-tight line-clamp-2">
              {fileName}
            </h3>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>{formatFileSize(fileSize)}</span>
              {createdAt && (
                <>
                  <span>•</span>
                  <span>{format(new Date(createdAt), 'MMM d, yyyy')}</span>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col w-full gap-3 px-2">
            <Button 
              onClick={handleReadPDF}
              className="w-full gap-2 h-12 rounded-xl text-base"
              size="lg"
            >
              <ExternalLink className="w-5 h-5" />
              Open PDF
            </Button>
            <Button 
              onClick={handleDownload}
              variant="outline"
              className="w-full gap-2 h-12 rounded-xl text-base"
              size="lg"
            >
              <Download className="w-5 h-5" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
