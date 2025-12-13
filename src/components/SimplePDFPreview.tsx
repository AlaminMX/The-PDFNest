import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Download, ExternalLink, X } from "lucide-react";
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
  thumbnailUrl
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
      // Fallback to direct link
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">PDF Preview</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-6 py-4">
          {/* Thumbnail or Icon */}
          <div className="relative w-32 h-44 rounded-lg overflow-hidden bg-muted border border-border shadow-md">
            {thumbnailUrl ? (
              <img 
                src={thumbnailUrl} 
                alt={fileName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10">
                <FileText className="w-16 h-16 text-primary" />
              </div>
            )}
          </div>

          {/* File Info */}
          <div className="text-center space-y-1">
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
          <div className="flex flex-col w-full gap-3">
            <Button 
              onClick={handleReadPDF}
              className="w-full gap-2"
              size="lg"
            >
              <ExternalLink className="w-4 h-4" />
              Read PDF
            </Button>
            <Button 
              onClick={handleDownload}
              variant="outline"
              className="w-full gap-2"
              size="lg"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
