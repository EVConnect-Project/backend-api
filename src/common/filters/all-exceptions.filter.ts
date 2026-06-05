import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error?: string;
  requestId?: string;
  timestamp: string;
  path: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let safeMessage: string | string[] = "Internal server error";
    let errorName: string | undefined;

    if (isHttpException) {
      const body = exception.getResponse();
      if (typeof body === "string") {
        safeMessage = body;
      } else if (typeof body === "object" && body !== null) {
        const bodyObj = body as Record<string, unknown>;
        const msg = bodyObj.message;
        if (typeof msg === "string" || Array.isArray(msg)) {
          safeMessage = msg as string | string[];
        }
        const err = bodyObj.error;
        if (typeof err === "string") {
          errorName = err;
        }
      } else {
        safeMessage = exception.message;
      }
    }

    const payload: ErrorResponseBody = {
      statusCode: status,
      message: safeMessage,
      ...(errorName ? { error: errorName } : {}),
      ...(request.requestId ? { requestId: request.requestId } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log server-side with stack and request context. Client never sees the stack.
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.requestId ?? "no-rid"}] ${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (status >= HttpStatus.BAD_REQUEST) {
      this.logger.warn(
        `[${request.requestId ?? "no-rid"}] ${request.method} ${request.url} -> ${status}: ${JSON.stringify(safeMessage)}`,
      );
    }

    response.status(status).json(payload);
  }
}
