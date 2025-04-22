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
    const html = `    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OPTEX ${purpose.charAt(0).toUpperCase() + purpose.slice(1)} Code</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f9f9f9;
            }
            .email-container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
            }
            .email-header {
                background-color: #223c5a;
                color: white;
                padding: 20px;
                text-align: center;
            }
            .email-header h1 {
                margin: 0;
                font-size: 24px;
                font-weight: 600;
            }
            .email-body {
                padding: 30px;
                background-color: #ffffff;
            }
            .email-footer {
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #888;
                background-color: #f5f5f5;
                border-top: 1px solid #eee;
            }
            .otp-container {
                margin: 20px 0;
                text-align: center;
                padding: 15px;
                background-color: #f5f7fa;
                border-radius: 6px;
                border-left: 4px solid #4a90e2;
            }
            .otp-code {
                font-family: 'Courier New', monospace;
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 4px;
                color: #223c5a;
                margin: 10px 0;
            }
            .expiry-info {
                color: #e74c3c;
                font-size: 14px;
                margin-top: 8px;
            }
            .message {
                color: #555;
                margin-bottom: 25px;
            }
            .note {
                font-size: 14px;
                color: #777;
                font-style: italic;
                margin-top: 25px;
                padding-top: 15px;
                border-top: 1px dashed #eee;
            }
            .logo {
                max-width: 150px;
                margin-bottom: 15px;
            }
            @media only screen and (max-width: 480px) {
                .email-container {
                    width: 100%;
                    border-radius: 0;
                }
                .email-header h1 {
                    font-size: 20px;
                }
                .otp-code {
                    font-size: 28px;
                }
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="email-header">
                <h1>OPTEX</h1>
            </div>
            <div class="email-body">
                <h2>Your ${purpose} Code</h2>
                <p class="message">
                    We received a request for ${purpose}. Please use the following code to complete the process:
                </p>
                <div class="otp-container">
                    <div class="otp-code">${otp}</div>
                    <p class="expiry-info">This code will expire in 20 minutes</p>
                </div>
                <p>If you didn't request this code, please ignore this email or contact customer support if you have concerns.</p>
                <p class="note">For security reasons, please do not share this code with anyone.</p>
            </div>
            <div class="email-footer">
                <p>&copy; ${new Date().getFullYear()} OPTEX. All rights reserved.</p>
                <p>This is an automated message, please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    
    // // Send email with OTP
    // await sendMail(email, subject, text, html);
    
    // // If phone number is provided, also send SMS
    // if (phone) {
    //     try {
    //         // Format phone number if needed (ensure it has country code)
    //         const formattedPhone = formatPhoneNumber(phone);
    //         await sendOtpBySMS(formattedPhone, otp);
    //     } catch (error) {
    //         console.error('Failed to send OTP via SMS:', error);
    //         // Continue even if SMS fails, as email was already sent
    //     }
    // }
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