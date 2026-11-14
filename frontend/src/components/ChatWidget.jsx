import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import Markdown from './Markdown';

const GREETING = {
  role: 'assistant',
  content: "Hi! I'm **Atlas**, your travel assistant 🌍. Ask me how to use the map, where to go on your budget, or anything about visas, weather, food and culture.",
};

export default function ChatWidget({ context }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const last = list.lastElementChild;
    // Long replies: jump to where the reply starts rather than its end.
    const top = !sending && messages.length > 1 && last ? last.offsetTop - 12 : list.scrollHeight;
    list.scrollTo({ top, behavior: 'smooth' });
  }, [messages, sending, open]);

  const name = context.country?.name;
  const suggestions = name
    ? [`What's the best time to visit ${name}?`, `Do I need a visa for ${name}?`, `Hidden gems in ${name}?`]
    : ['How do I use this map?', 'Cheap countries for a 1-week trip?', 'Where is warm in December?'];

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const { reply } = await api.chat({ messages: next.filter((m) => m !== GREETING), context });
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `⚠️ ${e.message}`, error: true }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {open && (
        <div className="chat" role="dialog" aria-label="Travel assistant">
          <header>
            <div className="avatar">🧭</div>
            <div className="grow">
              <strong>Atlas</strong>
              <small>{name ? `Helping with ${context.country.flag} ${name}` : 'Gemini-powered travel assistant'}</small>
            </div>
            <button className="icon" onClick={() => setOpen(false)} aria-label="Close chat">×</button>
          </header>
          <div className="chat-list" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`bubble ${m.role}${m.error ? ' error' : ''}`}>
                {m.role === 'assistant' ? <Markdown text={m.content} /> : m.content}
              </div>
            ))}
            {sending && (
              <div className="bubble assistant typing">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>
          {messages.length <= 2 && (
            <div className="suggestions">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          )}
          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything about travel…" aria-label="Message" />
            <button disabled={!input.trim() || sending} aria-label="Send">➤</button>
          </form>
        </div>
      )}
      <button className={`chat-fab${open ? ' open' : ''}`} onClick={() => setOpen((o) => !o)} aria-label="Open travel assistant">
        {open ? '×' : '💬'}
        {!open && <span className="fab-label">Ask Atlas</span>}
      </button>
    </>
  );
}
