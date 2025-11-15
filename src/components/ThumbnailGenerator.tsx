import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { RefreshCw, X } from "lucide-react";
import { generatePDFThumbnail } from "@/lib/pdfThumbnail";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ThumbnailGeneratorProps {
  onComplete?: () => void;
}

export function ThumbnailGenerator({ onComplete }: ThumbnailGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<string>("");
  const [totalFiles, setTotalFiles] = useState(0);
  const [processedFiles, setProcessedFiles] = useState(0);

  const generateThumbnails = async () => {
    setIsGenerating(true);
    setProgress(0);
    setProcessedFiles(0);

    try {
      // Get list of PDFs without thumbnails
      const { data, error } = await supabase.functions.invoke('get-pdfs-without-thumbnails');

      if (error) throw error;

      const pdfsWithoutThumbnails = data.pdfs || [];
      setTotalFiles(pdfsWithoutThumbnails.length);

      if (pdfsWithoutThumbnails.length === 0) {
        toast.info("All PDFs already have thumbnails!");
        setIsOpen(false);
        setIsGenerating(false);
        return;
      }

      // Process each PDF
      for (let i = 0; i < pdfsWithoutThumbnails.length; i++) {
        const pdf = pdfsWithoutThumbnails[i];
        setCurrentFile(pdf.file_name);

        try {
          // Download the PDF file
          const { data: pdfData, error: downloadError } = await supabase.storage
            .from('pdfs')
            .download(pdf.storage_path);

          if (downloadError) {
            console.error(`Failed to download ${pdf.file_name}:`, downloadError);
            continue;
          }

          // Convert blob to File object
          const file = new File([pdfData], pdf.file_name, { type: 'application/pdf' });

          // Generate thumbnail
          const thumbnailBlob = await generatePDFThumbnail(file);
          
          // Get user ID from auth
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          // Upload thumbnail
          const thumbnailFileName = `${Date.now()}-thumb-${pdf.file_name.replace('.pdf', '.jpg')}`;
          const thumbnailPath = `${user.id}/${thumbnailFileName}`;

          const { error: uploadError } = await supabase.storage
            .from('pdf-thumbnails')
            .upload(thumbnailPath, thumbnailBlob, {
              contentType: 'image/jpeg',
            });

          if (uploadError) {
            console.error(`Failed to upload thumbnail for ${pdf.file_name}:`, uploadError);
            continue;
          }

          // Update database record
          const { error: updateError } = await supabase
            .from('pdf_files')
            .update({ thumbnail_url: thumbnailPath })
            .eq('id', pdf.id);

          if (updateError) {
            console.error(`Failed to update database for ${pdf.file_name}:`, updateError);
          }

          setProcessedFiles(i + 1);
          setProgress(((i + 1) / pdfsWithoutThumbnails.length) * 100);
        } catch (error) {
          console.error(`Error processing ${pdf.file_name}:`, error);
        }
      }

      toast.success(`Generated ${processedFiles} thumbnails successfully!`);
      if (onComplete) onComplete();
      setIsOpen(false);
    } catch (error: any) {
      toast.error("Failed to generate thumbnails");
      console.error("Error generating thumbnails:", error);
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setProcessedFiles(0);
      setCurrentFile("");
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Generate Thumbnails
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Missing Thumbnails</DialogTitle>
            <DialogDescription>
              This will generate thumbnails for all PDFs that don't have them yet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isGenerating ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Processing: {currentFile}</span>
                    <span className="text-muted-foreground">
                      {processedFiles} / {totalFiles}
                    </span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Please keep this window open while thumbnails are being generated...
                </p>
              </>
            ) : (
              <p className="text-sm">
                Click the button below to start generating thumbnails for your PDFs.
                This may take a few moments depending on the number of files.
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            {!isGenerating && (
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
            )}
            <Button
              onClick={generateThumbnails}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Start Generation
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
