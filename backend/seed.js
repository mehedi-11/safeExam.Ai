require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./src/models/Admin');

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');

        const existingAdmin = await Admin.findOne({ email: 'admin@exam.com' });
        if (existingAdmin) {
            console.log('Admin already exists. Updating password to "password".');
            existingAdmin.password = await bcrypt.hash('password', 10);
            await existingAdmin.save();
        } else {
            console.log('Creating new admin...');
            const hashedPassword = await bcrypt.hash('password', 10);
            const admin = new Admin({
                name: 'System Admin',
                email: 'admin@exam.com',
                password: hashedPassword,
                is_super_admin: true
            });
            await admin.save();
            console.log('Admin created successfully.');
        }
        process.exit();
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
