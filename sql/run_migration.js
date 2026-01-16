// Quick script to run the is_approved migration on Azure SQL
import sql from 'mssql';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

async function runMigration() {
  console.log('🔄 Connecting to Azure SQL Database...');

  try {
    const pool = await sql.connect(process.env.AZURE_SQL_CONNECTION_STRING);
    console.log('✅ Connected to Azure SQL Database');

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
      console.log('✅ Column is_approved already exists');
    } else {
      console.log('⚠️  Column is_approved does not exist, adding it...');
      await pool.request().query(`
        ALTER TABLE user_profiles
        ADD is_approved BIT NOT NULL DEFAULT 0;
      `);
      console.log('✅ Column is_approved added successfully');
    }

    // Auto-approve all @veradigm.me users
    console.log('\n🔄 Auto-approving @veradigm.me users...');
    const updateResult = await pool.request().query(`
      UPDATE user_profiles
      SET is_approved = 1
      WHERE email LIKE '%@veradigm.me'
      AND is_approved = 0;

      SELECT @@ROWCOUNT as rows_updated;
    `);

    const rowsUpdated = updateResult.recordset[0]?.rows_updated || 0;
    console.log(`✅ Auto-approved ${rowsUpdated} @veradigm.me user(s)`);

    // Show all users and their approval status
    console.log('\n📊 Current user approval status:');
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
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
