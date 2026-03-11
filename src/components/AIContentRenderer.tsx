import { cn } from "@/lib/utils";

interface AIContentRendererProps {
  content: string;
  className?: string;
}

// Strip excessive emojis from text - keep max 1 per paragraph/heading
function stripExcessiveEmojis(text: string): string {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FA9F}\u{1FB00}-\u{1FBFF}\u{200D}\u{FE0F}]+/gu;
  let count = 0;
  return text.replace(emojiRegex, (match) => {
    count++;
    return count <= 1 ? match : "";
  });
}

// Clean up decorative symbols and excessive formatting
function cleanLine(text: string): string {
  // Remove lines that are just decorative (e.g., "---", "***", "===", "___")
  if (/^[\s*\-=_~#>]{2,}$/.test(text.trim())) return "";
  // Strip excessive emojis
  return stripExcessiveEmojis(text).trim();
}

export function AIContentRenderer({ content, className }: AIContentRendererProps) {
  const parseContent = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let listItems: string[] = [];
    let listType: 'bullet' | 'numbered' | null = null;
    let key = 0;

    const flushList = () => {
      if (listItems.length > 0 && listType) {
        if (listType === 'bullet') {
          elements.push(
            <ul key={key++} className="space-y-1.5 my-3 ml-1">
              {listItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[0.9rem] leading-relaxed text-foreground/85">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-[0.55rem] shrink-0" />
                  <span className="flex-1">{parseInlineFormatting(item)}</span>
                </li>
              ))}
            </ul>
          );
        } else {
          elements.push(
            <ol key={key++} className="space-y-1.5 my-3 ml-1">
              {listItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[0.9rem] leading-relaxed text-foreground/85">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center mt-[0.15rem] shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1">{parseInlineFormatting(item)}</span>
                </li>
              ))}
            </ol>
          );
        }
        listItems = [];
        listType = null;
      }
    };

    for (const rawLine of lines) {
      const trimmed = cleanLine(rawLine);

      // Empty or decorative-only line
      if (!trimmed) {
        flushList();
        continue;
      }

      // Headings (#### / ### / ## / #)
      const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        flushList();
        const level = headingMatch[1].length;
        const headingText = cleanLine(headingMatch[2]);
        if (level === 1) {
          elements.push(
            <h2 key={key++} className="text-lg font-bold text-foreground mt-6 mb-3 first:mt-0 tracking-tight">
              {parseInlineFormatting(headingText)}
            </h2>
          );
        } else if (level === 2) {
          elements.push(
            <h3 key={key++} className="text-base font-semibold text-foreground mt-5 mb-2.5 first:mt-0">
              {parseInlineFormatting(headingText)}
            </h3>
          );
        } else {
          elements.push(
            <h4 key={key++} className="text-sm font-semibold text-foreground mt-4 mb-2 first:mt-0">
              {parseInlineFormatting(headingText)}
            </h4>
          );
        }
        continue;
      }

      // Bold-only line acting as heading (e.g., "**Section Title**" on its own)
      const boldLineMatch = trimmed.match(/^(\*\*|__)(.+?)\1\s*$/);
      if (boldLineMatch && boldLineMatch[2].length < 80) {
        flushList();
        elements.push(
          <h4 key={key++} className="text-sm font-semibold text-foreground mt-4 mb-2 first:mt-0">
            {parseInlineFormatting(cleanLine(boldLineMatch[2]))}
          </h4>
        );
        continue;
      }

      // Bullet lists (-, *, •)
      const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
      if (bulletMatch) {
        if (listType !== 'bullet') {
          flushList();
          listType = 'bullet';
        }
        listItems.push(cleanLine(bulletMatch[1]));
        continue;
      }

      // Numbered lists (1., 2., 1), 2), etc.)
      const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
      if (numberedMatch) {
        if (listType !== 'numbered') {
          flushList();
          listType = 'numbered';
        }
        listItems.push(cleanLine(numberedMatch[1]));
        continue;
      }

      // Regular paragraph
      flushList();
      elements.push(
        <p key={key++} className="text-[0.9rem] leading-[1.7] text-foreground/85 my-2 first:mt-0 last:mb-0">
          {parseInlineFormatting(trimmed)}
        </p>
      );
    }

    flushList();
    return elements;
  };

  const parseInlineFormatting = (text: string): (JSX.Element | string)[] => {
    const parts: (JSX.Element | string)[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Bold: **text** or __text__
      const boldMatch = remaining.match(/^(.*?)(\*\*|__)(.+?)\2(.*)$/s);
      if (boldMatch) {
        if (boldMatch[1]) {
          parts.push(...parseItalicAndCode(boldMatch[1], key));
          key += 2;
        }
        parts.push(
          <strong key={`b${key++}`} className="font-semibold text-foreground">
            {boldMatch[3]}
          </strong>
        );
        remaining = boldMatch[4];
        continue;
      }

      // Code: `text`
      const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/s);
      if (codeMatch) {
        if (codeMatch[1]) {
          parts.push(...parseItalicAndCode(codeMatch[1], key));
          key += 2;
        }
        parts.push(
          <code key={`c${key++}`} className="px-1.5 py-0.5 rounded-md bg-muted text-[0.8rem] font-mono text-foreground/90">
            {codeMatch[2]}
          </code>
        );
        remaining = codeMatch[3];
        continue;
      }

      // No more special formatting
      parts.push(...parseItalicAndCode(remaining, key));
      break;
    }

    return parts;
  };

  const parseItalicAndCode = (text: string, baseKey: number): (JSX.Element | string)[] => {
    // Handle italic: *text* or _text_ (but not ** or __)
    const italicMatch = text.match(/^(.*?)(?<!\*)\*(?!\*)([^*]+)\*(?!\*)(.*)$/s);
    if (italicMatch) {
      const parts: (JSX.Element | string)[] = [];
      if (italicMatch[1]) parts.push(italicMatch[1]);
      parts.push(<em key={`i${baseKey}`} className="italic text-foreground/80">{italicMatch[2]}</em>);
      if (italicMatch[3]) parts.push(italicMatch[3]);
      return parts;
    }
    return [text];
  };

  return (
    <div className={cn(
      "ai-content space-y-1",
      "[&_h2]:border-b [&_h2]:border-border/30 [&_h2]:pb-2",
      "[&_h3+ul]:mt-1 [&_h3+ol]:mt-1 [&_h4+ul]:mt-1 [&_h4+ol]:mt-1",
      className
    )}>
      {parseContent(content)}
    </div>
  );
}
