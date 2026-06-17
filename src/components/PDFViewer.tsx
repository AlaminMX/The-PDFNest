import { useState, useEffect, useRef, useCallback } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  X, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut,
  ExternalLink,
  Loader2,
  RotateCw,
  Maximize,
  Minimize,
  PanelTop,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import * as pdfjs from "pdfjs-dist";
import { getCachedPDF } from "@/lib/offlineStorage";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  fileName: string;
  fileSize?: number;
  fileId?: string;
  onDelete?: () => void;
  canDelete?: boolean;
  isDeleting?: boolean;
}

export function PDFViewer({ isOpen, onClose, pdfUrl, fileName, fileSize, fileId, onDelete, canDelete, isDeleting }: PDFViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialRenderDone, setInitialRenderDone] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<pdfjs.RenderTask | null>(null);

  // Load PDF document - check offline cache first, then network with range requests
  useEffect(() => {
    if (!isOpen || (!pdfUrl && !fileId)) return;

    let cancelled = false;
    
    const loadPDF = async () => {
      setLoading(true);
      setError(null);
      setLoadingProgress(0);
      setCurrentPage(1);
      setPdfDoc(null);
      setInitialRenderDone(false);

      try {
        // Try offline cache first
        let source: any;
        if (fileId) {
          const cachedBlob = await getCachedPDF(fileId);
          if (cachedBlob) {
            const arrayBuffer = await cachedBlob.arrayBuffer();
            source = { data: new Uint8Array(arrayBuffer) };
          }
        }

        if (!source) {
          if (!pdfUrl) {
            setError("This PDF is not available offline. Save it for offline access while connected.");
            setLoading(false);
            return;
          }
          source = {
            url: pdfUrl,
            rangeChunkSize: 32768,
            disableAutoFetch: true,
            disableStream: false,
          };
        }

        const loadingTask = pdfjs.getDocument(source);

        loadingTask.onProgress = (progress) => {
          if (progress.total > 0) {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setLoadingProgress(percent);
          }
        };

        const pdf = await loadingTask.promise;
        
        if (cancelled) {
          pdf.destroy();
          return;
        }

        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error("Error loading PDF:", err);
        setError("Failed to load PDF. The file may be corrupted or unavailable.");
        setLoading(false);
      }
    };

    loadPDF();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [isOpen, pdfUrl, fileId]);

  // Render current page - use 1x DPI on first render for speed, then re-render at full quality
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return;

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    setRendering(true);

    try {
      const page = await pdfDoc.getPage(pageNum);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const containerWidth = containerRef.current.clientWidth - 32;
      const viewport = page.getViewport({ scale: 1 });
      const fitScale = containerWidth / viewport.width;
      const adjustedScale = fitScale * scale;
      
      const scaledViewport = page.getViewport({ scale: adjustedScale });

      // Use 1x on first render for speed, full DPI after
      const outputScale = initialRenderDone ? (window.devicePixelRatio || 1) : 1;
      canvas.width = Math.floor(scaledViewport.width * outputScale);
      canvas.height = Math.floor(scaledViewport.height * outputScale);
      canvas.style.width = `${Math.floor(scaledViewport.width)}px`;
      canvas.style.height = `${Math.floor(scaledViewport.height)}px`;

      const transform = outputScale !== 1 
        ? [outputScale, 0, 0, outputScale, 0, 0] 
        : undefined;

      const renderContext = {
        canvasContext: ctx,
        viewport: scaledViewport,
        transform,
      };

      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;
      renderTaskRef.current = null;
      setRendering(false);

      // After first render at 1x, schedule a full-quality re-render
      if (!initialRenderDone) {
        setInitialRenderDone(true);
      }
    } catch (err: any) {
      if (err?.name !== "RenderingCancelledException") {
        console.error("Error rendering page:", err);
        setRendering(false);
      }
    }
  }, [pdfDoc, scale, initialRenderDone]);

  // Preload adjacent pages
  const preloadPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || pageNum < 1 || pageNum > totalPages) return;
    try {
      await pdfDoc.getPage(pageNum);
    } catch {
      // ignore preload errors
    }
  }, [pdfDoc, totalPages]);

  // Render when page or scale changes, and preload adjacent
  useEffect(() => {
    if (pdfDoc && currentPage > 0) {
      renderPage(currentPage);
      preloadPage(currentPage + 1);
      preloadPage(currentPage - 1);
    }
  }, [pdfDoc, currentPage, scale, renderPage, preloadPage]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen && pdfDoc) {
      pdfDoc.destroy();
      setPdfDoc(null);
    }
  }, [isOpen, pdfDoc]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const handleFitToWidth = () => setScale(1);
  const handleFitToPage = () => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvasHeight = Number.parseFloat(canvasRef.current.style.height || "0");
    const availableHeight = Math.max(containerRef.current.clientHeight - 32, 1);
    if (canvasHeight > 0) {
      setScale((prev) => Math.max(0.5, Math.min(3, prev * (availableHeight / canvasHeight))));
    }
  };
  const handleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await sheetRef.current?.requestFullscreen();
      }
    } catch {
      toast.error("Fullscreen is not supported on this device");
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch (err) {
      toast.error("Download failed");
    }
  };

  const handleOpenExternal = () => window.open(pdfUrl, "_blank");

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setPdfDoc(null);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        ref={sheetRef}
        side="bottom" 
        className="h-[95vh] rounded-t-3xl p-0 flex flex-col fullscreen:h-screen fullscreen:rounded-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{fileName}</p>
              {fileSize && (
                <p className="text-xs text-muted-foreground">
                  {(fileSize / (1024 * 1024)).toFixed(1)} MB
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleFitToWidth} title="Fit to width">
              <PanelTop className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleFullscreen} title="Fullscreen">
              {document.fullscreenElement ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleOpenExternal} title="Open in new tab">
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleDownload} title="Download">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div ref={containerRef} className="flex-1 overflow-auto bg-muted/30 flex flex-col items-center py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-4 px-4 w-full max-w-md">
              {/* Skeleton placeholder */}
              <div className="w-full max-w-sm aspect-[3/4] bg-muted rounded-lg animate-pulse" />
              <div className="w-full space-y-2">
                <Progress value={loadingProgress} className="h-2" />
                <p className="text-sm text-center text-muted-foreground">
                  Loading PDF... {loadingProgress}%
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-4 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <X className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <p className="font-medium mb-1">Failed to load PDF</p>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRetry}>
                  <RotateCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                <Button variant="secondary" onClick={handleOpenExternal}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Browser
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative">
              {rendering && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              <canvas ref={canvasRef} className="shadow-lg rounded-lg max-w-full" />
            </div>
          )}
        </div>

        {/* Footer Controls */}
        {!loading && !error && (
          <div className="border-t border-border/50 px-4 py-3 bg-background">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={handlePrevPage} disabled={currentPage <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[80px] text-center">
                  {currentPage} / {totalPages}
                </span>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleNextPage} disabled={currentPage >= totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-9 px-2 text-xs" onClick={handleFitToPage}>
                  Fit page
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleZoomOut} disabled={scale <= 0.5}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs font-medium min-w-[45px] text-center text-muted-foreground">
                  {Math.round(scale * 100)}%
                </span>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleZoomIn} disabled={scale >= 3}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
