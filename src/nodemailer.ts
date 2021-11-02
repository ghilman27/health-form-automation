import * as fs from 'fs';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

export default class NodeMailer {
  public _transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;

  constructor() {
    this._transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT),
      secure: true,
      auth: {
        user: process.env.MAIL_ADDRESS,
        pass: process.env.MAIL_PASSWORD,
      },
    });
  }

  async sendHealthFormEmail(
    targetEmail: string,
    screenshotPath: string,
    healthForm: Record<string, unknown> = {},
  ): Promise<SMTPTransport.SentMessageInfo> {
    console.log('reporting health form to email');
    return this._transporter.sendMail({
      from: "Fatih's Assistant",
      to: targetEmail,
      subject: `Fill Heatlh Form ${new Date().toLocaleDateString()}`,
      text: 'The health form has been filled successfully',
      attachments: [
        {
          filename: 'form.json',
          content: JSON.stringify(healthForm),
        },
        {
          filename: 'screenshot.png',
          content: fs.createReadStream(screenshotPath),
        },
      ],
    });
  }
}
