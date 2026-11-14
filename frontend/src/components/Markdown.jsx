// Minimal Markdown renderer for assistant replies: headings, bullet/numbered lists, bold, italics, inline code.
function inline(text, keyBase) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((p, i) => {
    const k = `${keyBase}-${i}`;
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={k}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`')) return <code key={k}>{p.slice(1, -1)}</code>;
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <em key={k}>{p.slice(1, -1)}</em>;
    return p;
  });
}

export default function Markdown({ text }) {
  const lines = (text || '').split('\n');
  const blocks = [];
  let list = null;
  const flush = () => {
    if (list) blocks.push(list);
    list = null;
  };
  lines.forEach((raw) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)/);
    const heading = line.match(/^(#{1,4})\s+(.*)/);
    if (bullet || numbered) {
      const type = bullet ? 'ul' : 'ol';
      if (!list || list.type !== type) {
        flush();
        list = { type, items: [] };
      }
      list.items.push((bullet || numbered)[1]);
      return;
    }
    flush();
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) return;
    if (heading) blocks.push({ type: 'h', level: heading[1].length, text: heading[2] });
    else if (line.trim()) blocks.push({ type: 'p', text: line });
  });
  flush();

  return (
    <div className="md">
      {blocks.map((b, i) => {
        if (b.type === 'ul' || b.type === 'ol') {
          const Tag = b.type;
          return (
            <Tag key={i}>
              {b.items.map((it, j) => (
                <li key={j}>{inline(it, `${i}-${j}`)}</li>
              ))}
            </Tag>
          );
        }
        if (b.type === 'h') return <h4 key={i}>{inline(b.text, i)}</h4>;
        return <p key={i}>{inline(b.text, i)}</p>;
      })}
    </div>
  );
}
