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
const env = { ...process.env };
if (port) env.PORT = String(port);

function run(cmd) {
  const child = spawn('yarn', cmd, { stdio: 'inherit', env });
  child.on('exit', (code) => process.exit(code ?? 0));
}

if (dev) {
  run(['dev']);
} else {
  const fs = require('fs');
  const hasBuild = fs.existsSync('.next/BUILD_ID');
  if (!hasBuild) {
    const build = spawn('yarn', ['build'], { stdio: 'inherit', env });
    build.on('exit', (code) => {
      if (code === 0) run(['start']);
      else process.exit(code ?? 1);
    });
  } else {
    run(['start']);
  }
}
