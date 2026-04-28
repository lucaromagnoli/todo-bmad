export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ApiErrorCode = 'validation_error' | 'not_found' | 'internal_error' | 'network_error';

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; details?: unknown };
}
