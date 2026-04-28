import { useRef, useState, type FormEvent } from 'react';

interface Props {
  onSubmit: (text: string) => void | Promise<void>;
}

export function TodoForm({ onSubmit }: Props) {
  const [text, setText] = useState('');
  const [inlineError, setInlineError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      setInlineError('Please enter a todo.');
      return;
    }
    setInlineError(null);
    setText('');
    await onSubmit(trimmed);
    inputRef.current?.focus();
  };

  return (
    <form className="todo-form" onSubmit={handleSubmit} aria-label="Add todo">
      <label htmlFor="todo-input" className="visually-hidden">
        New todo
      </label>
      <input
        id="todo-input"
        ref={inputRef}
        type="text"
        placeholder="What do you need to do?"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (inlineError) setInlineError(null);
        }}
        maxLength={500}
        autoFocus
        aria-invalid={inlineError ? 'true' : 'false'}
        aria-describedby={inlineError ? 'todo-input-error' : undefined}
      />
      <button type="submit">Add</button>
      {inlineError && (
        <p id="todo-input-error" className="inline-error" role="status">
          {inlineError}
        </p>
      )}
    </form>
  );
}
