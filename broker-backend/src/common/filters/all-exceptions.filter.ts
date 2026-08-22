import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

/**
 * Catches everything (NestJS HttpExceptions AND raw errors — DB
 * connection failures, unexpected bugs, etc.) so the API always
 * responds with the same JSON shape: { statusCode, message, error }.
 *
 * Two things this fixes that the default behavior didn't guarantee:
 *  1. Unhandled non-HTTP errors (e.g. a Postgres error bubbling up)
 *     could otherwise leak internal messages/stack traces to the
 *     client — here they're logged server-side but the client only
 *     ever sees a generic "Something went wrong" for 500s.
 *  2. The frontend can rely on one consistent error shape everywhere
 *     instead of branching on different error formats per endpoint.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const body = isHttpException ? exception.getResponse() : null;
    const message =
      body && typeof body === 'object' && 'message' in body
        ? (body as any).message
        : isHttpException
          ? exception.message
          : 'Something went wrong. Please try again.';

    if (!isHttpException || status >= 500) {
      // Full detail goes to the server logs only.
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: isHttpException ? exception.name : 'InternalServerError',
      timestamp: new Date().toISOString(),
    });
  }
}
