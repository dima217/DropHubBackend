import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { UsersService } from '@application/user/services/user.service';
import { UserPayload } from '@application/user/types';
import { JwtPayload } from '../types';
import { USocket } from 'src/types/socket';

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const client = context.switchToWs().getClient<USocket>();

    const token = client.handshake.auth.token?.split(' ')[1];

    if (!token) {
      throw new WsException('Unauthorized: No token provided');
    }

    this.logger.warn(`Token: ${token}`);

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);

      return this.validateUser(payload.id, client);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      throw new WsException('Unauthorized: Invalid or expired token');
    }
  }

  async validateUser(userId: number, client: USocket): Promise<boolean> {
    //this.logger.warn(userId);

    const user = await this.usersService.getUserById(userId);

    //this.logger.warn(user);

    if (!user || user.isBanned) {
      client.disconnect(true);
      return false;
    }

    client.user = { id: user.id, role: user.role, profileId: user.profileId } as UserPayload;
    return true;
  }
}
