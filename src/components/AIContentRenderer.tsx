import { cn } from "@/lib/utils";

interface AIContentRendererProps {
  content: string;
  className?: string;
}

const EMOJI_REGEX = /[\p{Extended_Pictographic}\uFE0F]/gu;

const normalizeContent = (text: string) => {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(EMOJI_REGEX, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const cleanInlineText = (text: string) =>
  text
    .replace(/^(#+)(?=\S)/, "")
    .replace(/\*{3,}/g, "")
    .replace(/_{3,}/g, "")
    .replace(/~~/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

export function AIContentRenderer({ content, className }: AIContentRendererProps) {
  const parseInlineFormatting = (text: string): JSX.Element[] => {
    const parts: JSX.Element[] = [];
    const regex = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;

    while ((match = regex.exec(text)) !== null) {
      const [token] = match;
      if (match.index > lastIndex) {
        parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
      }

      if ((token.startsWith("**") && token.endsWith("**")) || (token.startsWith("__") && token.endsWith("__"))) {
        parts.push(
          <strong key={key++} className="font-semibold text-foreground">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith("`") && token.endsWith("`")) {
        parts.push(
          <code key={key++} className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground/90">
            {token.slice(1, -1)}
          </code>
        );
      } else {
        parts.push(
          <em key={key++} className="italic text-foreground/90">
            {token.slice(1, -1)}
          </em>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
    }

    return parts;
  };

  const parseContent = (rawText: string) => {
    const text = normalizeContent(rawText);
    if (!text) return [];

    const lines = text.split("\n");
    const elements: JSX.Element[] = [];
    let listItems: string[] = [];
    let listType: "bullet" | "numbered" | null = null;
    let key = 0;

    const flushList = () => {
      if (!listItems.length || !listType) return;

      if (listType === "bullet") {
        elements.push(
          <ul key={key++} className="my-3 ml-1 space-y-2.5">
            {listItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm leading-7 text-foreground/90">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                <span>{parseInlineFormatting(cleanInlineText(item))}</span>
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={key++} className="my-3 ml-1 space-y-2.5">
            {listItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm leading-7 text-foreground/90">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {i + 1}
                </span>
                <span>{parseInlineFormatting(cleanInlineText(item))}</span>
              </li>
            ))}
          </ol>
        );
      }

      listItems = [];
      listType = null;
    };

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || /^([-*_]\s*){3,}$/.test(trimmed)) {
        flushList();
        continue;
      }

      const headingMatch = trimmed.match(/^(#{1,3})\s*(.+)$/);
      if (headingMatch) {
        flushList();
        const depth = headingMatch[1].length;
        const headingText = cleanInlineText(headingMatch[2]);
        const headingClass =
          depth === 1
            ? "text-lg font-semibold mt-5 mb-2.5 first:mt-0"
            : depth === 2
              ? "text-base font-semibold mt-4 mb-2 first:mt-0"
              : "text-sm font-semibold mt-3.5 mb-1.5 first:mt-0";

        elements.push(
          <h3 key={key++} className={cn("text-foreground", headingClass)}>
            {parseInlineFormatting(headingText)}
          </h3>
        );
        continue;
      }

      const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
      if (bulletMatch) {
        if (listType !== "bullet") {
          flushList();
          listType = "bullet";
        }
        listItems.push(bulletMatch[1]);
        continue;
      }

      const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
      if (numberedMatch) {
        if (listType !== "numbered") {
          flushList();
          listType = "numbered";
        }
        listItems.push(numberedMatch[1]);
        continue;
      }

      flushList();
      elements.push(
        <p key={key++} className="my-2.5 text-sm leading-7 text-foreground/90 first:mt-0 last:mb-0">
          {parseInlineFormatting(cleanInlineText(trimmed))}
        </p>
      );
    }

    flushList();
    return elements;
  };

  return <div className={cn("space-y-1 text-sm", className)}>{parseContent(content)}</div>;
}
