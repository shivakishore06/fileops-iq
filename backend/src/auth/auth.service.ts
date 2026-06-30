import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { tenantLocalStorage } from '../tenant/tenant.storage';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async registerTenant(dto: {
    tenantName: string;
    domain: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
  }) {
    // 1. Validate if tenant domain is taken
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { domain: dto.domain },
    });
    if (existingTenant) {
      throw new ConflictException('Tenant domain already exists');
    }

    // 2. Validate if user email is taken
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('User email already exists');
    }

    // 3. Create Tenant and User inside transaction
    const passwordHash = await bcrypt.hash(dto.passwordHash, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      // Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
          domain: dto.domain,
          status: 'ACTIVE',
        },
      });

      // Seed/find global roles (ADMIN, OPERATOR, VIEWER)
      const rolesToSeed = ['ADMIN', 'OPERATOR', 'VIEWER'];
      const rolesMap: Record<string, any> = {};

      for (const roleName of rolesToSeed) {
        let role = await tx.role.findUnique({ where: { name: roleName } });
        if (!role) {
          role = await tx.role.create({
            data: {
              name: roleName,
              description: `${roleName} role`,
            },
          });
        }
        rolesMap[roleName] = role;
      }

      // Seed/find permissions for basic connections, files, sla
      const permissionsToSeed = [
        { action: 'connection:create', desc: 'Create connection' },
        { action: 'connection:read', desc: 'Read connection' },
        { action: 'connection:write', desc: 'Update/Delete connection' },
        { action: 'file:read', desc: 'Read files and events' },
        { action: 'file:download', desc: 'Download files' },
        { action: 'sla:read', desc: 'Read SLA policies' },
        { action: 'sla:write', desc: 'Write SLA policies' },
        { action: 'alert:read', desc: 'Read alerts' },
        { action: 'alert:write', desc: 'Acknowledge alerts' },
      ];

      for (const p of permissionsToSeed) {
        let perm = await tx.permission.findUnique({ where: { action: p.action } });
        if (!perm) {
          perm = await tx.permission.create({
            data: {
              action: p.action,
              description: p.desc,
            },
          });
        }

        // Link all permissions to ADMIN role if not linked
        const existingLink = await tx.rolePermission.findUnique({
          where: {
            roleId_permissionId: {
              roleId: rolesMap['ADMIN'].id,
              permissionId: perm.id,
            },
          },
        });

        if (!existingLink) {
          await tx.rolePermission.create({
            data: {
              roleId: rolesMap['ADMIN'].id,
              permissionId: perm.id,
            },
          });
        }
      }

      // Create User inside Tenant context
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          status: 'ACTIVE',
        },
      });

      // Bind User to ADMIN role
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: rolesMap['ADMIN'].id,
        },
      });

      return { tenant, user };
    });

    return this.generateTokens({
      sub: result.user.id,
      email: result.user.email,
      tenantId: result.tenant.id,
    });
  }

  async login(dto: { email: string; passwordHash: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email, deletedAt: null },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.passwordHash, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens({
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
    });
  }

  private generateTokens(payload: { sub: string; email: string; tenantId: string }) {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') || '1h') as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d') as any,
    });

    return {
      accessToken,
      refreshToken,
      tenantId: payload.tenantId,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      return this.generateTokens({
        sub: payload.sub,
        email: payload.email,
        tenantId: payload.tenantId,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
