import { Injectable, NestMiddleware, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { tenantLocalStorage } from './tenant.storage';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    let tenantId = req.headers['x-tenant-id'] as string;

    // Fallback to subdomain resolution if header is not present
    if (!tenantId) {
      const host = req.headers.host || '';
      const parts = host.split('.');
      // If there's a subdomain (e.g., tenant1.localhost:3000 -> parts = ['tenant1', 'localhost:3000'])
      if (parts.length >= 2 && parts[0] !== 'www' && parts[0] !== 'localhost' && parts[0] !== '127') {
        const domain = parts[0];
        const tenant = await this.prisma.tenant.findUnique({
          where: { domain, deletedAt: null },
        });
        if (tenant) {
          tenantId = tenant.id;
        }
      }
    }

    // For public auth endpoints or status check, we might allow no tenantId temporarily, 
    // but the routes requiring authentication will enforce tenant isolation.
    // Let's validate the tenant if tenantId is found or provided.
    if (tenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId, deletedAt: null },
      });

      if (!tenant) {
        throw new UnauthorizedException('Invalid Tenant ID');
      }

      if (tenant.status !== 'ACTIVE') {
        throw new ForbiddenException('Tenant account is suspended');
      }

      // Enter the AsyncLocalStorage context
      tenantLocalStorage.run({ tenantId: tenant.id }, () => {
        next();
      });
    } else {
      // No tenant identified, proceed (guards will block if required)
      next();
    }
  }
}
