const http = require('http');
const next = require('next');
const { spawn } = require('child_process');

function parseArgs(argv) {
  const args = { port: process.env.PORT, dev: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dev') args.dev = true;
    else if (a === '--prod') args.dev = false;
    else if (a === '--port' || a === '-p') {
      args.port = argv[i + 1];
      i++;
    } else if (!args.port && /^\d+$/.test(a)) {
      args.port = a;
    }
  }
  return args;
}

const { port, dev } = parseArgs(process.argv);
const listenPort = Number(port) || 3000;

function startServer(isDev) {
  const app = next({ dev: isDev });
  const handle = app.getRequestHandler();
  app.prepare().then(() => {
    const server = http.createServer((req, res) => {
      const url = req.url || '/';
      if (url.startsWith('/api/')) {
        handle(req, res);
        return;
      }
      res.statusCode = 404;
      res.end('Not Found');
    });
    server.listen(listenPort, '0.0.0.0');
  });
}

if (dev) {
  startServer(true);
} else {
  const fs = require('fs');
  const hasBuild = fs.existsSync('.next/BUILD_ID');
  if (!hasBuild) {
    const build = spawn('yarn', ['build'], { stdio: 'inherit', env: process.env });
    build.on('exit', (code) => {
      if (code === 0) startServer(false);
      else process.exit(code ?? 1);
    });
  } else {
    startServer(false);
  }
}

