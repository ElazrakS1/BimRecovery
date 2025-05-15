import fs from 'fs';
import path from 'path';

export function wasmMiddleware(req, res, next) {
  if (req.url.endsWith('.wasm') || req.url.includes('worker.js')) {
    const filePath = path.join(__dirname, '../../public', req.url);
    if (fs.existsSync(filePath)) {
      const contentType = req.url.endsWith('.wasm') 
        ? 'application/wasm'
        : 'application/javascript';
      res.setHeader('Content-Type', contentType);
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }
  next();
}
