const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendMail, sendOTP } = require('../lib/mail');
const { 
  ConflictError, 
  NotFoundError, 
  AuthorizationError,
  BadRequestError
} = require('../utils/baseException');

class AuthService {
  constructor(models) {
    this.models = models;
  }

  async register({ firstName, lastName, email, phone, password, role }) {
    const existing = await this.getUserByEmail(email);
    if (existing) {
      throw new ConflictError("Email is already in use", "EMAIL_ALREADY_IN_USE");
    }
  
    const normalizedRole = role.toLowerCase();
    const Model = this.models[normalizedRole];
    if (!Model) {
      throw new BadRequestError("Invalid role provided: Role is invalid", "INVALID_ROLE");
    }
  
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
    if (!passwordRegex.test(password)) {
      throw new BadRequestError(
        "Password must be at least 6 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.",
        "INVALID_PASSWORD"
      );
    }
  
    const phoneRegex = /^(010|011|012|015)\d{8}$/;
    if (!phoneRegex.test(phone)) {
      throw new BadRequestError(
        "Phone number must begin with 010, 011, 012, or 015 and be followed by exactly 8 digits.",
        "INVALID_PHONE"
      );
    }
  
    const hashedPassword = await bcrypt.hash(password, 10);
  
    const doc = new Model({
      firstName,
      lastName,
      email,
      phone,
      hashedPassword
    });
    const savedDoc = await doc.save();
  
    const payload = { id: savedDoc._id };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
  
    return {
      userId: savedDoc._id,
      email: savedDoc.email,
      accessToken,
      refreshToken,
      confirmed: savedDoc.confirmed || false
    };
  }

  async getUserByEmail(email) {
    for (const key in this.models) {
      const user = await this.models[key].findOne({ email });
      if (user) {
        return { user, Model: this.models[key] };
      }
    }
    return null;
  }

  async sendConfirmationEmail(email) {
    const result = await this.getUserByEmail(email);
    if (!result) throw new NotFoundError("User not found", "USER_NOT_FOUND");
    const { user } = result;
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    const confirmationToken = jwt.sign(
      { 
        email: user.email,
        otp: otp,
        type: 'email-confirmation'
      },
      process.env.JWT_SECRET,
      { expiresIn: '20m' }
    );
  
    user.confirmationToken = confirmationToken;
    user.otp = otp;
    await user.save();
  
    await sendOTP({
      email,
      phone: user.phone,
      otp,
      subject: "Email Confirmation",
      purpose: "confirmation"
    });
  
    return { 
      token: confirmationToken
    };
  }
  
