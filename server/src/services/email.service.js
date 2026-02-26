const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendMail({ to, subject, html }) {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || "YN Project Manager <noreply@ynpm.com>",
        to,
        subject,
        html,
      });
      logger.info(`Email terkirim ke ${to}: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error(`Gagal mengirim email ke ${to}:`, error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email, resetUrl) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a73e8;">Reset Password</h2>
        <p>Hai,</p>
        <p>Kami menerima permintaan untuk mereset password akun kamu. Klik tombol di bawah untuk membuat password baru:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #1a73e8; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">Tautan ini berlaku selama <strong>1 jam</strong>. Jika kamu tidak meminta reset password, abaikan email ini.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">YN Project Manager</p>
      </div>
    `;

    return this.sendMail({
      to: email,
      subject: "Reset Password — YN Project Manager",
      html,
    });
  }
}

module.exports = new EmailService();
