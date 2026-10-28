import type { ZodError } from 'zod';

export class CustomError extends Error {
  public readonly statusCode: number;
  public readonly errorCode?: string;
  public override readonly message: string;
  constructor(statusCode: number, message: string | undefined, errorCode?: string) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.message = message ?? 'Unexpected error occurred';
  }
}

export const notFoundError = class extends CustomError {
  constructor(message: string | undefined) {
    super(404, message);
  }
};

export const badRequestError = class extends CustomError {
  constructor(message: string | undefined) {
    super(400, message);
  }
};

export const validationError = class extends badRequestError {
  public readonly errors: { field: string; message: string; code: string }[];
  public readonly flatMessage: string;

  constructor(message: string, zodError: ZodError) {
    super(message);

    this.errors = zodError.issues.map((error) => ({
      field: error.path
        .filter((p): p is string | number => typeof p === 'string' || typeof p === 'number')
        .join('.'),
      message: error.message,
      code: error.code,
    }));

    this.flatMessage = this.errors.map((e) => `Field:${e.field} Message:${e.message}`).join(', ');
  }
};

export const unauthorized = class extends CustomError {
  constructor(message: string | undefined) {
    super(401, message);
  }
};

export const forbidden = class extends CustomError {
  constructor(message: string | undefined) {
    super(403, message);
  }
};

export const externalServiceError = class extends CustomError {
  constructor(message: string | undefined) {
    super(502, message);
  }
};

export const internalServiceError = class extends CustomError {
  constructor(message: string | undefined) {
    super(500, message);
  }
};

export const conflictError = class extends CustomError {
  constructor(message: string | undefined, errorCode?: string) {
    super(409, message, errorCode);
  }
};

export const tooManyRequestsError = class extends CustomError {
  constructor(message: string | undefined, errorCode?: string) {
    super(429, message, errorCode);
  }
};
