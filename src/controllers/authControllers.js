class AuthController {
    constructor(authService) {
      this.authService = authService;
    }
  
    async register(req, res) {
      try {
        const { firstname, lastname, email, phone, password, role } = req.body;
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
        res.status(400).json({ error: error.message });
      }
    }
  
    async sendConfirmationEmail(req, res) {
      try {
        const { email } = req.body;
        const result = await this.authService.sendConfirmationEmail(email);
        res.status(200).json(result);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    }
  
    async confirmEmail(req, res) {
      try {
        const { email, token, otp } = req.body;
        const result = await this.authService.confirmEmail({ email, token, otp });
        res.status(200).json(result);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    }
    
    async login(req, res) {
      try {
        const { email, password } = req.body;
        const result = await this.authService.login({ email, password });
        res.status(200).json(result);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    }

    async forgotPassword(req, res) {
      try {
        const { email } = req.body;
        const result = await this.authService.forgotPassword(email);
        res.status(200).json(result);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    }

    async confirmOtp(req, res) {
      try {
        const { email, forgotToken, otp } = req.body;
        const result = await this.authService.confirmOtp({ email, forgotToken, otp });
        res.status(200).json(result);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    }

    async resetPassword(req, res) {
      try {
        const { email, newPassword, resetToken } = req.body;
        const result = await this.authService.resetPassword({ email, newPassword, resetToken });
        res.status(200).json(result);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    }

    async refreshToken(req, res) {
      try {
        const { userId, refreshToken } = req.body;
        const result = await this.authService.refreshToken({ userId, refreshToken });
        res.status(200).json(result);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    }
  }
  
  module.exports = AuthController;