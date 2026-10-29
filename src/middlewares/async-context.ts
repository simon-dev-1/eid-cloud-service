import { AsyncLocalStorage } from 'node:async_hooks';

import type { Request, Response } from 'express';

type RequestContext = {
  validatedBody?: unknown;
  validatedQuery?: unknown;
  validatedParams?: unknown;
  sessionVaultId?: string;
};

const storage = new AsyncLocalStorage<RequestContext>();

export const runAsyncContext = (callback: () => void): void => {
  storage.run({}, callback);
};

export const setSessionVaultId = (vaultId: string): void => {
  const store = storage.getStore();
  if (store) {
    store.sessionVaultId = vaultId;
  }
};

export const getSessionVaultId = (): string | undefined => {
  return storage.getStore()?.sessionVaultId;
};

export const setValidatedBody = (body: unknown): void => {
  const store = storage.getStore();
  if (store) {
    store.validatedBody = body;
  }
};

export const setValidatedQuery = (query: unknown): void => {
  const store = storage.getStore();
  if (store) {
    store.validatedQuery = query;
  }
};

export const setValidatedParams = (params: unknown): void => {
  const store = storage.getStore();
  if (store) {
    store.validatedParams = params;
  }
};

export const getValidatedBody = <T>(): T | undefined => {
  return storage.getStore()?.validatedBody as T | undefined;
};

export const getValidatedQuery = <T>(): T | undefined => {
  return storage.getStore()?.validatedQuery as T | undefined;
};

export const getValidatedParams = <T>(): T | undefined => {
  return storage.getStore()?.validatedParams as T | undefined;
};

export const asyncContextMiddleware = (_req: Request, _res: Response, next: () => void): void => {
  runAsyncContext(next);
};
