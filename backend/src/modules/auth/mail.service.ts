
import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  constructor(
    private readonly configService: ConfigService,
  ) {}

  async sendPasswordResetEmail(
    email: string,
    fullName: string,
    resetUrl: string,
  ) {
    const smtpUser =
      this.configService.get<string>('SMTP_USER');
    const smtpPass =
      this.configService.get<string>('SMTP_PASS');

    if (!smtpUser || !smtpPass) {
      throw new InternalServerErrorException(
        'Chưa cấu hình dịch vụ gửi email',
      );
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const safeName = fullName
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    await transporter.sendMail({
      from: `"Sports Booking" <${smtpUser}>`,
      to: email,
      subject: 'Đặt lại mật khẩu Sports Booking',
      text: `Xin chào ${fullName},

Bạn vừa yêu cầu đặt lại mật khẩu tài khoản Sports Booking.

Truy cập liên kết sau để đặt mật khẩu mới:
${resetUrl}

Liên kết có hiệu lực trong 15 phút. Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email.

Sports Booking`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px; color: #202b26;">
          <h2 style="color: #123b2f;">Sports Booking</h2>
          <h3>Xin chào ${safeName}!</h3>
          <p>Bạn vừa yêu cầu đặt lại mật khẩu tài khoản.</p>
          <p>Nhấn nút bên dưới để tạo mật khẩu mới:</p>
          <a href="${resetUrl}"
             style="display: inline-block; padding: 12px 24px; background: #198754; color: white; text-decoration: none; border-radius: 6px;">
            Đặt lại mật khẩu
          </a>
          <p style="margin-top: 24px;">
            Liên kết có hiệu lực trong <strong>15 phút</strong>.
          </p>
          <p>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
          <p>Sports Booking</p>
        </div>
      `,
    });
  }
}
