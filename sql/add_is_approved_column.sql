-- Add is_approved column to user_profiles table
-- Run this in Azure SQL Database

-- Add the column if it doesn't exist
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID('user_profiles')
    AND name = 'is_approved'
)
BEGIN
    ALTER TABLE user_profiles
    ADD is_approved BIT NOT NULL DEFAULT 0;
END
GO

-- Auto-approve existing @veradigm.me users
UPDATE user_profiles
SET is_approved = 1
WHERE email LIKE '%@veradigm.me'
AND is_approved = 0;
GO

-- Show results
SELECT
    supabase_user_id,
    email,
    is_approved,
    created_at
FROM user_profiles
ORDER BY created_at DESC;
GO
