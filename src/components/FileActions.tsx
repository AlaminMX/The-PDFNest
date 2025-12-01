import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, Download, Edit2, Trash2, Folder, MoreVertical, Sparkles } from "lucide-react";

interface FileActionsProps {
  file: {
    id: string;
    name: string;
    url?: string;
    storage_path: string;
  };
  categories: Array<{ id: string; name: string }>;
  onPreview?: () => void;
  onDownload?: () => void;
  onRename?: () => void;
  onChangeCategory?: (categoryId: string | null) => void;
  onDelete?: () => void;
  onAIAction?: (action: string) => void;
  showAIFeatures?: boolean;
  variant?: "desktop" | "mobile";
}

export function FileActions({
  file,
  categories,
  onPreview,
  onDownload,
  onRename,
  onChangeCategory,
  onDelete,
  onAIAction,
  showAIFeatures = true,
  variant = "desktop",
}: FileActionsProps) {
  if (variant === "desktop") {
    return (
      <div className="hidden md:flex items-center gap-2">
        {onRename && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRename}
            className="h-9 w-9"
            aria-label="Rename file"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
        
        {file.url && onPreview && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onPreview}
            className="h-9 w-9"
            aria-label="Preview PDF"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        
        {file.url && onDownload && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDownload}
            className="h-9 w-9"
            aria-label="Download file"
          >
            <Download className="h-4 w-4" />
          </Button>
        )}

        {showAIFeatures && onAIAction && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                aria-label="AI Features"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-50 w-48">
              <DropdownMenuItem onClick={() => onAIAction?.('summary')}>
                📄 Summarize
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAIAction?.('study-guide')}>
                📚 Study Guide
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAIAction?.('voice')}>
                🔊 Voice Reader
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAIAction?.('translate')}>
                🌐 Translate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAIAction?.('chat')}>
                💬 Chat with PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
            aria-label="Delete file"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  // Mobile variant - dropdown menu
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden">
          <MoreVertical className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {onRename && (
          <DropdownMenuItem onClick={onRename}>
            <Edit2 className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
        )}
        
        {onChangeCategory && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Folder className="mr-2 h-4 w-4" />
              Change Category
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => onChangeCategory(null)}>
                Uncategorized
              </DropdownMenuItem>
              {categories.filter(c => c.id !== "uncategorized" && c.id !== "favorites").map((cat) => (
                <DropdownMenuItem key={cat.id} onClick={() => onChangeCategory(cat.id)}>
                  {cat.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {file.url && onPreview && (
          <DropdownMenuItem onClick={onPreview}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </DropdownMenuItem>
        )}
        
        {file.url && onDownload && (
          <DropdownMenuItem onClick={onDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </DropdownMenuItem>
        )}

        {showAIFeatures && onAIAction && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Sparkles className="mr-2 h-4 w-4" />
                AI Features
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => onAIAction('summary')}>
                  📄 Summarize
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAIAction('study-guide')}>
                  📚 Study Guide
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAIAction('voice')}>
                  🔊 Voice Reader
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAIAction('translate')}>
                  🌐 Translate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAIAction('chat')}>
                  💬 Chat with PDF
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        )}

        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
