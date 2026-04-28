import { useTodos } from './hooks/useTodos';
import { TodoList } from './components/TodoList';
import { TodoForm } from './components/TodoForm';
import { EmptyState } from './components/EmptyState';
import { ErrorBanner } from './components/ErrorBanner';

export function App() {
  const { todos, status, error, create, toggle, remove, dismissError } = useTodos();

  return (
    <main className="app">
      <h1>todos</h1>

      <TodoForm onSubmit={create} />

      {error && <ErrorBanner message={error} onDismiss={dismissError} />}

      {status === 'loading' && (
        <p className="status-text" data-testid="loading-state" role="status">
          Loading…
        </p>
      )}

      {status === 'error' && todos.length === 0 && (
        <p className="status-text" data-testid="error-state" role="status">
          Could not load your todos.
        </p>
      )}

      {status === 'ready' && todos.length === 0 && <EmptyState />}

      {todos.length > 0 && <TodoList todos={todos} onToggle={toggle} onDelete={remove} />}
    </main>
  );
}
