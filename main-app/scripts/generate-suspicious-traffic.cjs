/**
 * Generates HTTP activity for a user JWT so admin statistics show suspicious signals.
 *
 * Signals covered via HTTP:
 *   agents, paths, forbidden, burst
 *
 * auth_errors and multi_ip require userId on 401 logs — use seed-suspicious-action-logs.cjs
 *
 * Usage:
 *   node scripts/generate-suspicious-traffic.cjs --token "<JWT>"
 *   node scripts/generate-suspicious-traffic.cjs --email user@example.com --password secret
 *   node scripts/generate-suspicious-traffic.cjs --token "<JWT>" --base https://your-app.up.railway.app
 *   node scripts/generate-suspicious-traffic.cjs --token "<JWT>" --phases agents,paths,forbidden,burst
 */

const AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'python-requests/2.28.0',
  'curl/7.88.1',
  'Go-http-client/1.1',
  'Scrapy/2.8.0 (+https://scrapy.org)',
];

const PATH_ENDPOINTS = [
  { method: 'GET', path: '/storage' },
  { method: 'GET', path: '/users/1' },
  { method: 'GET', path: '/users/2' },
  { method: 'GET', path: '/users/3' },
  { method: 'GET', path: '/users/4' },
  { method: 'GET', path: '/users/5' },
  { method: 'POST', path: '/storage/structure', body: { storageId: '00000000-0000-0000-0000-000000000001' } },
  { method: 'POST', path: '/storage/trash', body: { storageId: '00000000-0000-0000-0000-000000000001' } },
  { method: 'POST', path: '/storage/delete-item', body: {} },
  { method: 'POST', path: '/storage/move-item', body: {} },
  { method: 'POST', path: '/storage/rename-item', body: {} },
  { method: 'POST', path: '/storage/copy-item', body: {} },
  { method: 'POST', path: '/storage/restore-item', body: {} },
  { method: 'POST', path: '/storage/create-item', body: {} },
  { method: 'POST', path: '/storage/full-tree', body: {} },
  { method: 'POST', path: '/storage/items-by-parent', body: {} },
  { method: 'POST', path: '/storage/search', body: { query: 'test' } },
  { method: 'GET', path: '/favorites' },
  { method: 'GET', path: '/notifications' },
  { method: 'GET', path: '/support' },
  { method: 'POST', path: '/rooms/list', body: {} },
  { method: 'POST', path: '/search', body: { query: 'x' } },
  { method: 'GET', path: '/relationships/friends' },
  { method: 'GET', path: '/relationships/requests/incoming' },
  { method: 'GET', path: '/relationships/requests/outgoing' },
  { method: 'POST', path: '/storage/shared-with-me', body: {} },
  { method: 'POST', path: '/storage/shared-by-me', body: {} },
  { method: 'POST', path: '/storage/permissions', body: { storageId: '00000000-0000-0000-0000-000000000001' } },
  { method: 'POST', path: '/storage/item-metadata', body: {} },
  { method: 'POST', path: '/storage/breadcrumb', body: {} },
];

