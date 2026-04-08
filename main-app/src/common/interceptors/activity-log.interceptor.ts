import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ActionLogService } from 'src/modules/user/services/action-log.service';
import type { Request, Response } from 'express';

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  constructor(private readonly actionLogService: ActionLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: { id?: number; role?: string } }>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.writeLog(request, response.statusCode, Date.now() - startedAt);
        },
        error: (error: { status?: number }) => {
          this.writeLog(request, error?.status ?? 500, Date.now() - startedAt);
        },
      }),
    );
  }

  private writeLog(
    request: Request & { user?: { id?: number; role?: string } },
    statusCode: number,
    durationMs: number,
  ) {
    const userId = request.user?.id ?? null;
    const userRole = request.user?.role ?? null;
    const query = this.sanitizeObject(request.query as Record<string, unknown>);
    const body = this.sanitizeObject(request.body as Record<string, unknown>);

    void this.actionLogService.logHttpAction({
      userId,
      userRole,
      method: request.method,
      path: request.path,
      statusCode,
      durationMs,
      ip: request.ip ?? null,
      userAgent: request.headers['user-agent'] ?? null,
      query,
      body,
    });
  }

  private sanitizeObject(value?: Record<string, unknown>): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const blocked = new Set(['password', 'refreshToken', 'token', 'accessToken']);
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = blocked.has(key) ? '[REDACTED]' : val;
    }
    return result;
  }
}
