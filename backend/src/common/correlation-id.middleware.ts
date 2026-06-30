import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationIdHeader = req.header('x-correlation-id') || uuidv4();
    
    // Attach to request and response headers
    req.headers['x-correlation-id'] = correlationIdHeader;
    res.setHeader('x-correlation-id', correlationIdHeader);
    
    next();
  }
}
