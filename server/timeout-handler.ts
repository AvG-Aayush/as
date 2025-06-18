import { Request, Response, NextFunction } from 'express';

// Simple async handler without timeout constraints
export function asyncHandler(handler: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (error: any) {
      console.error(`[ERROR] ${req.method} ${req.path} failed:`, error.message);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: 'An unexpected error occurred.' 
      });
    }
  };
}