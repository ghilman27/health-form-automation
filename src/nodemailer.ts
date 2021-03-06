import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

export default class NodeMailer {
  public _transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;

  constructor(options: SMTPTransport.Options) {
    this._transporter = nodemailer.createTransport(options);
  }

  async sendHealthFormEmail(
    targetEmail: string,
    healthForm: Record<string, unknown> = {},
  ): Promise<SMTPTransport.SentMessageInfo> {
    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric', 
      timeZone: 'Asia/Jakarta'
    });

    return this._transporter.sendMail({
      from: "Fatih's Assistant",
      to: targetEmail,
      subject: `Fill Heatlh Form ${currentDate}`,
      html: `<p>The health form has been filled successfully <br/><br/> <pre>${JSON.stringify(healthForm, null, 4)}</pre></p>`,
    });
  }

  async sendError(
    targetEmail: string,
    error: Error,
    description: Record<string, unknown> = {},
  ): Promise<SMTPTransport.SentMessageInfo> {
    console.log('reporting error to email');

    const currentTime = new Date().toLocaleString('en-GB', {
      timeZone: 'Asia/Jakarta'
    });

    return this._transporter.sendMail({
      from: "Fatih's Assistant",
      to: targetEmail,
      subject: `Error: Fill Health Form ${currentTime}`,
      html: `<p>We found error with description: <br/><br/> <pre>${JSON.stringify(description, null, 4)}</pre> <br/><br/> Error stack: <br/><br/> <pre>${error.stack}</pre></p>`,
    });
  }
}
