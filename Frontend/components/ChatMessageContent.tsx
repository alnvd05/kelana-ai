import type { ReactNode } from "react";

type ChatMessageContentProps = {
  content: string;
};

type TextBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] };

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    return part;
  });
}

function parseBlocks(content: string): TextBlock[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: TextBlock[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ type: "paragraph", text });
    paragraph = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: heading[2].replace(/^\*\*(.+)\*\*$/, "$1"),
      });
      continue;
    }

    const listItem = line.match(/^([-*])\s+(.+)$/) ?? line.match(/^(\d+)[.)]\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      const ordered = /^\d/.test(listItem[1]);
      const items = [listItem[2]];

      while (index + 1 < lines.length) {
        const next = lines[index + 1].trim();
        const nextItem = ordered
          ? next.match(/^(\d+)[.)]\s+(.+)$/)
          : next.match(/^([-*])\s+(.+)$/);
        if (!nextItem) break;
        items.push(nextItem[2]);
        index += 1;
      }

      blocks.push({ type: "list", ordered, items });
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return blocks;
}

export function ChatMessageContent({ content }: ChatMessageContentProps) {
  return (
    <div className="chat-message-content">
      {parseBlocks(content).map((block, index) => {
        if (block.type === "heading") {
          return <h3 key={index}>{renderInline(block.text)}</h3>;
        }

        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </List>
          );
        }

        return <p key={index}>{renderInline(block.text)}</p>;
      })}
    </div>
  );
}
