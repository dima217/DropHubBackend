/**
 * Seeds action_log rows for a user to trigger all suspiciousTraffic signals in admin statistics.
 * Useful when HTTP-only traffic cannot attach auth_errors (401 without userId) or multi_ip.
 *
 * Usage:
 *   node scripts/seed-suspicious-action-logs.cjs --email user@example.com
 *   node scripts/seed-suspicious-action-logs.cjs --user-id 57
 *   node scripts/seed-suspicious-action-logs.cjs --email admin@drophub.app --dry-run
 */

const { Client } = require('pg');
const { loadMainAppEnv, resolvePgConfig } = require('./_load-env.cjs');

const AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'python-requests/2.31.0',
  'curl/8.4.0',
  'Go-http-client/2.0',
  'PostmanRuntime/7.36.0',
];

const IPS = ['203.0.113.10', '203.0.113.11', '203.0.113.12', '198.51.100.44'];

const UNIQUE_PATHS = [
  ['GET', '/storage'],
  ['GET', '/users/1'],
  ['GET', '/users/2'],
  ['GET', '/users/3'],
  ['GET', '/users/4'],
  ['GET', '/users/5'],
  ['GET', '/users/6'],
  ['GET', '/users/7'],
  ['GET', '/users/8'],
  ['GET', '/users/9'],
  ['GET', '/users/10'],
  ['GET', '/users/11'],
  ['GET', '/favorites'],
  ['GET', '/notifications'],
  ['GET', '/support'],
  ['GET', '/relationships/friends'],
  ['GET', '/relationships/requests/incoming'],
  ['GET', '/relationships/requests/outgoing'],
  ['POST', '/storage/structure'],
  ['POST', '/storage/trash'],
  ['POST', '/storage/delete-item'],
  ['POST', '/storage/move-item'],
  ['POST', '/storage/rename-item'],
  ['POST', '/storage/copy-item'],
  ['POST', '/storage/restore-item'],
  ['POST', '/storage/create-item'],
  ['POST', '/storage/full-tree'],
  ['POST', '/storage/search'],
  ['POST', '/rooms/list'],
  ['POST', '/search'],
  ['GET', '/users/admin/statistics'],
  ['GET', '/users/admin/list'],
];

function parseArgs(argv) {
  const out = {
    email: process.env.USER_EMAIL || '',
    userId: process.env.USER_ID ? Number(process.env.USER_ID) : null,
    dryRun: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--email' && argv[i + 1]) out.email = argv[++i];
    else if (arg === '--user-id' && argv[i + 1]) out.userId = Number(argv[++i]);
    else if (arg === '--dry-run') out.dryRun = true;
    else if (arg === '--help' || arg === '-h') out.help = true;
  }

  return out;
}

function printHelp() {
  console.log(`Usage:
  node scripts/seed-suspicious-action-logs.cjs --email user@example.com
  node scripts/seed-suspicious-action-logs.cjs --user-id 57
  node scripts/seed-suspicious-action-logs.cjs --email user@example.com --dry-run`);
}

async function resolveActionLogTable(client) {
  const result = await client.query(
    `SELECT tablename
     FROM pg_tables
     WHERE schemaname = 'public'
       AND tablename IN ('action_log', 'actionlog')`,
  );
  if (result.rows.length === 0) {
    throw new Error('action_log table not found. Start main-app once so TypeORM creates it.');
  }
  return result.rows[0].tablename;
}

function buildLogs(userId, userRole) {
  const now = Date.now();
  const logs = [];

  const push = (offsetMs, entry) => {
    logs.push({
      userId,
      userRole,
      durationMs: 20 + Math.floor(Math.random() * 80),
      query: null,
      body: null,
      createdAt: new Date(now - offsetMs),
      ...entry,
    });
  };

  // auth_errors: 12× 401 (needs userId — only achievable via seed)
  for (let i = 0; i < 12; i++) {
    push(i * 1000, {
      method: 'GET',
      path: '/storage',
      statusCode: 401,
      ip: IPS[i % IPS.length],
      userAgent: AGENTS[i % AGENTS.length],
    });
  }

  // forbidden_probing: 8× 403
  for (let i = 0; i < 8; i++) {
    push(15_000 + i * 500, {
      method: i % 2 === 0 ? 'GET' : 'POST',
      path: i % 2 === 0 ? '/users/admin/statistics' : '/storage/structure',
      statusCode: 403,
      ip: IPS[i % IPS.length],
      userAgent: AGENTS[(i + 1) % AGENTS.length],
    });
  }

  // path_enumeration: many unique 200/404 paths
  UNIQUE_PATHS.forEach(([method, path], index) => {
    push(25_000 + index * 400, {
      method,
      path,
      statusCode: index % 5 === 0 ? 403 : 404,
      ip: IPS[index % IPS.length],
      userAgent: AGENTS[index % AGENTS.length],
    });
  });

  // request_burst: 36 requests inside one minute window
  for (let i = 0; i < 36; i++) {
    push(60_000 - i * 1500, {
      method: 'GET',
      path: '/storage',
      statusCode: 200,
      ip: IPS[0],
      userAgent: AGENTS[0],
    });
  }

  return logs;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  if (!args.email && !args.userId) {
    printHelp();
    process.exit(1);
  }

  loadMainAppEnv();
  const client = new Client(resolvePgConfig());
  await client.connect();

  try {
    let userId = args.userId;
    let userRole = 'user';

    if (!userId) {
      const userResult = await client.query(
        'SELECT id, role FROM "user" WHERE email = $1 LIMIT 1',
        [args.email],
      );
      if (userResult.rows.length === 0) {
        throw new Error(`User not found: ${args.email}`);
      }
      userId = userResult.rows[0].id;
      userRole = userResult.rows[0].role;
    } else {
      const userResult = await client.query('SELECT id, role FROM "user" WHERE id = $1 LIMIT 1', [userId]);
      if (userResult.rows.length === 0) {
        throw new Error(`User not found: id=${userId}`);
      }
      userRole = userResult.rows[0].role;
    }

    const table = await resolveActionLogTable(client);
    const logs = buildLogs(userId, userRole);

    console.log(`Target userId=${userId}, role=${userRole}, table=${table}, rows=${logs.length}`);

    if (args.dryRun) {
      console.log('Dry run — no inserts.');
      console.log(
        'Sample signals expected: auth_errors, forbidden_probing, path_enumeration, request_burst, multi_ip_errors, agent_rotation',
      );
      return;
    }

    await client.query('BEGIN');
    for (const log of logs) {
      await client.query(
        `INSERT INTO "${table}"
         ("userId", "userRole", method, path, "statusCode", "durationMs", ip, "userAgent", query, body, "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          log.userId,
          log.userRole,
          log.method,
          log.path,
          log.statusCode,
          log.durationMs,
          log.ip,
          log.userAgent,
          log.query,
          log.body,
          log.createdAt,
        ],
      );
    }
    await client.query('COMMIT');

    console.log(`Inserted ${logs.length} action_log rows for userId=${userId}.`);
    console.log('Check: GET /users/admin/statistics?days=1&top=20');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Failed to seed suspicious logs:', error.message);
  process.exit(1);
});
