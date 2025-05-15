import fs from 'fs';
import path from 'path';

export function serveWorker(req, res, next) {
  if (req.url.endsWith('.worker.js')) {
    const filePath = path.join(process.cwd(), 'public', req.url);
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/javascript');
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }
  next();
}
