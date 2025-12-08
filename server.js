const http = require('http');
const url = require('url');
const path = require('path');

// Supabase настройки (замените на ваши!)
const SUPABASE_URL = 'https://ВАШ_ПРОЕКТ.supabase.co';
const SUPABASE_KEY = 'ВАШ_ANON_PUBLIC_KEY';

// Используем встроенный fetch (Node.js 18+)
// Если у вас Node <18 — раскомментируйте:
// const fetch = require('node-fetch');

const PORT = process.env.PORT || 3000;

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

// Вспомогательная функция для запросов к Supabase
async function supabaseFetch(endpoint, options = {}) {
    const fullUrl = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        ...options.headers
    };
    const res = await fetch(fullUrl, { ...options, headers });
    if (!res.ok) {
        const text = await res.text();
        console.error('Supabase error:', text);
        throw new Error(`Supabase ${res.status}: ${text}`);
    }
    return res.json();
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API: получить всех детей
    if (pathname === '/api/children' && req.method === 'GET') {
        try {
            const data = await supabaseFetch('children?order=id.asc');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        } catch (e) {
            console.error('GET /api/children error:', e);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to fetch children' }));
        }
        return;
    }

    // API: зарезервировать подарок
    if (pathname === '/api/reserve' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                const { childId, reserver } = JSON.parse(body);
                if (!childId || !reserver) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing childId or reserver' }));
                    return;
                }

                const updates = { reserved: true, reserver };
                const result = await supabaseFetch(`children?id=eq.${childId}`, {
                    method: 'PATCH',
                    body: JSON.stringify(updates)
                });

                if (result.length === 0) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Child not found' }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                }
            } catch (e) {
                console.error('Reserve error:', e);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Reserve failed' }));
            }
        });
        return;
    }

    // Статические файлы
    let filePath = '.' + pathname;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    const fs = require('fs');
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Server error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
