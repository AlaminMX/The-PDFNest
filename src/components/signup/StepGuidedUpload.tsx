import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, CheckCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Props {
  onFinish: () => void;
  onBack: () => void;
  signupComplete: boolean;
}

export function StepGuidedUpload({ onFinish, onBack, signupComplete }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.includes("pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File must be less than 50MB");
      return;
    }

    setUploading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) throw new Error("Not authenticated");

      const userId = authData.user.id;
      const storagePath = `${userId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("pdfs")
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("pdf_files").insert({
        user_id: userId,
        name: file.name.replace(/\.pdf$/i, ""),
        file_name: file.name,
        file_size: file.size,
        storage_path: storagePath,
      });

      if (dbError) throw dbError;

      await supabase.rpc("update_user_storage", {
        p_user_id: userId,
        p_size_delta: file.size,
      });

      setUploaded(true);
      toast.success("PDF uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  if (uploaded) {
    return (
      <div className="text-center space-y-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <CheckCircle className="w-20 h-20 text-primary mx-auto" />
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">You're all set! 🎉</h2>
          <p className="text-muted-foreground">
            Your first PDF has been uploaded. Start exploring PDFNest!
          </p>
        </div>
        <Button className="w-full h-11" onClick={onFinish}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Sparkles className="w-12 h-12 text-primary mx-auto" />
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">Welcome to PDFNest!</h2>
        <p className="text-muted-foreground">Upload your first PDF to get started</p>
      </div>

      <div className="bg-card/50 rounded-xl p-4 text-sm text-muted-foreground space-y-2 border border-border/50">
        <p>✓ Store and organize your PDFs securely</p>
        <p>✓ Access AFIT department resources</p>
        <p>✓ AI-powered summaries and study guides</p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/40"
        }`}
        onClick={() => document.getElementById("onboarding-upload")?.click()}
      >
        <Upload className={`w-10 h-10 mx-auto mb-3 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
        <p className="text-sm font-medium text-foreground">
          {uploading ? "Uploading..." : "Drop a PDF here or tap to browse"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">Max 50MB</p>
        <input
          id="onboarding-upload"
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleInputChange}
          disabled={uploading}
        />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} size="icon" className="shrink-0 h-11 w-11">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Button variant="outline" className="flex-1 h-11" onClick={onFinish}>
          Skip & go to dashboard
        </Button>
      </div>
    </div>
  );
}
