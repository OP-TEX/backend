const sgMail = require('@sendgrid/mail');
const { sendOtpBySMS } = require('./twilio');
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendMail = async (to, subject, text, html) => {
    const msg = {
        to,
        from: 'hazemyasser6@gmail.com', 
        subject,
        text,
        html,
    };

    try {
        await sgMail.send(msg);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

/**
 * Send OTP via both email and SMS
 * @param {Object} params - Parameters for sending OTP
 * @param {string} params.email - Recipient email
 * @param {string} params.phone - Recipient phone number with country code
 * @param {string} params.otp - OTP to send
 * @param {string} params.subject - Email subject
 * @param {string} params.purpose - Purpose of OTP (for context in message)
 */
const sendOTP = async ({ email, phone, otp, subject, purpose = 'verification' }) => {
    // Prepare email content
    const text = `Your ${purpose} code (OTP) is ${otp}`;
    const html = `<p>Your ${purpose} code (OTP) is <strong>${otp}</strong></p>`;
    
    // Send email with OTP
    await sendMail(email, subject, text, html);
    
    // If phone number is provided, also send SMS
    if (phone) {
        try {
            // Format phone number if needed (ensure it has country code)
            const formattedPhone = formatPhoneNumber(phone);
            await sendOtpBySMS(formattedPhone, otp);
        } catch (error) {
            console.error('Failed to send OTP via SMS:', error);
            // Continue even if SMS fails, as email was already sent
        }
    }
};

/**
 * Format phone number to ensure it has country code
 * @param {string} phone - Phone number
 * @returns {string} - Formatted phone number
 */
const formatPhoneNumber = (phone) => {
    // If phone already has a '+' prefix, assume it's already formatted
    if (phone.startsWith('+')) return phone;
    
    // For Egyptian numbers: if it starts with 0, replace with +20
    if (phone.startsWith('0')) {
        return '+2' + phone;
    }
    
    // Default: add +20 prefix for Egyptian numbers
    return '+20' + phone;
};

module.exports = { sendMail, sendOTP };