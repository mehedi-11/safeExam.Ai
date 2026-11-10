const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const userEmail = process.env.SMTP_USER || process.env.EMAIL_USER || 'firegamingv8@gmail.com';
const userPass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || 'ycev mgtp uqkm sfta').replace(/\s+/g, '');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: userEmail,
    pass: userPass,
  },
});

/**
 * Load and render HTML email template
 */
const getEmailHtml = (templateName, variables = {}) => {
  try {
    const templatePath = path.join(__dirname, '../templates', `${templateName}.html`);
    let html = fs.readFileSync(templatePath, 'utf8');
    for (const [key, val] of Object.entries(variables)) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), val);
    }
    return html;
  } catch (err) {
    console.error(`Error loading email template ${templateName}:`, err);
    return null;
  }
};

/**
 * Send OTP / Verification Email via Gmail Nodemailer
 */
const sendOtpEmail = async (email, name, otp, purpose = 'Verification') => {
  try {
    console.log(`\n==============================================`);
    console.log(`[GMAIL SMTP OTP] To: ${name || 'User'} <${email}>`);
    console.log(`Purpose: ${purpose} | Code: ${otp}`);
    console.log(`==============================================\n`);

    const isRegister = purpose.toLowerCase().includes('register');
    const templateName = isRegister ? 'registrationEmail' : 'passwordResetEmail';
    const subjectTitle = isRegister ? 'Account Registration Code' : 'Password Reset Code';

    const renderedHtml = getEmailHtml(templateName, {
      NAME: name || 'User',
      OTP: String(otp),
      YEAR: String(new Date().getFullYear()),
    });

    const mailOptions = {
      from: `"SafeExam.AI" <${userEmail}>`,
      to: email,
      subject: `SafeExam.AI - ${subjectTitle}: ${otp}`,
      html: renderedHtml,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Gmail SMTP] Email sent successfully to ${email}. MessageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Error in sendOtpEmail via Nodemailer/Gmail:`, error);
    return false;
  }
};

module.exports = {
  sendOtpEmail,
  getEmailHtml,
  transporter,
};
