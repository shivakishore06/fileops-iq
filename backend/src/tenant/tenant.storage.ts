import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  tenantId: string;
  userId?: string;
}

export const tenantLocalStorage = new AsyncLocalStorage<TenantContext>();