  async confirmEmail({ email, token, otp }) {
    const result = await this.getUserByEmail(email);
    if (!result) throw new NotFoundError("User not found", "USER_NOT_FOUND");
    const { user } = result;
  
    if (user.confirmationToken !== token) {
      throw new AuthorizationError("Invalid token", "INVALID_TOKEN");
    }
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
      if (decoded.type !== 'email-confirmation' || decoded.email !== email) {
        throw new AuthorizationError("Invalid token", "INVALID_TOKEN");
      }
  
      if (decoded.otp !== otp) {
        throw new AuthorizationError("Invalid OTP", "INVALID_OTP");
      }
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AuthorizationError("Confirmation token has expired", "TOKEN_EXPIRED");
      }
      throw new AuthorizationError("Invalid token", "INVALID_TOKEN");
    }
  
    if (user.otp !== otp) {
      throw new AuthorizationError("Invalid OTP", "INVALID_OTP");
    }
  
    user.confirmed = true;
    user.confirmationToken = ""; 
    user.otp = "";
    await user.save();
  
    const payload = { id: user._id };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
  
    const userData = user.toObject();
    delete userData.hashedPassword;
    delete userData.otp;
  
    return {
      user: userData,
      accessToken,
      refreshToken
    };
  }

  async login({ email, password, role }) {
    const result = await this.getUserByEmail(email);
    if (!result) throw new AuthorizationError("Invalid email or password", "INVALID_CREDENTIALS");
    const { user, Model } = result;
    
    // Check if the found user's role matches the requested role
    // Find which model/role the user belongs to
    let userRole = null;
    for (const [key, model] of Object.entries(this.models)) {
      if (model === Model) {
        userRole = key;
        break;
      }
    }
    
    // Normalize the roles for comparison
    const normalizedRequestedRole = role.toLowerCase();
    
    // If roles don't match, throw the same error as invalid credentials
    if (normalizedRequestedRole !== userRole) {
      throw new AuthorizationError("Invalid email or password", "INVALID_CREDENTIALS");
    }
    
    const isMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!isMatch) throw new AuthorizationError("Invalid email or password", "INVALID_CREDENTIALS");
  
    const payload = { id: user._id };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
  
    const userData = user.toObject();
    delete userData.hashedPassword;
    delete userData.confirmationToken;
    delete userData.otp;
  
    return {
      user: userData,
      accessToken,
      refreshToken
    };
  }

  async forgotPassword(email) {
    const result = await this.getUserByEmail(email);
    if (!result) throw new NotFoundError("User not found", "USER_NOT_FOUND");
    const { user } = result;
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const payload = { email };
    const forgotToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '20m' });

    user.confirmationToken = forgotToken;
    user.otp = otp; 
    await user.save();

    await sendOTP({
      email,
      phone: user.phone,
      otp,
      subject: "Password Reset Request",
      purpose: "password reset"
    });

    return { forgotToken }; 
  }

  async confirmOtp({ email, forgotToken, otp }) {
    const result = await this.getUserByEmail(email);
    if (!result) throw new NotFoundError("User not found", "USER_NOT_FOUND");
    const { user } = result;
    
    try {
      const decoded = jwt.verify(forgotToken, process.env.JWT_SECRET);
      
      if (decoded.email !== email || user.otp !== otp) {
        throw new AuthorizationError("Invalid OTP", "INVALID_CREDENTIALS");
      }
      
      const payload = { email, purpose: 'reset_password' };
      const resetToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '20m' });
      user.confirmationToken = resetToken; 
      user.otp = ""; 
      await user.save();
      
      return { resetToken };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AuthorizationError("OTP has expired. Please request a new one.", "TOKEN_EXPIRED");
      } else if (error.name === 'JsonWebTokenError') {
        throw new AuthorizationError("Invalid token. Please request a new OTP.", "INVALID_TOKEN");
      }
      throw error;
    }
  }

  async resetPassword({ email, newPassword, resetToken }) {
    const result = await this.getUserByEmail(email);
    if (!result) throw new NotFoundError("User not found", "USER_NOT_FOUND");
    const { user, Model } = result;
  
    try {
      const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
      
      if (decoded.email !== email || decoded.purpose !== 'reset_password') {
        throw new AuthorizationError("Invalid reset token", "INVALID_TOKEN");
      }
      
      if (user.confirmationToken !== resetToken) {
        throw new AuthorizationError("Invalid reset token", "INVALID_TOKEN");
      }
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AuthorizationError("Reset token has expired. Please request a new one.", "TOKEN_EXPIRED");
      } else if (error.name === 'JsonWebTokenError') {
        throw new AuthorizationError("Invalid reset token. Please request a new password reset.", "INVALID_TOKEN");
      }
      throw error; 
    }
  
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
    if (!passwordRegex.test(newPassword)) {
      throw new BadRequestError(
        "Password must be at least 6 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.",
        "INVALID_PASSWORD"
      );
    }
  
    const hashedPassword = await bcrypt.hash(newPassword, 10);
  
    user.hashedPassword = hashedPassword;
    user.confirmationToken = "";
    await user.save();
  
    const payload = { id: user._id };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
  
    let role = "User";
    if (Model === this.models.delivery) {
      role = "Delivery";
    } else if (Model === this.models['customer service']) {
      role = "CustomerService";
    }
  
    return {
      userId: user._id,
      role,
      email: user.email,
      accessToken,
      refreshToken
    };
  }
  
  async refreshToken({ userId, refreshToken }) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      
      if (decoded.id !== userId) {
        throw new AuthorizationError("Invalid refresh token", "INVALID_TOKEN");
      }
  
      const payload = { id: userId };
      const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
      const newRefreshToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
  
      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AuthorizationError('Refresh token has expired', "TOKEN_EXPIRED");
      }
      throw new AuthorizationError('Invalid refresh token', "INVALID_TOKEN");
    }
  }
}

module.exports = AuthService;