const { execSync } = require('child_process');

const port = process.argv[2] || '3000';

function getPidsOnPort(p) {
  try {
    const out = execSync(`netstat -ano | findstr ":${p}"`, { encoding: 'utf8' });
    const pids = new Set();
    out.split('\n').forEach((line) => {
      if (!line.includes('LISTENING')) return;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') pids.add(pid);
    });
    return [...pids];
  } catch {
    return [];
  }
}

const pids = getPidsOnPort(port);
if (pids.length === 0) {
  console.log(`Port ${port} is free.`);
  process.exit(0);
}

pids.forEach((pid) => {
  try {
    execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    console.log(`Stopped old process on port ${port} (PID ${pid})`);
  } catch {
    console.warn(`Could not stop PID ${pid} on port ${port}`);
  }
});
