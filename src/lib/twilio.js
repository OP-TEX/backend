// const twilio = require('twilio');
// require('dotenv').config();

// // Initialize Twilio client with credentials from environment variables
// const client = twilio(
//   process.env.TWILIO_ACCOUNT_SID,
//   process.env.TWILIO_AUTH_TOKEN
// );

// /**
//  * Send SMS using Twilio
//  * @param {string} to - Recipient phone number (must include country code)
//  * @param {string} message - Message content to send
//  * @returns {Promise} - Twilio message response
//  */
// const sendSMS = async (to, message) => {
//   try {
//     const response = await client.messages.create({
//       body: message,
//       from: process.env.TWILIO_PHONE_NUMBER,
//       to: to
//     });
//     console.log('SMS sent successfully, SID:', response.sid);
//     return response;
//   } catch (error) {
//     console.error('Error sending SMS:', error);
//     throw error;
//   }
// };

// /**
//  * Send OTP via SMS
//  * @param {string} to - Recipient phone number (with country code)
//  * @param {string} otp - The OTP to send
//  * @returns {Promise} - Twilio message response
//  */
// const sendOtpBySMS = async (to, otp) => {
//   const message = `OPTEXاهلا بيك في . كود التفعيل بتاعك هو ${otp}. مستنينك تعمل اول طلب ♥.`;
//   return await sendSMS(to, message);
// };

// module.exports = { sendSMS, sendOtpBySMS };
