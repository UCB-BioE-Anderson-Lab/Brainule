import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Express 4 does not forward rejected promises from async handlers to the
 * error middleware — the request hangs until the client times out. Wrapping
 * every async handler routes failures into `next()` so they land on the JSON
 * error handler in app.ts.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
