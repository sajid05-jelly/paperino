"use client";

import React from "react";
import { ExternalLink } from "lucide-react";

interface FormattedDescriptionProps {
  content: string;
  className?: string;
}

export default function FormattedDescription({ content, className = "" }: FormattedDescriptionProps) {
  if (!content) return null;

  // Helper to parse inline markdown formatting (bold, italic, code, links)
  const parseInline = (text: string): React.ReactNode[] => {
    const linkRegex = /(\[(.*?)\]\((https?:\/\/[^\s\)]+)\))|(https?:\/\/[^\s]+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(parseFormattingTokens(text.substring(lastIndex, match.index), `txt-${lastIndex}`));
      }

      const fullMatch = match[0];
      const markdownLabel = match[2];
      const markdownUrl = match[3];
      const rawUrl = match[4];

      const url = markdownUrl || rawUrl;
      const label = markdownLabel || rawUrl;

      parts.push(
        <a
          key={`link-${match.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-violet-300 hover:text-violet-200 underline underline-offset-4 decoration-violet-500/50 hover:decoration-violet-300 font-medium transition-colors break-all"
        >
          <span>{label}</span>
          <ExternalLink size={12} className="inline shrink-0" />
        </a>
      );

      lastIndex = match.index + fullMatch.length;
    }

    if (lastIndex < text.length) {
      parts.push(parseFormattingTokens(text.substring(lastIndex), `txt-${lastIndex}`));
    }

    return parts;
  };

  const parseFormattingTokens = (text: string, keyPrefix: string): React.ReactNode => {
    const tokenRegex = /(\*\*(.*?)\*\*|__(.*?)__|\*(.*?)\*|_(.*?)_|`(.*?)`)/g;
    const elements: React.ReactNode[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        elements.push(text.substring(lastIdx, match.index));
      }

      const boldText = match[2] || match[3];
      const italicText = match[4] || match[5];
      const codeText = match[6];

      if (boldText !== undefined) {
        elements.push(<strong key={`${keyPrefix}-b-${match.index}`} className="font-bold text-white">{boldText}</strong>);
      } else if (italicText !== undefined) {
        elements.push(<em key={`${keyPrefix}-i-${match.index}`} className="italic text-purple-200">{italicText}</em>);
      } else if (codeText !== undefined) {
        elements.push(
          <code key={`${keyPrefix}-c-${match.index}`} className="px-1.5 py-0.5 rounded bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-mono">
            {codeText}
          </code>
        );
      }

      lastIdx = match.index + match[0].length;
    }

    if (lastIdx < text.length) {
      elements.push(text.substring(lastIdx));
    }

    return <React.Fragment key={keyPrefix}>{elements}</React.Fragment>;
  };

  const lines = content.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let currentList: { type: "bullet" | "number"; items: React.ReactNode[] } | null = null;

  const flushList = () => {
    if (!currentList) return;
    if (currentList.type === "bullet") {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="my-3 space-y-2 pl-1">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-gray-300 text-sm md:text-base leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
              <div className="flex-1">{item}</div>
            </li>
          ))}
        </ul>
      );
    } else {
      blocks.push(
        <ol key={`ol-${blocks.length}`} className="my-3 space-y-2 pl-1">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-gray-300 text-sm md:text-base leading-relaxed">
              <span className="px-2 py-0.5 rounded-md bg-violet-500/15 border border-violet-500/30 text-violet-300 font-mono font-bold text-xs shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <div className="flex-1">{item}</div>
            </li>
          ))}
        </ol>
      );
    }
    currentList = null;
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    const bulletMatch = trimmed.match(/^[\u2022\-\*\u25AA\u25CF]\s*(.+)$/);
    const numberMatch = trimmed.match(/^(\d+)[\.\)]\s*(.+)$/);

    if (bulletMatch) {
      const itemContent = parseInline(bulletMatch[1]);
      if (!currentList || currentList.type !== "bullet") {
        flushList();
        currentList = { type: "bullet", items: [] };
      }
      currentList.items.push(itemContent);
    } else if (numberMatch) {
      const itemContent = parseInline(numberMatch[2]);
      if (!currentList || currentList.type !== "number") {
        flushList();
        currentList = { type: "number", items: [] };
      }
      currentList.items.push(itemContent);
    } else {
      flushList();
      blocks.push(
        <p key={`p-${lineIdx}`} className="text-gray-300 text-sm md:text-base leading-relaxed my-2">
          {parseInline(trimmed)}
        </p>
      );
    }
  });

  flushList();

  return (
    <div className={`space-y-1 w-full text-gray-300 overflow-visible ${className}`}>
      {blocks}
    </div>
  );
}
