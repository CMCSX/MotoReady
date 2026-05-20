import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = 8000;
const HOSTNAME = 'localhost';

const server = http.createServer((req, res) => {
    // Strip query string before resolving file path
    const urlPath = req.url.split('?')[0];

    let filePath = path.join(__dirname, urlPath);
    if (urlPath === '/') {
        filePath = path.join(__dirname, 'index.html');
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js':   'text/javascript',
        '.css':  'text/css',
        '.json': 'application/json',
        '.png':  'image/png',
        '.jpg':  'image/jpeg',
        '.gif':  'image/gif',
        '.svg':  'image/svg+xml',
        '.wav':  'audio/wav',
        '.mp4':  'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf':  'application/font-ttf',
        '.eot':  'application/vnd.ms-fontobject',
        '.otf':  'application/font-otf',
        '.wasm': 'application/wasm'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    // Disable caching for local app files so updates are always picked up
    const noCache = ['.html', '.js', '.css'].includes(extname);

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
            }
        } else {
            const headers = {
                'Content-Type': contentType,
                'Service-Worker-Allowed': '/'
            };
            if (noCache) {
                headers['Cache-Control'] = 'no-store, no-cache, must-revalidate';
                headers['Pragma'] = 'no-cache';
            }
            res.writeHead(200, headers);
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, HOSTNAME, () => {
    console.log(`🏍️  MotoReady PWA Server`);
    console.log(`✅ Server running at http://${HOSTNAME}:${PORT}/`);
    console.log(`📱 Open in browser and check weather, parking, and map features`);
    console.log(`🔐 Press Ctrl+C to stop server`);
});
