

# PDFNest: Offline Indicator, Save Offline Button, FAB Simplification, and PDF Preview Speed

## Overview

Four changes: (1) add an offline mode banner, (2) add a "Save Offline" button on each PDF card, (3) simplify the FAB to upload-only (remove AI features menu), and (4) speed up PDF preview loading.

---

## 1. Offline Mode Indicator Banner

**What**: A persistent banner at the top of the main content area that appears when the user loses internet connectivity, and disappears when they reconnect.

**Where**: `src/pages/Index.tsx` -- add a banner right after `<AdminBannerDisplay />` inside the `<header>` or just below it.

**How**:
- Add `useState` + `useEffect` with `online`/`offline` event listeners on `window`
- Render a yellow/amber banner: "You're offline -- only cached PDFs are available"
- Use `WifiOff` icon from lucide-react
- Banner disappears automatically when back online

---

## 2. "Save Offline" Button on Each PDF Card

**What**: A small button/icon on each PDF file row (list view) and card (grid view) that lets users explicitly cache a PDF to IndexedDB for offline access. Shows a checkmark if already cached.

**Where**: `src/pages/Index.tsx` -- in both list view and grid view file rendering sections.

**How**:
- Use the existing `cacheForOffline` function from `usePDFFiles` hook and `isOfflineAvailable` flag on each file
- In list view: add a cloud-download / check-circle icon button in the action row (next to favorite, download, etc.)
- In grid view: add it in the button row at the bottom of each card
- When clicked: call `cacheForOffline(file.id, file.url, file.name)`, show a toast on success
- If already cached (`file.isOfflineAvailable === true`): show a green check icon instead
- In the mobile dropdown menu: add a "Save Offline" / "Saved Offline" menu item

---

## 3. Simplify FAB -- Upload Only

**What**: Remove the expandable menu from the FAB. Clicking the FAB directly triggers file upload instead of opening a radial menu with "Upload" and "AI Features".

**Where**: 
- `src/components/FloatingActionButton.tsx` -- simplify to a single upload button
- `src/pages/Index.tsx` -- update the FAB usage (remove `onAIFeatures` prop)

**How**:
- Replace the FAB component internals: remove `isOpen` state, remove the `actions` array, remove `AnimatePresence`
- Single button with `Upload` icon that directly calls `onUpload` on click
- Remove the `onAIFeatures` prop entirely
- Update Index.tsx line ~1688 to remove `onAIFeatures` prop

---

## 4. Faster PDF Preview Loading

**What**: Optimize `PDFViewer.tsx` to render the first page faster for large files by using progressive loading and lower initial render resolution.

**Where**: `src/components/PDFViewer.tsx`

**How**:
- Enable `disableAutoFetch: true` and `disableStream: false` so pdfjs loads only what's needed for the first page via range requests, rather than downloading the entire file before rendering
- Reduce `rangeChunkSize` from 65536 to 32768 for faster initial chunks
- Render the first page at 1x device pixel ratio initially (skip HiDPI scaling on first render), then re-render at full quality after initial display -- this makes the first page appear much faster
- Show a skeleton placeholder matching the expected page dimensions instead of a centered spinner while loading
- Check offline cache first: if the PDF is cached in IndexedDB, load from the local blob instead of fetching from the network

---

## Technical Details

### Files to modify:
1. **`src/pages/Index.tsx`** -- offline banner, save-offline buttons in list/grid views, remove `onAIFeatures` from FAB
2. **`src/components/FloatingActionButton.tsx`** -- simplify to single upload button
3. **`src/components/PDFViewer.tsx`** -- progressive loading optimizations, offline cache fallback

### Files NOT modified:
- `src/lib/offlineStorage.ts` -- already has all needed functions (`cachePDF`, `getCachedPDF`, `getAllCachedIds`)
- `src/hooks/usePDFFiles.tsx` -- already exposes `cacheForOffline` and `isOfflineAvailable`

### No database changes required.

