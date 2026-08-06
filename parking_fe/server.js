import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceDir = fileURLToPath(new URL('.', import.meta.url));
const distDir = resolve(sourceDir, 'dist');
const rootDir = existsSync(distDir) ? distDir : sourceDir;
const backendUrl = new URL(process.env.BACKEND_URL || 'http://127.0.0.1:8080');
const preferredPort = Number(process.env.PORT || 5173);
const host = process.env.HOST || '127.0.0.1';
const defaultMapCenter = {
  lat: Number(process.env.DEFAULT_MAP_LAT || 21.0278),
  lng: Number(process.env.DEFAULT_MAP_LNG || 105.8342),
};

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
};

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    ...headers,
  });
  response.end(body);
}

function serveStatic(request, response) {
  const requestUrl = new URL(request.url, 'http://localhost');
  const pathname = decodeURIComponent(requestUrl.pathname);
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = normalize(join(rootDir, requestedPath));
  const resolvedPath = resolve(filePath);

  if (!resolvedPath.startsWith(resolve(rootDir))) {
    send(response, 403, 'Forbidden');
    return;
  }

  if (!existsSync(resolvedPath) || !statSync(resolvedPath).isFile()) {
    const fallbackPath = resolve(rootDir, 'index.html');
    if (existsSync(fallbackPath)) {
      response.writeHead(200, {
        'Content-Type': contentTypes['.html'],
      });
      createReadStream(fallbackPath).pipe(response);
      return;
    }

    send(response, 404, 'Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': contentTypes[extname(resolvedPath)] || 'application/octet-stream',
  });
  createReadStream(resolvedPath).pipe(response);
}

function serveClientConfig(response) {
  const config = {
    defaultMapCenter,
    defaultMapZoom: Number(process.env.DEFAULT_MAP_ZOOM || 13),
  };

  send(response, 200, `window.PARKING_CONFIG = ${JSON.stringify(config)};`, {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/javascript; charset=utf-8',
  });
}

function proxyToBackend(clientRequest, clientResponse) {
  const target = new URL(clientRequest.url, backendUrl);
  const transport = target.protocol === 'https:' ? httpsRequest : httpRequest;

  const proxyRequest = transport(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port,
      path: `${target.pathname}${target.search}`,
      method: clientRequest.method,
      headers: {
        ...clientRequest.headers,
        host: backendUrl.host,
      },
    },
    (proxyResponse) => {
      clientResponse.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
      proxyResponse.pipe(clientResponse);
    },
  );

  proxyRequest.on('error', () => {
    send(
      clientResponse,
      502,
      JSON.stringify({
        success: false,
        error: 'Backend is unavailable',
      }),
      { 'Content-Type': 'application/json; charset=utf-8' },
    );
  });

  clientRequest.pipe(proxyRequest);
}

const server = createServer((request, response) => {
  if (request.url === '/config.js') {
    serveClientConfig(response);
    return;
  }

  if (request.url?.startsWith('/api/')) {
    proxyToBackend(request, response);
    return;
  }

  serveStatic(request, response);
});

function listen(port) {
  server.listen(port, host);
  server.once('listening', () => {
    console.log(`Parking FE: http://${host}:${port}`);
    console.log(`Proxying API to ${backendUrl.origin}`);
  });
  server.once('error', (error) => {
    if ((error.code === 'EADDRINUSE' || error.code === 'EACCES' || error.code === 'EPERM') && port < 5199) {
      listen(port + 1);
      return;
    }

    throw error;
  });
}

listen(preferredPort);
