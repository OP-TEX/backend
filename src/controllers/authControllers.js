const { BadRequestError, ValidationError, MethodNotAllowedError } = require('../utils/baseException');

class AuthController {
    constructor(authService) {
      this.authService = authService;
    }
  
    async register(req, res, next) {
      try {
        // Check if the method is POST
        if (req.method !== 'POST') {
          throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
        }
        
        const { firstname, lastname, email, phone, password, role } = req.body;
        
        // Validate required fields
        if (!firstname) {
          throw new BadRequestError("First name is required", "FIRST_NAME_REQUIRED");
        }
        
        if (!lastname) {
          throw new BadRequestError("Last name is required", "LAST_NAME_REQUIRED");
        }
        
        if (!email) {
          throw new BadRequestError("Email is required", "EMAIL_REQUIRED");
        }
        
        // Simple email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new BadRequestError("Invalid email format", "INVALID_EMAIL");
        }
        
        if (!phone) {
          throw new BadRequestError("Phone number is required", "PHONE_REQUIRED");
        }
        
        if (!password) {
          throw new BadRequestError("Password is required", "PASSWORD_REQUIRED");
        }
        
        if (!role) {
          throw new BadRequestError("Role is required", "ROLE_REQUIRED");
        }
        
        const result = await this.authService.register({
          firstName: firstname,
          lastName: lastname,
          email,
          phone,
          password,
          role
        });
        
        res.status(201).json(result);
      } catch (error) {
        next(error);
      }
    }
  
    async sendConfirmationEmail(req, res, next) {
      try {
        // Check if the method is POST
        if (req.method !== 'POST') {
          throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
        }

        const { email } = req.body;
        
        if (!email) {
          throw new BadRequestError("Email is required", "EMAIL_REQUIRED");
        }
        
        // Simple email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new BadRequestError("Invalid email format", "INVALID_EMAIL");
        }
        
        const result = await this.authService.sendConfirmationEmail(email);
        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  
    async confirmEmail(req, res, next) {
      try {
        // Check if the method is POST
        if (req.method !== 'POST') {
          throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
        }

        const { email, token, otp } = req.body;
        
        if (!email) {
          throw new BadRequestError("Email is required", "EMAIL_REQUIRED");
        }
        
        if (!token) {
          throw new BadRequestError("Token is required", "TOKEN_REQUIRED");
        }
        
        if (!otp) {
          throw new BadRequestError("OTP is required", "OTP_REQUIRED");
        }
        
        const result = await this.authService.confirmEmail({ email, token, otp });
        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
    
    async login(req, res, next) {
      try {
        // Check if the method is POST
        if (req.method !== 'POST') {
          throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
        }

        const { email, password , role } = req.body;
        
        if (!email) {
          throw new BadRequestError("Email is required", "EMAIL_REQUIRED");
        }
        
        if (!password) {
          throw new BadRequestError("Password is required", "PASSWORD_REQUIRED");
        }

        if (!role) {
          throw new BadRequestError("Role is required", "ROLE_REQUIRED");
        }
        
        const result = await this.authService.login({ email, password , role });
        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }

    async forgotPassword(req, res, next) {
      try {
        // Check if the method is POST
        if (req.method !== 'POST') {
          throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
        }

        const { email } = req.body;
        
        if (!email) {
          throw new BadRequestError("Email is required", "EMAIL_REQUIRED");
        }
        
        // Simple email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new BadRequestError("Invalid email format", "INVALID_EMAIL");
        }
        
        const result = await this.authService.forgotPassword(email);
        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }

    async confirmOtp(req, res, next) {
      try {
        // Check if the method is POST
        if (req.method !== 'POST') {
          throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
        }

        const { email, forgotToken, otp } = req.body;
        
        if (!email) {
          throw new BadRequestError("Email is required", "EMAIL_REQUIRED");
        }
        
        if (!forgotToken) {
          throw new BadRequestError("Forgot token is required", "TOKEN_REQUIRED");
        }
        
        if (!otp) {
          throw new BadRequestError("OTP is required", "OTP_REQUIRED");
        }
        
        const result = await this.authService.confirmOtp({ email, forgotToken, otp });
        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }

    async resetPassword(req, res, next) {
      try {
        // Check if the method is POST
        if (req.method !== 'POST') {
          throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
        }

        const { email, newPassword, resetToken } = req.body;
        
        if (!email) {
          throw new BadRequestError("Email is required", "EMAIL_REQUIRED");
        }
        
        if (!newPassword) {
          throw new BadRequestError("New password is required", "PASSWORD_REQUIRED");
        }
        
        if (!resetToken) {
          throw new BadRequestError("Reset token is required", "TOKEN_REQUIRED");
        }
        
        const result = await this.authService.resetPassword({ email, newPassword, resetToken });
        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }

    async refreshToken(req, res, next) {
      try {
        // Check if the method is POST
        if (req.method !== 'POST') {
          throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
        }

        const { userId, refreshToken } = req.body;
        
        if (!userId) {
          throw new BadRequestError("User ID is required", "USER_ID_REQUIRED");
        }
        
        if (!refreshToken) {
          throw new BadRequestError("Refresh token is required", "TOKEN_REQUIRED");
        }
        
        const result = await this.authService.refreshToken({ userId, refreshToken });
        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  }
  
  module.exports = AuthController;