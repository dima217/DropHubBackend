import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class UserIpInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();

    const xForwardedFor = request.headers['x-forwarded-for'];

    const ip =
      typeof xForwardedFor === 'string'
        ? xForwardedFor.split(',')[0].trim()
        : Array.isArray(xForwardedFor)
          ? xForwardedFor[0]
          : request.ip;

    request.userIp = this.normalizeIp(ip);

    return next.handle();
  }

  private normalizeIp(ip?: string): string | undefined {
    if (!ip) return undefined;

    // ::ffff:127.0.0.1 → 127.0.0.1
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }

    return ip;
  }
}
