import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TodoForm } from '../src/components/TodoForm';
import { TodoItem } from '../src/components/TodoItem';
import { EmptyState } from '../src/components/EmptyState';
import { ErrorBanner } from '../src/components/ErrorBanner';
import type { Todo } from '../src/api/types';

const todo = (over: Partial<Todo> = {}): Todo => ({
  id: 'a',
  text: 'walk',
  completed: false,
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
  ...over,
});

describe('TodoForm', () => {
  it('submits trimmed text and clears the input', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TodoForm onSubmit={onSubmit} />);
    const input = screen.getByRole('textbox', { name: /new todo/i });
    await user.type(input, '  hello  ');
    await user.click(screen.getByRole('button', { name: /add/i }));
    expect(onSubmit).toHaveBeenCalledWith('hello');
    expect(input).toHaveValue('');
  });

  it('shows an inline error and does not submit when input is empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TodoForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /add/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/please enter a todo/i)).toBeInTheDocument();
  });

  it('shows an inline error for whitespace-only input', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TodoForm onSubmit={onSubmit} />);
    await user.type(screen.getByRole('textbox', { name: /new todo/i }), '   ');
    await user.click(screen.getByRole('button', { name: /add/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('TodoItem', () => {
  it('marks completed visually when todo.completed is true', () => {
    render(<TodoItem todo={todo({ completed: true })} onToggle={() => {}} onDelete={() => {}} />);
    expect(screen.getByTestId('todo-item')).toHaveAttribute('data-completed', 'true');
    expect(screen.getByTestId('todo-item')).toHaveClass('completed');
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('calls onToggle with the todo id when the checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<TodoItem todo={todo({ id: 'x' })} onToggle={onToggle} onDelete={() => {}} />);
    await user.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledWith('x');
  });

  it('calls onDelete with the todo id when the delete button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<TodoItem todo={todo({ id: 'x' })} onToggle={() => {}} onDelete={onDelete} />);
    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith('x');
  });
});

describe('EmptyState', () => {
  it('renders the empty-state message', () => {
    render(<EmptyState />);
    expect(screen.getByTestId('empty-state')).toHaveTextContent(/no todos yet/i);
  });
});

describe('ErrorBanner', () => {
  it('renders the message in an alert region and calls onDismiss', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<ErrorBanner message="boom" onDismiss={onDismiss} />);
    expect(screen.getByRole('alert')).toHaveTextContent('boom');
    await user.click(screen.getByRole('button', { name: /dismiss error/i }));
    expect(onDismiss).toHaveBeenCalled();
  });
});
