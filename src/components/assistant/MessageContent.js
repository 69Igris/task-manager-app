'use client';

/**
 * Renders the assistant's reply: paragraphs, "- " bullets, **bold**, and the
 * "Facts" / "Recommendations" labels. Builds React nodes only (no HTML
 * injection), since replies can echo user-written task text.
 */

function renderInline(text, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={`${keyPrefix}-${i}`} className="font-medium text-[color:var(--color-text-strong)]">{part.slice(2, -2)}</strong>
      : <span key={`${keyPrefix}-${i}`}>{part}</span>
  );
}

const LABEL = /^(\*\*)?(facts|recommendations|suggested next actions|next steps?)(\*\*)?:?(\*\*)?$/i;

export default function MessageContent({ content }) {
  const blocks = [];
  let list = null;

  content.split('\n').forEach((rawLine, idx) => {
    const line = rawLine.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/) || line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet) {
      if (!list) {
        list = { type: 'list', ordered: /^\s*\d/.test(line), items: [] };
        blocks.push(list);
      }
      list.items.push(bullet[1]);
      return;
    }
    list = null;
    if (!line.trim()) return;
    const heading = line.trim().replace(/^#+\s*/, '');
    if (LABEL.test(heading)) {
      blocks.push({ type: 'label', text: heading.replace(/[*:]/g, '') });
    } else {
      blocks.push({ type: 'p', text: line, idx });
    }
  });

  return (
    <div className="space-y-2 text-[14px] leading-relaxed text-[color:var(--color-text)]">
      {blocks.map((b, i) => {
        if (b.type === 'label') {
          return (
            <p key={i} className="pt-1 text-[12px] font-medium text-[color:var(--color-text-muted)]">
              {b.text}
            </p>
          );
        }
        if (b.type === 'list') {
          const Tag = b.ordered ? 'ol' : 'ul';
          return (
            <Tag key={i} className={`space-y-1 pl-5 ${b.ordered ? 'list-decimal' : 'list-disc'}`}>
              {b.items.map((item, j) => <li key={j}>{renderInline(item, `${i}-${j}`)}</li>)}
            </Tag>
          );
        }
        return <p key={i}>{renderInline(b.text, String(i))}</p>;
      })}
    </div>
  );
}
