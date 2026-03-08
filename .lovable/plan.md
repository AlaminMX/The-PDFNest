

## Plan: AI-Powered PDF Auto-Organizer

### Overview
Add a button that uses AI to automatically categorize all uncategorized PDFs (or all PDFs) into the user's existing categories based on file names. The AI analyzes file names and assigns each to the best-matching category. Works for existing files and can be re-run after new uploads.

---

### New Edge Function: `supabase/functions/organize-pdfs/index.ts`

- Accepts `{ files: [{id, name}], categories: [{id, name}] }` from the client
- Sends file names + category names to Lovable AI (`google/gemini-2.5-flash-lite` — lightweight classification task)
- Uses tool calling to extract structured output: `{ assignments: [{fileId, categoryId}] }`
- Returns the assignments array
- Handles 429/402 rate limit errors

### Config Update: `supabase/config.toml`
- Add `[functions.organize-pdfs]` with `verify_jwt = true`

### UI Changes: `src/pages/Index.tsx`
- Add an "Auto-Organize" button (with a Sparkles icon) in the header/toolbar area near the sort controls
- On click: sends all uncategorized files + user's categories to the edge function
- Shows a loading state with progress toast
- On success: batch-updates `pdf_files.category_id` for each assignment via Supabase client
- Updates local file state to reflect new categories
- Shows summary toast: "Organized X files into categories"
- If no uncategorized files exist, shows info toast

### Flow
1. User clicks "Auto-Organize"
2. Client collects uncategorized files (files with `category_id === null`) and user's custom categories
3. Calls edge function which asks AI to classify each file name into the best category
4. Client receives assignments and batch-updates each file's `category_id`
5. UI refreshes to show files in their new categories

### Files Modified
| File | Change |
|------|--------|
| `supabase/functions/organize-pdfs/index.ts` | New edge function |
| `supabase/config.toml` | Add function entry |
| `src/pages/Index.tsx` | Add Auto-Organize button + handler |

