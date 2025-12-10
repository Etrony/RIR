const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const CHILDREN_FILE = path.join(__dirname, 'children.json');

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.glb': 'model/gltf-binary'
};

// Helper function to read children data
function readChildren() {
    try {
        const data = fs.readFileSync(CHILDREN_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// Helper function to write children data
function writeChildren(data) {
    fs.writeFileSync(CHILDREN_FILE, JSON.stringify(data, null, 2));
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API Routes
    if (pathname === '/api/children' && req.method === 'GET') {
        // Get all children
        const children = readChildren();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(children));
        return;
    }

    if (pathname === '/api/children' && req.method === 'POST') {
        // Add new child
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const newChild = JSON.parse(body);
                const children = readChildren();
                
                // Generate new ID
                const maxId = children.length > 0 ? Math.max(...children.map(c => c.id)) : 0;
                newChild.id = maxId + 1;
                newChild.reserved = false;
                
                children.push(newChild);
                writeChildren(children);
                
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(newChild));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    if (pathname.startsWith('/api/children/') && req.method === 'PUT') {
        // Update child (partial update supported)
        const id = parseInt(pathname.split('/')[3]);
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const update = JSON.parse(body);
                const children = readChildren();
                const child = children.find(c => c.id === id);
                if (!child) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Child not found' }));
                    return;
                }

                // Apply only provided fields
                Object.keys(update).forEach(key => {
                    child[key] = update[key];
                });

                writeChildren(children);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(child));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    if (pathname.startsWith('/api/children/') && req.method === 'DELETE') {
        // Delete child
        const id = parseInt(pathname.split('/')[3]);
        const children = readChildren();
        const filteredChildren = children.filter(c => c.id !== id);
        
        writeChildren(filteredChildren);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
    }

    if (pathname === '/api/reserve' && req.method === 'POST') {

        // Reserve a child with simple file-based locking to avoid race conditions
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            const lockPath = CHILDREN_FILE + '.lock';

            // Helper to acquire lock (tries for up to 2s)
            const acquireLock = () => new Promise((resolve, reject) => {
                const start = Date.now();
                const tryCreate = () => {
                    fs.open(lockPath, 'wx', (err, fd) => {
                        if (!err) {
                            // lock file created
                            fs.close(fd, () => {});
                            return resolve();
                        }
                        if (err.code === 'EEXIST') {
                            if (Date.now() - start > 10000) return reject(new Error('LockTimeout'));
                            return setTimeout(tryCreate, 50);
                        }
                        return reject(err);
                    });
                };
                tryCreate();
            });

            try {
                let reservation;
                try {
                    reservation = JSON.parse(body);
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid JSON' }));
                    return;
                }

                await acquireLock();

                try {
                    const children = readChildren();
                    const child = children.find(c => c.id === reservation.childId);

                    if (!child) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Child not found' }));
                        return;
                    }

                    if (child.reserved) {
                        res.writeHead(409, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Child already reserved' }));
                        return;
                    }

                    // mark as reserved
                    child.reserved = true;
                    child.reserver = reservation.reserver;
                    writeChildren(children);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } finally {
                    // release lock
                    fs.unlink(lockPath, () => {});
                }
            } catch (err) {
                if (err && err.message === 'LockTimeout') {
                    res.writeHead(423, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Resource busy, try again' }));
                } else {
                    console.error('Reservation error:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Server error' }));
                }
            }
        });
        return;
    }

    // Serve static files
    let filePath = '.' + pathname;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

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
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('Press Ctrl+C to stop the server');
});
