import { cn } from "@/lib/utils";

interface AIContentRendererProps {
  content: string;
  className?: string;
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
            <ul key={key++} className="space-y-2 my-3 ml-1">
              {listItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/70 mt-2 shrink-0" />
                  <span>{parseInlineFormatting(item)}</span>
                </li>
              ))}
            </ul>
          );
        } else {
          elements.push(
            <ol key={key++} className="space-y-2 my-3 ml-1">
              {listItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center mt-0.5 shrink-0">
                    {i + 1}
                  </span>
                  <span>{parseInlineFormatting(item)}</span>
                </li>
              ))}
            </ol>
          );
        }
        listItems = [];
        listType = null;
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Empty line
      if (!trimmed) {
        flushList();
        continue;
      }

      // Headings
      if (trimmed.startsWith('### ')) {
        flushList();
        elements.push(
          <h4 key={key++} className="text-sm font-semibold text-foreground mt-4 mb-2 first:mt-0">
            {parseInlineFormatting(trimmed.slice(4))}
          </h4>
        );
        continue;
      }
      if (trimmed.startsWith('## ')) {
        flushList();
        elements.push(
          <h3 key={key++} className="text-base font-semibold text-foreground mt-5 mb-2 first:mt-0">
            {parseInlineFormatting(trimmed.slice(3))}
          </h3>
        );
        continue;
      }
      if (trimmed.startsWith('# ')) {
        flushList();
        elements.push(
          <h2 key={key++} className="text-lg font-bold text-foreground mt-5 mb-3 first:mt-0">
            {parseInlineFormatting(trimmed.slice(2))}
          </h2>
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
        listItems.push(bulletMatch[1]);
        continue;
      }

      // Numbered lists (1., 2., etc.)
      const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
      if (numberedMatch) {
        if (listType !== 'numbered') {
          flushList();
          listType = 'numbered';
        }
        listItems.push(numberedMatch[1]);
        continue;
      }

      // Regular paragraph
      flushList();
      elements.push(
        <p key={key++} className="text-sm leading-relaxed text-foreground/90 my-2 first:mt-0 last:mb-0">
          {parseInlineFormatting(trimmed)}
        </p>
      );
    }

    flushList();
    return elements;
  };

  const parseInlineFormatting = (text: string): JSX.Element[] => {
    const parts: JSX.Element[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Bold: **text** or __text__
      const boldMatch = remaining.match(/^(.*?)(\*\*|__)(.+?)\2(.*)$/s);
      if (boldMatch) {
        if (boldMatch[1]) {
          parts.push(<span key={key++}>{parseItalic(boldMatch[1])}</span>);
        }
        parts.push(
          <strong key={key++} className="font-semibold text-foreground">
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
          parts.push(<span key={key++}>{parseItalic(codeMatch[1])}</span>);
        }
        parts.push(
          <code key={key++} className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
            {codeMatch[2]}
          </code>
        );
        remaining = codeMatch[3];
        continue;
      }

      // No more special formatting
      parts.push(<span key={key++}>{parseItalic(remaining)}</span>);
      break;
    }

    return parts;
  };

  const parseItalic = (text: string): JSX.Element | string => {
    const italicMatch = text.match(/^(.*?)(\*|_)([^*_]+)\2(.*)$/s);
    if (italicMatch) {
      return (
        <>
          {italicMatch[1]}
          <em className="italic">{italicMatch[3]}</em>
          {italicMatch[4]}
        </>
      );
    }
    return text;
  };

  return (
    <div className={cn("space-y-1", className)}>
      {parseContent(content)}
    </div>
  );
}
