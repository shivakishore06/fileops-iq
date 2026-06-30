import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secret-key-fileops-iq-2026-06-29',
    });
  }

  async validate(payload: any) {
    // Check if user is still active in database
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, deletedAt: null },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is inactive or deleted');
    }

    // Flatten permissions list
    const permissions = user.userRoles.flatMap(ur =>
      ur.role.rolePermissions.map(rp => rp.permission.action)
    );

    return {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.userRoles.map(ur => ur.role.name),
      permissions,
    };
  }
}
