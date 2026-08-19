const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true, // Use SSL for port 465
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

module.exports = {
  sendExamPasswordEmail,
};
