import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import type { ErrorCode } from "@market/contracts";
import { z } from "zod";
export class AppError extends HttpException {
  constructor(
    status: number,
    code: ErrorCode,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(
      { code, message: code, ...(fieldErrors ? { fieldErrors } : {}) },
      status,
    );
  }
}
export function parse<T extends z.ZodType>(
  schema: T,
  value: unknown,
): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const fields: Record<string, string[]> = {};
    for (const x of result.error.issues) {
      const name = x.path.join(".") || "_form";
      (fields[name] ??= []).push(x.code);
    }
    throw new AppError(400, "VALIDATION_ERROR", fields);
  }
  return result.data;
}
@Catch()
export class ErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp(),
      res = ctx.getResponse<Response>(),
      req = ctx.getRequest<Request>();
    const known = error instanceof HttpException;
    const dbCode =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "";
    const conflict = ["P2002", "P2003", "P2034"].includes(dbCode);
    const status = known ? error.getStatus() : conflict ? 409 : 500;
    const code: ErrorCode = conflict
      ? "CONFLICT"
      : ((
          {
            400: "VALIDATION_ERROR",
            401: "UNAUTHENTICATED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            413: "UPLOAD_TOO_LARGE",
            429: "RATE_LIMITED",
            503: "SERVICE_UNAVAILABLE",
          } as Record<number, ErrorCode>
        )[status] ?? "INTERNAL_ERROR");
    const body =
      error instanceof AppError ? error.getResponse() : { code, message: code };
    if (status >= 500)
      process.stderr.write(
        JSON.stringify({
          level: "error",
          requestId: req.requestId,
          event: "request.failed",
          errorType:
            error instanceof Error ? error.constructor.name : "unknown",
        }) + "\n",
      );
    if (res.headersSent) {
      res.end();
      return;
    }
    res.status(status).json({
      ...(typeof body === "object"
        ? body
        : { code: "INTERNAL_ERROR", message: "INTERNAL_ERROR" }),
      requestId: req.requestId,
    });
  }
}
