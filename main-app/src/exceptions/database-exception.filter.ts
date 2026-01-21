import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Response } from 'express';

// Postgres Error Codes:
// 23505: unique_violation
// 23502: not_null_violation

/**
 * Interface reflecting the specific Postgres/TypeORM error properties.
 */
interface TypeOrmPostgresError extends QueryFailedError {
  /** The Postgres error code (e.g., '23505' for UNIQUE violation). */
  code?: string;
  /** Detailed information about the error, often including conflicting values. */
  detail?: string;
}

@Catch(QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const error: TypeOrmPostgresError = exception;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'A database error occurred.';

    if (error.code === '23505') {
      status = HttpStatus.CONFLICT;
      const detail = error.detail || error.message;

      const match = detail.match(/Key \((.*?)\)=\((.*?)\) already exists/);
      let conflictInfo = 'Record already exists';

      if (match) {
        conflictInfo = `Field ${match[1]} with value "${match[2]}"`;
      }

      message = `Uniqueness violation: ${conflictInfo}.`;
    } else if (error.code === '23502') {
      status = HttpStatus.BAD_REQUEST;
      const columnMatch = error.message.match(/"(.*?)"/);
      const column = columnMatch ? columnMatch[1] : 'unknown field';
      message = `Data error: Required field "${column}" cannot be empty.`;
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
    });
  }
}
