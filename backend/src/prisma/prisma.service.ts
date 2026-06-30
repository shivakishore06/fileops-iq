import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { tenantLocalStorage } from '../tenant/tenant.storage';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private _extendedClient: any;

  constructor() {
    super();
    this._extendedClient = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const context = tenantLocalStorage.getStore();
            const tenantId = context?.tenantId;
            const bypassModels = ['Tenant', 'Role', 'Permission', 'RolePermission', 'UserRole'];
            const queryArgs = args as any;

            if (tenantId && !bypassModels.includes(model)) {
              // Apply filtering for read operations
              if (['findFirst', 'findFirstOrThrow', 'findMany', 'findUnique', 'findUniqueOrThrow', 'count', 'aggregate', 'groupBy'].includes(operation)) {
                queryArgs.where = queryArgs.where || {};
                queryArgs.where.tenantId = tenantId;
                queryArgs.where.deletedAt = null;
              }
              // Apply filtering for write operations
              else if (['create', 'createMany'].includes(operation)) {
                if (operation === 'create') {
                  queryArgs.data = queryArgs.data || {};
                  queryArgs.data.tenantId = tenantId;
                } else if (operation === 'createMany') {
                  if (Array.isArray(queryArgs.data)) {
                    queryArgs.data = queryArgs.data.map((item: any) => ({ ...item, tenantId }));
                  } else {
                    queryArgs.data = queryArgs.data || {};
                    queryArgs.data.tenantId = tenantId;
                  }
                }
              } else if (['update', 'updateMany', 'upsert', 'delete', 'deleteMany'].includes(operation)) {
                queryArgs.where = queryArgs.where || {};
                queryArgs.where.tenantId = tenantId;

                if (operation === 'update' || operation === 'updateMany') {
                  queryArgs.data = queryArgs.data || {};
                } else if (operation === 'upsert') {
                  queryArgs.create = queryArgs.create || {};
                  queryArgs.create.tenantId = tenantId;
                  queryArgs.update = queryArgs.update || {};
                  queryArgs.update.tenantId = tenantId;
                }
              }
            } else {
              // Enforce soft-delete even without tenant context for all general models
              if (!bypassModels.includes(model)) {
                if (['findFirst', 'findFirstOrThrow', 'findMany', 'findUnique', 'findUniqueOrThrow', 'count', 'aggregate', 'groupBy'].includes(operation)) {
                  queryArgs.where = queryArgs.where || {};
                  queryArgs.where.deletedAt = null;
                }
              }
            }

            return query(queryArgs);
          },
        },
      },
    });

    // Proxy requests to the extended client
    return new Proxy(this, {
      get: (target, prop) => {
        if (prop in target._extendedClient) {
          return target._extendedClient[prop];
        }
        return (target as any)[prop];
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
