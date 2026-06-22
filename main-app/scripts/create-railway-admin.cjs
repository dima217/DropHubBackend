const { Client } = require('pg');
const argon2 = require('argon2');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@drophub.app';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Sp88Lp2k88';
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'DropHub_Admin';

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'interchange.proxy.rlwy.net',
    port: Number(process.env.DB_PORT || 49735),
    user: process.env.DB_USERNAME || 'myuser',
    password: process.env.DB_PASSWORD || 'mysecretpassword',
    database: process.env.DB_DATABASE || 'mydatabase',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  await client.connect();

  const existing = await client.query(
    'SELECT id, email, role FROM "user" WHERE email = $1 OR role = $2',
    [ADMIN_EMAIL, 'admin'],
  );

  if (existing.rows.some((row) => row.email === ADMIN_EMAIL)) {
    console.log(`Admin already exists: ${ADMIN_EMAIL} (id=${existing.rows.find((r) => r.email === ADMIN_EMAIL).id})`);
    await client.end();
    return;
  }

  const passwordHash = await argon2.hash(ADMIN_PASSWORD);

  await client.query('BEGIN');
  try {
    const profileResult = await client.query(
      'INSERT INTO profile ("firstName", "avatarUrl", "userId") VALUES ($1, NULL, NULL) RETURNING id',
      [ADMIN_FIRST_NAME],
    );
    const profileId = profileResult.rows[0].id;

    const userResult = await client.query(
      `INSERT INTO "user" (email, password, role, "isBanned", "tokenVersion", "isOAuthUser", "profileId")
       VALUES ($1, $2, 'admin', false, 0, false, $3)
       RETURNING id, uuid, email, role`,
      [ADMIN_EMAIL, passwordHash, profileId],
    );
    const userId = userResult.rows[0].id;

    await client.query('UPDATE profile SET "userId" = $1 WHERE id = $2', [userId, profileId]);
    await client.query('COMMIT');

    console.log('Admin created successfully:');
    console.log(JSON.stringify(userResult.rows[0], null, 2));
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Failed to create admin:', error.message);
  process.exit(1);
});
