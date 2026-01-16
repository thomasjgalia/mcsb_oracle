// Quick script to manually approve a specific user
import sql from 'mssql';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

async function approveUser(email) {
  console.log(`🔄 Approving user: ${email}`);

  try {
    const pool = await sql.connect(process.env.AZURE_SQL_CONNECTION_STRING);

    // Approve the user
    const result = await pool.request()
      .input('email', sql.NVarChar(255), email)
      .query(`
        UPDATE user_profiles
        SET is_approved = 1
        WHERE email = @email;

        SELECT @@ROWCOUNT as rows_updated;
      `);

    const rowsUpdated = result.recordset[0]?.rows_updated || 0;

    if (rowsUpdated > 0) {
      console.log(`✅ User ${email} approved successfully`);
    } else {
      console.log(`⚠️  User ${email} not found in database`);
    }

    await pool.close();
  } catch (error) {
    console.error('❌ Failed to approve user:', error.message);
    throw error;
  }
}

// Get email from command line argument
const email = process.argv[2] || 'thomas.galia@veradigm.com';
approveUser(email).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
