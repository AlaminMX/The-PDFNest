import { useState, useCallback, useRef } from "react";

export interface DownloadItem {
  id: string;
  fileName: string;
  progress: number;
  status: "pending" | "downloading" | "complete" | "error" | "cancelled";
  speed?: string;
  error?: string;
}

export function useDownloadManager() {
  const [downloads, setDownloads] = useState<Map<string, DownloadItem>>(new Map());
  const xhrRefs = useRef<Map<string, XMLHttpRequest>>(new Map());

  const updateDownload = useCallback((id: string, updates: Partial<DownloadItem>) => {
    setDownloads(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(id);
      if (existing) {
        newMap.set(id, { ...existing, ...updates });
      }
      return newMap;
    });
  }, []);

  const downloadFile = useCallback(async (url: string, fileName: string): Promise<boolean> => {
    const id = `${fileName}-${Date.now()}`;
    
    // Add to download queue
    setDownloads(prev => {
      const newMap = new Map(prev);
      newMap.set(id, {
        id,
        fileName,
        progress: 0,
        status: "downloading",
      });
      return newMap;
    });

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhrRefs.current.set(id, xhr);
      
      let lastLoaded = 0;
      let lastTime = Date.now();

      xhr.open("GET", url, true);
      xhr.responseType = "blob";

      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          
          // Calculate speed
          const now = Date.now();
          const timeDiff = (now - lastTime) / 1000;
          const loadedDiff = event.loaded - lastLoaded;
          
          let speed = "";
          if (timeDiff > 0.5) {
            const bytesPerSecond = loadedDiff / timeDiff;
            if (bytesPerSecond > 1024 * 1024) {
              speed = `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
            } else if (bytesPerSecond > 1024) {
              speed = `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
            } else {
              speed = `${Math.round(bytesPerSecond)} B/s`;
            }
            lastLoaded = event.loaded;
            lastTime = now;
          }

          updateDownload(id, { progress, speed: speed || undefined });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          updateDownload(id, { progress: 100, status: "complete" });
          
          // Trigger actual download
          const blob = xhr.response;
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = fileName;
          link.style.display = "none";
          document.body.appendChild(link);
          
          // Use setTimeout to ensure the click happens in a new event loop
          setTimeout(() => {
            link.click();
            document.body.removeChild(link);
            
            // Delay revoking the blob URL to ensure download starts
            setTimeout(() => {
              URL.revokeObjectURL(blobUrl);
            }, 1000);
          }, 0);
          
          // Remove from list after delay
          setTimeout(() => {
            setDownloads(prev => {
              const newMap = new Map(prev);
              newMap.delete(id);
              return newMap;
            });
            xhrRefs.current.delete(id);
          }, 3000);
          
          resolve(true);
        } else {
          updateDownload(id, { status: "error", error: `HTTP ${xhr.status}` });
          resolve(false);
        }
      };

      xhr.onerror = () => {
        updateDownload(id, { status: "error", error: "Network error" });
        resolve(false);
      };

      xhr.onabort = () => {
        updateDownload(id, { status: "cancelled" });
        setTimeout(() => {
          setDownloads(prev => {
            const newMap = new Map(prev);
            newMap.delete(id);
            return newMap;
          });
          xhrRefs.current.delete(id);
        }, 1500);
        resolve(false);
      };

      xhr.send();
    });
  }, [updateDownload]);

  const cancelDownload = useCallback((id: string) => {
    const xhr = xhrRefs.current.get(id);
    if (xhr) {
      xhr.abort();
    }
  }, []);

  const downloadMultiple = useCallback(async (
    files: { url: string; fileName: string }[],
    concurrency: number = 3
  ): Promise<void> => {
    const queue = [...files];
    const active: Promise<void>[] = [];

    const processNext = async (): Promise<void> => {
      if (queue.length === 0) return;
      
      const file = queue.shift()!;
      await downloadFile(file.url, file.fileName);
      // Add delay between downloads to prevent browser blocking
      await new Promise(resolve => setTimeout(resolve, 500));
      await processNext();
    };

    // Start initial batch (reduced concurrency for reliability)
    for (let i = 0; i < Math.min(concurrency, files.length); i++) {
      active.push(processNext());
    }

    await Promise.all(active);
  }, [downloadFile]);

  const clearCompleted = useCallback(() => {
    setDownloads(prev => {
      const newMap = new Map(prev);
      for (const [id, item] of newMap) {
        if (item.status === "complete" || item.status === "error" || item.status === "cancelled") {
          newMap.delete(id);
          xhrRefs.current.delete(id);
        }
      }
      return newMap;
    });
  }, []);

  return {
    downloads,
    downloadFile,
    downloadMultiple,
    cancelDownload,
    clearCompleted,
  };
}
