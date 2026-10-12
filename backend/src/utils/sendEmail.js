const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: Number(process.env.SMTP_PORT) === 465, // SSL only for port 465, TLS for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendExamPasswordEmail = async (studentEmail, studentName, examTitle, examPassword, eventTitle) => {
  try {
    const mailOptions = {
      from: `"SafeExam.Ai" <${process.env.SMTP_USER}>`,
      to: studentEmail,
      subject: `Exam Password for ${examTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #ff6b6b; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0; font-size: 24px;">SafeExam.Ai</h2>
            <p style="margin: 5px 0 0; font-size: 14px;">Your Exam Password is Ready!</p>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333;">Hello <strong>${studentName}</strong>,</p>
            <p style="font-size: 16px; color: #555;">
              A new exam titled <strong>"${examTitle}"</strong> has been created under the event <strong>"${eventTitle}"</strong> which you registered for.
            </p>
            <div style="background-color: #f9f9f9; border-left: 4px solid #ff6b6b; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #777;">Your Exam Password</p>
              <h3 style="margin: 5px 0 0; font-size: 22px; color: #333; letter-spacing: 1px;">${examPassword}</h3>
            </div>
            <p style="font-size: 14px; color: #666; line-height: 1.5;">
              Please keep this password secure. You will need it to join the exam when it starts. 
              Ensure your camera and microphone are working properly before entering the exam.
            </p>
            <p style="font-size: 14px; color: #999; margin-top: 30px; text-align: center;">
              Best of luck from the SafeExam.Ai Team!
            </p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${studentEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Error sending email to ${studentEmail}:`, error);
    return false;
  }
};

const sendOtpEmail = async (email, name, otp, purpose = 'Verification') => {
  try {
    console.log(`\n==============================================`);
    console.log(`[OTP EMAIL] To: ${name || 'User'} <${email}>`);
    console.log(`Purpose: ${purpose} | Code: ${otp}`);
    console.log(`==============================================\n`);

    const isRegister = purpose.toLowerCase().includes('register');
    const templateId = isRegister ? 'template_4db7mzc' : 'template_tex9fhq';

    // 1. Send via EmailJS API
    try {
      const emailJsRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'origin': 'http://localhost:5173',
          'User-Agent': 'Mozilla/5.0'
        },
        body: JSON.stringify({
          service_id: 'service_1xya9pm',
          template_id: templateId,
          user_id: 'bUF4GpGI4G1vouutS',
          template_params: {
            to_name: name || 'User',
            to_email: email,
            email: email,
            otp: String(otp)
          }
        })
      });

      if (emailJsRes.ok) {
        console.log(`[EmailJS] OTP sent successfully to ${email}`);
      } else {
        const errorText = await emailJsRes.text();
        console.warn(`[EmailJS] Response status: ${emailJsRes.status} - ${errorText}`);
      }
    } catch (eJsErr) {
      console.warn(`[EmailJS] Error sending email:`, eJsErr.message);
    }

    // 2. Fallback via Nodemailer if configured
    if (process.env.SMTP_HOST && process.env.SMTP_HOST !== 'smtp.example.com') {
      try {
        const mailOptions = {
          from: `"SafeExam.Ai" <${process.env.SMTP_USER}>`,
          to: email,
          subject: `${purpose} OTP - SafeExam.Ai`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; padding: 24px;">
              <h2 style="color: #111827; margin-top: 0;">SafeExam.Ai</h2>
              <p style="color: #4b5563; font-size: 15px;">Hello <strong>${name || 'User'}</strong>,</p>
              <p style="color: #4b5563; font-size: 15px;">Your verification code for <strong>${purpose}</strong> is:</p>
              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
                <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #111827;">${otp}</span>
              </div>
              <p style="color: #6b7280; font-size: 13px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
            </div>
          `
        };
        await transporter.sendMail(mailOptions);
      } catch (nmErr) {
        console.warn(`[Nodemailer] Error:`, nmErr.message);
      }
    }
    return true;
  } catch (error) {
    console.error(`Error in sendOtpEmail:`, error.message);
    return false;
  }
};

module.exports = {
  sendExamPasswordEmail,
  sendOtpEmail
};