const FORBIDDEN_TARGETS = [
  { method: 'GET', path: '/users/admin/statistics' },
  { method: 'GET', path: '/users/admin/list' },
  { method: 'GET', path: '/storage/admin/deleted-structure' },
  { method: 'POST', path: '/storage/structure', body: { storageId: 'ffffffff-ffff-ffff-ffff-ffffffffffff' } },
  { method: 'POST', path: '/storage/structure', body: { storageId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' } },
  { method: 'POST', path: '/storage/structure', body: { storageId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' } },
];

function parseArgs(argv) {
  const out = {
    base: process.env.BASE_URL || 'http://localhost:3000',
    token: process.env.TOKEN || '',
    email: process.env.EMAIL || '',
    password: process.env.PASSWORD || '',
    phases: (process.env.PHASES || 'agents,paths,forbidden,burst').split(',').map((p) => p.trim().toLowerCase()),
    burstSize: Number(process.env.BURST_SIZE || 35),
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--base' && argv[i + 1]) out.base = argv[++i].replace(/\/$/, '');
    else if (arg === '--token' && argv[i + 1]) out.token = argv[++i];
    else if (arg === '--email' && argv[i + 1]) out.email = argv[++i];
    else if (arg === '--password' && argv[i + 1]) out.password = argv[++i];
    else if (arg === '--phases' && argv[i + 1]) {
      out.phases = argv[++i].split(',').map((p) => p.trim().toLowerCase());
    } else if (arg === '--burst-size' && argv[i + 1]) out.burstSize = Number(argv[++i]);
    else if (arg === '--help' || arg === '-h') out.help = true;
  }

  return out;
}

function printHelp() {
  console.log(`Usage:
  node scripts/generate-suspicious-traffic.cjs --token "<JWT>"
  node scripts/generate-suspicious-traffic.cjs --email user@example.com --password secret
  node scripts/generate-suspicious-traffic.cjs --token "<JWT>" --base http://localhost:3000
  node scripts/generate-suspicious-traffic.cjs --token "<JWT>" --phases agents,paths,forbidden,burst

Phases: agents, paths, forbidden, burst
For auth_errors / multi_ip also run: node scripts/seed-suspicious-action-logs.cjs --email ...`);
}

async function login(base, email, password) {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Login failed (${res.status}): ${JSON.stringify(data)}`);
  }
  if (!data.accessToken) {
    throw new Error('Login response has no accessToken');
  }
  return data.accessToken;
}

async function request(base, token, { method = 'GET', path, body = undefined, userAgent = undefined }) {
  const headers = { Authorization: `Bearer ${token}` };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (userAgent) {
    headers['User-Agent'] = userAgent;
  }

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return res.status;
}

async function runPhase(name, fn) {
  console.log(`\n=== PHASE: ${name} ===`);
  await fn();
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  let token = args.token;
  if (!token) {
    if (!args.email || !args.password) {
      printHelp();
      process.exit(1);
    }
    token = await login(args.base, args.email, args.password);
    console.log(`Logged in as ${args.email}`);
  }

  const phases = new Set(args.phases);

  if (phases.has('agents')) {
    await runPhase('agent rotation (5 User-Agents)', async () => {
      for (let i = 0; i < AGENTS.length; i++) {
        const ep = PATH_ENDPOINTS[i % PATH_ENDPOINTS.length];
        const code = await request(args.base, token, {
          method: ep.method,
          path: ep.path,
          body: ep.body,
          userAgent: AGENTS[i],
        });
        console.log(`  [${AGENTS[i].slice(0, 24)}...] ${ep.method} ${ep.path} -> ${code}`);
      }
    });
  }

  if (phases.has('paths')) {
    await runPhase(`path enumeration (${PATH_ENDPOINTS.length} unique endpoints)`, async () => {
      for (const ep of PATH_ENDPOINTS) {
        const code = await request(args.base, token, ep);
        console.log(`  ${ep.method} ${ep.path} -> ${code}`);
      }
    });
  }

  if (phases.has('forbidden')) {
    await runPhase('forbidden probing (admin + alien resources)', async () => {
      for (const ep of FORBIDDEN_TARGETS) {
        const code = await request(args.base, token, ep);
        console.log(`  ${ep.method} ${ep.path} -> ${code}`);
      }
    });
  }

  if (phases.has('burst')) {
    await runPhase(`request burst (${args.burstSize} parallel)`, async () => {
      const started = Date.now();
      const results = await Promise.all(
        Array.from({ length: args.burstSize }, () => request(args.base, token, { path: '/storage' })),
      );
      const elapsed = ((Date.now() - started) / 1000).toFixed(2);
      const counts = results.reduce((acc, code) => {
        acc[code] = (acc[code] || 0) + 1;
        return acc;
      }, {});
      console.log(`  ${args.burstSize} requests in ${elapsed}s`);
      for (const [code, count] of Object.entries(counts)) {
        console.log(`  HTTP ${code}: ${count}`);
      }
    });
  }

  console.log('\n=== Done ===');
  console.log(`Check: GET ${args.base}/users/admin/statistics?days=1&top=20`);
  console.log('For auth_errors / multi_ip run seed-suspicious-action-logs.cjs');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
