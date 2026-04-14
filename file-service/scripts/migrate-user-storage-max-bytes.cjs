const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const COLLECTION = 'user_storage';
const TEN_GIB = 1024 * 1024 * 1024 * 10;


function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) {
    return out;
  }
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (!key) {
      continue;
    }
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function loadEnvFromFileServiceRoot() {
  const root = path.resolve(__dirname, '..');
  const nodeEnv = process.env.NODE_ENV || 'development';
  const base = parseEnvFile(path.join(root, '.env'));
  const envSpecific = parseEnvFile(path.join(root, `.env.${nodeEnv}`));
  const merged = { ...base, ...envSpecific };
  for (const [key, val] of Object.entries(merged)) {
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

function resolveMongoUri() {
  const direct = process.env.MONGO_URL;
  if (direct && String(direct).trim()) {
    return String(direct).trim();
  }

  const mongoHost = process.env.MONGO_HOST || 'localhost';
  const mongoPort = process.env.MONGO_PORT || '27017';
  const mongoDatabase = process.env.MONGO_DATABASE || 'file-service';
  const mongoUsername = process.env.MONGO_USERNAME;
  const mongoPassword = process.env.MONGO_PASSWORD;
  const mongoAuthSource = process.env.MONGO_AUTH_SOURCE;
  const mongoReplicaSet = process.env.MONGO_REPLICA_SET;

  let credentials = '';
  if (mongoUsername && mongoPassword) {
    credentials = `${encodeURIComponent(mongoUsername)}:${encodeURIComponent(mongoPassword)}@`;
  }

  const query = {};
  if (mongoAuthSource) {
    query.authSource = mongoAuthSource;
  }
  if (mongoReplicaSet) {
    query.replicaSet = mongoReplicaSet;
  }
  const qs = Object.keys(query)
    .map((k) => `${k}=${encodeURIComponent(query[k])}`)
    .join('&');

  return `mongodb://${credentials}${mongoHost}:${mongoPort}/${mongoDatabase}${qs ? `?${qs}` : ''}`;
}

function rewriteDockerMongoHostToLocalhost(uri) {
  if (process.env.MIGRATION_KEEP_DOCKER_MONGO_HOST === '1') {
    return uri;
  }
  if (!uri.startsWith('mongodb://')) {
    return uri;
  }
  const rewritten = uri.replace(
    /^mongodb:\/\/((?:[^@]+@)?)mongo(?=\/|:|\?)/,
    'mongodb://$1localhost',
  );
  if (rewritten !== uri) {
    console.warn(
      '[migrate] Хост "mongo" заменён на "localhost" (запуск с хоста). Внутри Docker: MIGRATION_KEEP_DOCKER_MONGO_HOST=1',
    );
  }
  return rewritten;
}

function resolveMigrationMongoUri() {
  const explicit = process.env.MIGRATION_MONGO_URL;
  if (explicit && String(explicit).trim()) {
    return rewriteDockerMongoHostToLocalhost(String(explicit).trim());
  }
  return rewriteDockerMongoHostToLocalhost(resolveMongoUri());
}

function parseArgs(argv) {
  const dryRun = argv.includes('--dry-run');
  return { dryRun };
}

function parseIntEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid integer for ${name}: ${raw}`);
  }
  return n;
}

async function main() {
  loadEnvFromFileServiceRoot();

  const mongoUrl = resolveMigrationMongoUri();
  const safeUri = mongoUrl.replace(/\/\/([^@]+)@/, (_, cred) => {
    if (!cred || !cred.includes(':')) {
      return '//***@';
    }
    return '//***:***@';
  });
  console.log('Mongo URI:', safeUri);

  const targetMaxBytes = parseIntEnv(
    'MIGRATION_TARGET_MAX_BYTES',
    parseIntEnv('STORAGE_DEFAULT_MAX_BYTES', TEN_GIB),
  );

  const legacyThreshold = parseIntEnv('MIGRATION_LEGACY_MAX_BYTES_THRESHOLD', 1024 * 1024 * 1024);

  const { dryRun } = parseArgs(process.argv.slice(2));

  const filter = {
    $or: [
      { maxBytes: { $exists: false } },
      { maxBytes: null },
      { maxBytes: { $lte: legacyThreshold } },
    ],
  };

  console.log('Configuration:');
  console.log('  collection:', COLLECTION);
  console.log('  target maxBytes:', targetMaxBytes);
  console.log('  match: maxBytes missing/null OR maxBytes <=', legacyThreshold);
  console.log('  dryRun:', dryRun);
  console.log('');

  await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 10_000, directConnection: true });
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('No database handle after connect');
  }

  const coll = db.collection(COLLECTION);

  const matched = await coll.countDocuments(filter);
  console.log('Matched documents:', matched);

  if (matched === 0) {
    console.log('Nothing to update.');
    await mongoose.disconnect();
    return;
  }

  const sample = await coll.find(filter).project({ maxBytes: 1 }).limit(5).toArray();
  console.log('Sample _id / maxBytes (up to 5):', sample.map((d) => ({ id: String(d._id), maxBytes: d.maxBytes })));

  if (dryRun) {
    console.log('\nDry run: no writes. Remove --dry-run to apply updateMany.');
    await mongoose.disconnect();
    return;
  }

  const result = await coll.updateMany(filter, { $set: { maxBytes: targetMaxBytes } });
  console.log('\nUpdate result:');
  console.log('  matchedCount:', result.matchedCount);
  console.log('  modifiedCount:', result.modifiedCount);

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
