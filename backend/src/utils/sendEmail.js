require('dotenv').config();

/**
 * Send OTP / Verification Email via EmailJS REST API
 */
const sendOtpEmail = async (email, name, otp, purpose = 'Verification') => {
  try {
    console.log(`\n==============================================`);
    console.log(`[EMAILJS OTP] To: ${name || 'User'} <${email}>`);
    console.log(`Purpose: ${purpose} | Code: ${otp}`);
    console.log(`==============================================\n`);

    const isRegister = purpose.toLowerCase().includes('register');
    const templateId = isRegister ? 'template_4db7mzc' : 'template_tex9fhq';

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
      return true;
    } else {
      const errorText = await emailJsRes.text();
      console.warn(`[EmailJS] Response status: ${emailJsRes.status} - ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error(`Error in sendOtpEmail via EmailJS:`, error.message);
    return false;
  }
};

module.exports = {
  sendOtpEmail
};
