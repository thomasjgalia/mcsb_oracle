// Run the is_approved migration on PRODUCTION Azure SQL
import sql from 'mssql';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load PRODUCTION environment variables
dotenv.config({ path: join(__dirname, '..', '.env.production') });

async function runMigration() {
  console.log('⚠️  WARNING: Running migration on PRODUCTION database');
  console.log('🔄 Connecting to Production Azure SQL Database...');

  const connectionString = process.env.AZURE_SQL_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error('AZURE_SQL_CONNECTION_STRING not found in .env.production');
  }

  console.log('Connection string found:', connectionString.substring(0, 50) + '...');

  try {
    const pool = await sql.connect(connectionString);
    console.log('✅ Connected to Production Azure SQL Database');

    // Check if column exists
    console.log('\n🔍 Checking if is_approved column exists...');
    const checkResult = await pool.request().query(`
      SELECT COUNT(*) as col_exists
      FROM sys.columns
      WHERE object_id = OBJECT_ID('user_profiles')
      AND name = 'is_approved'
    `);

    const columnExists = checkResult.recordset[0].col_exists > 0;

    if (columnExists) {
      console.log('✅ Column is_approved already exists in production');
    } else {
      console.log('⚠️  Column is_approved does not exist in production, adding it...');
      await pool.request().query(`
        ALTER TABLE user_profiles
        ADD is_approved BIT NOT NULL DEFAULT 0;
      `);
      console.log('✅ Column is_approved added successfully to production');
    }

    // Auto-approve all @veradigm.me users
    console.log('\n🔄 Auto-approving @veradigm.me users in production...');
    const updateResult = await pool.request().query(`
      UPDATE user_profiles
      SET is_approved = 1
      WHERE email LIKE '%@veradigm.me'
      AND is_approved = 0;

      SELECT @@ROWCOUNT as rows_updated;
    `);

    const rowsUpdated = updateResult.recordset[0]?.rows_updated || 0;
    console.log(`✅ Auto-approved ${rowsUpdated} @veradigm.me user(s) in production`);

    // Also approve @veradigm.com users (your domain)
    console.log('\n🔄 Auto-approving @veradigm.com users in production...');
    const updateComResult = await pool.request().query(`
      UPDATE user_profiles
      SET is_approved = 1
      WHERE email LIKE '%@veradigm.com'
      AND is_approved = 0;

      SELECT @@ROWCOUNT as rows_updated;
    `);

    const comRowsUpdated = updateComResult.recordset[0]?.rows_updated || 0;
    console.log(`✅ Auto-approved ${comRowsUpdated} @veradigm.com user(s) in production`);

    // Show all users and their approval status
    console.log('\n📊 Current user approval status in PRODUCTION:');
    const usersResult = await pool.request().query(`
      SELECT
        supabase_user_id,
        email,
        is_approved,
        created_at
      FROM user_profiles
      ORDER BY created_at DESC
    `);

    console.table(usersResult.recordset.map(u => ({
      email: u.email,
      is_approved: u.is_approved ? '✓ Approved' : '✗ Pending',
      created_at: new Date(u.created_at).toLocaleString()
    })));

    await pool.close();
    console.log('\n✅ PRODUCTION migration completed successfully!');
    console.log('🎉 You can now test at http://localhost:5173/');
  } catch (error) {
    console.error('❌ Production migration failed:', error.message);
    throw error;
  }
}

runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
