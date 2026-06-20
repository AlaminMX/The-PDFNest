import { useEffect, useMemo, useRef, useState } from "react";
import { Edit3, ImagePlus, Loader2, RotateCcw, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { verifyTileUploadBucketConfig } from "@/lib/tileUploadStorage";
import { ALLOWED_IMAGE_MIME_TYPES, normalizeImageMime, uploadTileImage } from "@/lib/uploadImage";

interface Props {
  /** Logical category, used as a folder prefix: tile-assets/<kind>/... */
  kind: "faculty" | "department";
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  label?: string;
  helpText?: string;
}

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const EDITED_IMAGE_WIDTH = 1200;
const EDITED_IMAGE_HEIGHT = 800;
const IMAGE_EXTENSION_TO_MIME: Record<string, (typeof ALLOWED_IMAGE_MIME_TYPES)[number]> = {
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};
const IMAGE_ACCEPT = `${ALLOWED_IMAGE_MIME_TYPES.join(",")},.jpeg,.jpg,.png,.webp`;

type PendingImage = {
  name: string;
  type: string;
  source: string;
  objectUrl?: string;
};

const loadImage = (source: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This image format could not be loaded for editing in your browser."));
    image.src = source;
  });

export function TileImageUpload({
  kind,
  value,
  onChange,
  label = "Background image",
  helpText = "Upload any image format supported by your browser, edit the crop, then use it as the tile background. Leave empty to show the icon instead.",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [zoom, setZoom] = useState(100);
  const [positionX, setPositionX] = useState(50);
  const [positionY, setPositionY] = useState(50);

  const previewStyle = useMemo(
    () => ({
      backgroundImage: pendingImage ? `url(${pendingImage.source})` : undefined,
      backgroundPosition: `${positionX}% ${positionY}%`,
      backgroundSize: `${zoom}%`,
    }),
    [pendingImage, positionX, positionY, zoom],
  );

  useEffect(() => {
    verifyTileUploadBucketConfig().catch((error) => {
      console.error("Tile upload storage startup verification failed", error);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (pendingImage?.objectUrl) URL.revokeObjectURL(pendingImage.objectUrl);
    };
  }, [pendingImage]);

  const resetEditor = () => {
    setZoom(100);
    setPositionX(50);
    setPositionY(50);
  };

  const openEditor = (image: PendingImage) => {
    if (pendingImage?.objectUrl) URL.revokeObjectURL(pendingImage.objectUrl);
    setPendingImage(image);
    resetEditor();
    setEditorOpen(true);
  };

  const getSupportedImageType = (file: File) => {
    const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
    return normalizeImageMime(file.type) || IMAGE_EXTENSION_TO_MIME[extension] || null;
  };

  const handleFile = (file: File) => {
    const supportedType = getSupportedImageType(file);
    if (!supportedType) {
      toast.error("Please choose a JPG, JPEG, PNG, or WebP image");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image too large (max 4MB)");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    openEditor({
      name: file.name,
      type: supportedType,
      source: objectUrl,
      objectUrl,
    });
  };

  const uploadEditedImage = async () => {
    if (!pendingImage) return;

    setUploading(true);
    try {
      const image = await loadImage(pendingImage.source);
      const canvas = document.createElement("canvas");
      canvas.width = EDITED_IMAGE_WIDTH;
      canvas.height = EDITED_IMAGE_HEIGHT;

      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image editor is unavailable in this browser.");

      const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight) * (zoom / 100);
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      const extraX = Math.max(0, drawWidth - canvas.width);
      const extraY = Math.max(0, drawHeight - canvas.height);
      const drawX = -extraX * (positionX / 100);
      const drawY = -extraY * (positionY / 100);

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

      const outputType = normalizeImageMime(pendingImage.type) ?? "image/jpeg";
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, 0.92));
      if (!blob) throw new Error("Could not prepare image for upload.");

      await verifyTileUploadBucketConfig();

      const { publicUrl } = await uploadTileImage({ kind, blob, mime: outputType });
      onChange(publicUrl);
      setEditorOpen(false);
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const editCurrentImage = () => {
    if (!value) return;
    openEditor({
      name: "current-background.jpg",
      type: "image/jpeg",
      source: value,
    });
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">{helpText}</p>

      <div className="flex items-center gap-3">
        <div
          className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/30 bg-cover bg-center"
          style={value ? { backgroundImage: `url(${value})` } : undefined}
        >
          {!value && (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No image
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="gap-2"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {value ? "Replace" : "Upload"}
          </Button>
          {value && (
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={editCurrentImage} className="gap-2">
              <Edit3 className="h-4 w-4" />
              Edit
            </Button>
          )}
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit background image</DialogTitle>
            <DialogDescription>
              Adjust the crop before uploading. You can also edit the current uploaded image and save a new version.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="aspect-[3/2] overflow-hidden rounded-xl border bg-muted bg-no-repeat" style={previewStyle} />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Zoom</Label>
                <Slider value={[zoom]} min={100} max={300} step={1} onValueChange={([next]) => setZoom(next)} />
              </div>
              <div className="space-y-2">
                <Label>Horizontal position</Label>
                <Slider value={[positionX]} min={0} max={100} step={1} onValueChange={([next]) => setPositionX(next)} />
              </div>
              <div className="space-y-2">
                <Label>Vertical position</Label>
                <Slider value={[positionY]} min={0} max={100} step={1} onValueChange={([next]) => setPositionY(next)} />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" onClick={resetEditor} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={uploading || !pendingImage} onClick={uploadEditedImage} className="gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Save image
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
