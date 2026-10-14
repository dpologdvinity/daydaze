import { useState, type FormEvent } from "react";

const MAX_LENGTH = 120;

/** Local chat: what you say shows above your doll (offline echo for now). */
export function ChatBar({ onSay }: { onSay: (text: string) => void }) {
  const [text, setText] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const said = text.trim();
    if (!said) return;
    onSay(said);
    setText("");
  };
  return (
    <form className="chat" onSubmit={submit}>
      <label className="sr-only" htmlFor="chat-input">
        Chat message
      </label>
      <input
        id="chat-input"
        value={text}
        maxLength={MAX_LENGTH}
        autoComplete="off"
        placeholder="Say something"
        onChange={(e) => setText(e.target.value)}
      />
      <button type="submit">Say</button>
    </form>
  );
}
