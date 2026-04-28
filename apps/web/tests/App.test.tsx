import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import type { Todo } from '../src/api/types';

type FetchMock = ReturnType<typeof vi.fn>;

const json = <T,>(body: T, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const errJson = (status: number, code: string, message: string) =>
  new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const todo = (over: Partial<Todo> = {}): Todo => ({
  id: 'a',
  text: 'walk',
  completed: false,
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
  ...over,
});

describe('App (integration)', () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the loading state then the empty state when the list is empty', async () => {
    fetchMock.mockResolvedValueOnce(json([] as Todo[]));
    render(<App />);
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument());
  });

  it('renders fetched todos', async () => {
    fetchMock.mockResolvedValueOnce(json([todo({ text: 'first' }), todo({ id: 'b', text: 'second' })]));
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('first')).toBeInTheDocument();
      expect(screen.getByText('second')).toBeInTheDocument();
    });
  });

  it('adds a todo through the form (optimistic + reconciled)', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(json([] as Todo[])); // initial list
    fetchMock.mockResolvedValueOnce(json(todo({ id: 'real-id', text: 'buy milk' }), 201));

    render(<App />);
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument());

    await user.type(screen.getByRole('textbox', { name: /new todo/i }), 'buy milk');
    await user.click(screen.getByRole('button', { name: /add/i }));

    await waitFor(() => expect(screen.getByText('buy milk')).toBeInTheDocument());
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('shows the error banner when adding fails and rolls back the optimistic insert', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(json([] as Todo[]));
    fetchMock.mockResolvedValueOnce(errJson(400, 'validation_error', 'too long'));

    render(<App />);
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument());

    await user.type(screen.getByRole('textbox', { name: /new todo/i }), 'oops');
    await user.click(screen.getByRole('button', { name: /add/i }));

    await waitFor(() =>
      expect(screen.getByTestId('error-banner')).toHaveTextContent(/too long/i),
    );
    expect(screen.queryByText('oops')).not.toBeInTheDocument();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('toggles a todo and shows the completed style', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(json([todo({ id: 'a', text: 'walk' })]));
    fetchMock.mockResolvedValueOnce(json(todo({ id: 'a', text: 'walk', completed: true })));

    render(<App />);
    await waitFor(() => expect(screen.getByText('walk')).toBeInTheDocument());

    await user.click(screen.getByRole('checkbox', { name: /toggle "walk"/i }));
    await waitFor(() =>
      expect(screen.getByTestId('todo-item')).toHaveAttribute('data-completed', 'true'),
    );
  });

  it('deletes a todo', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(json([todo({ id: 'a', text: 'walk' })]));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    render(<App />);
    await waitFor(() => expect(screen.getByText('walk')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /delete "walk"/i }));
    await waitFor(() => expect(screen.queryByText('walk')).not.toBeInTheDocument());
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });
});
