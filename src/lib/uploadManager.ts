import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/sessionLogger";

export type UploadStatus = "pending" | "uploading" | "success" | "failed";

export interface UploadItem {
  id: string;
  file: File;
  fileName: string;
  categoryId: string | null;
  status: UploadStatus;
  progress: number;
  error?: string;
}

type Listener = (items: UploadItem[]) => void;

const MAX_CONCURRENT = 2;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const STORAGE_LIMIT = 300 * 1024 * 1024; // 300MB

class UploadManager {
  private queue = new Map<string, UploadItem>();
  private listeners = new Set<Listener>();
  private activeCount = 0;
  private userId: string | null = null;
  private onComplete: (() => void) | null = null;

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  setOnComplete(cb: () => void) {
    this.onComplete = cb;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getItems());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const items = this.getItems();
    this.listeners.forEach((l) => l(items));
  }

  getItems(): UploadItem[] {
    return Array.from(this.queue.values());
  }

  async addFiles(files: File[], categoryId: string | null) {
    if (!this.userId) return;

    // Validate all files first
    const validFiles: File[] = [];
    for (const file of files) {
      if (file.type !== "application/pdf") {
        this.addError(file.name, "Only PDF files are allowed");
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        this.addError(file.name, "File size must be under 50MB");
        continue;
      }
      validFiles.push(file);
    }

    // Check total storage
    const { data: profileData } = await supabase
      .from("profiles")
      .select("total_storage_used")
      .eq("id", this.userId)
      .single();

    const currentUsage = profileData?.total_storage_used || 0;
    const totalNewSize = validFiles.reduce((sum, f) => sum + f.size, 0);

    if (currentUsage + totalNewSize > STORAGE_LIMIT) {
      const remainingMB = Math.max(
        0,
        (STORAGE_LIMIT - currentUsage) / (1024 * 1024)
      ).toFixed(1);
      // Still add files but check individually during upload
      if (currentUsage >= STORAGE_LIMIT) {
        validFiles.forEach((f) =>
          this.addError(f.name, `Storage limit reached. ${remainingMB}MB remaining.`)
        );
        return;
      }
    }

    // Add to queue
    for (const file of validFiles) {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      this.queue.set(id, {
        id,
        file,
        fileName: sanitizedName,
        categoryId,
        status: "pending",
        progress: 0,
      });
    }

    this.notify();
    this.processQueue();
  }

  private addError(fileName: string, error: string) {
    const id = `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.queue.set(id, {
      id,
      file: new File([], fileName),
      fileName,
      categoryId: null,
      status: "failed",
      progress: 0,
      error,
    });
    this.notify();
    // Auto-remove errors after 5s
    setTimeout(() => {
      this.queue.delete(id);
      this.notify();
    }, 5000);
  }

  retry(id: string) {
    const item = this.queue.get(id);
    if (item && item.status === "failed") {
      item.status = "pending";
      item.progress = 0;
      item.error = undefined;
      this.notify();
      this.processQueue();
    }
  }

  remove(id: string) {
    this.queue.delete(id);
    this.notify();
  }

  private async processQueue() {
    if (this.activeCount >= MAX_CONCURRENT) return;

    const pending = Array.from(this.queue.values()).find(
      (i) => i.status === "pending"
    );
    if (!pending || !this.userId) return;

    this.activeCount++;
    pending.status = "uploading";
    this.notify();

    try {
      await this.uploadSingle(pending);
      pending.status = "success";
      pending.progress = 100;
    } catch (err: any) {
      pending.status = "failed";
      pending.error = err.message || "Upload failed";
    }

    this.activeCount--;
    this.notify();

    // Auto-remove successful items
    if (pending.status === "success") {
      this.onComplete?.();
      setTimeout(() => {
        this.queue.delete(pending.id);
        this.notify();
      }, 3000);
    }

    // Process next
    this.processQueue();
  }

  private async uploadSingle(item: UploadItem) {
    if (!this.userId) throw new Error("Not authenticated");

    const fileName = `${Date.now()}-${item.fileName}`;
    const filePath = `${this.userId}/${fileName}`;

    // Simulate progress
    const progressTimer = setInterval(() => {
      if (item.status === "uploading" && item.progress < 85) {
        item.progress += Math.random() * 15 + 5;
        if (item.progress > 85) item.progress = 85;
        this.notify();
      }
    }, 300);

    try {
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("pdfs")
        .upload(filePath, item.file);

      clearInterval(progressTimer);

      if (uploadError) throw uploadError;

      item.progress = 92;
      this.notify();

      // Create database record
      const { error: dbError } = await supabase.from("pdf_files").insert({
        user_id: this.userId,
        name: item.file.name,
        file_name: fileName,
        file_size: item.file.size,
        storage_path: filePath,
        category_id:
          item.categoryId === "uncategorized" ? null : item.categoryId,
        thumbnail_url: null,
      });

      if (dbError) throw dbError;

      // Update storage usage
      await supabase.rpc("update_user_storage", {
        p_user_id: this.userId,
        p_size_delta: item.file.size,
      });

      await logActivity("upload_pdf", {
        fileName: item.file.name,
        fileSize: item.file.size,
      });
    } catch (err) {
      clearInterval(progressTimer);
      throw err;
    }
  }
}

export const uploadManager = new UploadManager();
