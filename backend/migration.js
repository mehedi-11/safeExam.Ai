const db = require('./src/config/db');

async function runMigration() {
  try {
    console.log('Starting migrations...');

    // 1. Alter admins table
    try {
      await db.query('ALTER TABLE admins ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE');
      console.log('Added is_super_admin to admins table.');
      // Set the first admin as super admin
      await db.query('UPDATE admins SET is_super_admin = TRUE WHERE id = 1');
      console.log('Set admin 1 as super admin.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('Column is_super_admin already exists.');
      } else {
        throw e;
      }
    }

    // 2. Create activity_logs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NULL,
        teacher_id INT NULL,
        action VARCHAR(255) NOT NULL,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('activity_logs table created.');

    // 3. Create system_settings table
    await db.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT NOT NULL
      )
    `);
    console.log('system_settings table created.');

    // Insert some default settings if empty
    try {
      await db.query(`
        INSERT IGNORE INTO system_settings (setting_key, setting_value) 
        VALUES 
        ('default_exam_duration', '60'),
        ('cheating_penalty', '1'),
        ('allow_teacher_registration', 'true')
      `);
      console.log('Default settings inserted.');
    } catch (e) {
      console.log('Error inserting default settings:', e.message);
    }

    console.log('Migrations completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
