import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { tenantLocalStorage } from '../../tenant/tenant.storage';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const result = (await super.canActivate(context)) as boolean;
    if (result) {
      const request = context.switchToHttp().getRequest();
      const user = request.user;
      if (user && user.tenantId) {
        // Enforce setting the tenant and user context in AsyncLocalStorage
        tenantLocalStorage.enterWith({
          tenantId: user.tenantId,
          userId: user.userId,
        });
      }
    }
    return result;
  }
}
