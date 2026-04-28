import { z } from 'zod';

const trimmedText = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().min(1, 'text must not be empty').max(500, 'text must be ≤ 500 chars'));

export const createTodoSchema = z.object({ text: trimmedText });

export const updateTodoSchema = z
  .object({
    text: trimmedText.optional(),
    completed: z.boolean().optional(),
  })
  .refine((v) => v.text !== undefined || v.completed !== undefined, {
    message: 'at least one of "text" or "completed" must be provided',
  });

export const idParamSchema = z.object({ id: z.string().min(1) });

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TodoRow {
  id: string;
  text: string;
  completed: number;
  created_at: string;
  updated_at: string;
  owner_id: string | null;
}

export function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    text: row.text,
    completed: row.completed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
