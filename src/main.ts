import * as dotenv from 'dotenv';
import * as dns from 'dns';
import * as express from 'express';
import * as morgan from 'morgan';
import * as path from 'path';
import * as puppeteer from 'puppeteer-core';
import { URL } from 'url';

dotenv.config();

import { fillHealthForm } from './form';
import { QuestionTemplate } from './questions';
import WhatsApp from './whatsapp';
import NodeMailer from './nodemailer';
import { consoleLog } from './utils';

const createApp = (
  browser: puppeteer.Browser,
  whatsapp: WhatsApp,
  nodemailer: NodeMailer,
): express.Express => {
  morgan.token('date', () => {
    const p = new Date()
      .toString()
      .replace(/[A-Z]{3}\+/, '+')
      .split(/ /);
    return `${p[2]}/${p[1]}/${p[3]}:${p[4]} ${p[5]}`;
  });

  const reportToWA = async (jid: string, name: string): Promise<string> => {
    if (whatsapp.conn.state === 'close') {
      await whatsapp.connect();
    }

    try {
      whatsapp.totalProcess++;
      const message = await whatsapp.reportHealthForm(jid, name);
      return message;
    } finally {
      whatsapp.totalProcess--;
      if (whatsapp.totalProcess === 0) {
        whatsapp.close();
      }
    }
  };

  const app = express();

  app.use(express.json());
  app.use(morgan('combined'));

  app.post('/', async (req, res, next) => {
    const { questions, formUrl, targetEmail, reportName, reportWhatsapp } =
      req.body;
    const status = {
      email: false,
      form: false,
      whatsapp: false,
    };
    let waMessage: string;
    let screenshotPath: string;

    try {
      console.log(`filling the form ${formUrl} ...`);
      screenshotPath = await fillHealthForm(
        browser,
        formUrl as string,
        questions as QuestionTemplate[],
        {
          screenshot: process.env.NODE_ENV !== 'production' ? false : true,
          submit: process.env.NODE_ENV !== 'production' ? false : true,
        },
      );
      status.form = true;
      console.log(`filling the form success`);

      // send report to email
      console.log(`reporting form to email  ... ${targetEmail}`);
      await nodemailer.sendHealthFormEmail(
        targetEmail,
        screenshotPath,
        questions,
      );
      status.email = true;
      console.log('reporting form to email success');

      // send report to whatsapp
      console.log(`reporting form to whatsapp ${reportWhatsapp} as ${reportName} ...`);
      waMessage = await reportToWA(reportWhatsapp, reportName);
      status.whatsapp = true;
      console.log('reporting form to whatsapp success');

      const response = {
        code: 201,
        status: 'success',
        message: 'Form has been successfully delivered',
        deliveryStatus: {
          whatsapp: {
            status: 'delivered',
            message: waMessage,
          },
          email: {
            status: 'delivered',
          },
          form: {
            status: 'delivered',
            questions: questions,
            screenshot: screenshotPath,
          },
        },
      };

      consoleLog(response);
      res.status(201).json(response);
    } catch (error) {
      error.deliveryStatus = {
        whatsapp: {
          status: status.whatsapp ? 'delivered' : 'failed',
          message: waMessage || '',
        },
        email: { status: status.email ? 'delivered' : 'failed' },
        form: {
          status: status.form ? 'delivered' : 'failed',
          questions: questions,
          screenshot: screenshotPath,
        },
      };
      next(error);
    }
  });

  app.get('/screenshots/:name', (req, res, next) => {
    try {
      const fileName = req.params.name;
      res.sendFile(path.join(__dirname, `../screenshots/${fileName}`));
    } catch (error) {
      next(error);
    }
  });

  app.get('/whatsapp/reconnect', async (_req, _res, next) => {
    try {
      if (whatsapp.conn.state !== 'close') {
        whatsapp.close();
      }
      await whatsapp.connect();
    } catch (error) {
      next(error);
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((error, _req, res, _next) => {
    console.error(error);

    if (error.deliveryStatus) {
      consoleLog(error.deliveryStatus);
    }

    if (error.message === 'No Unfilled Form Found') {
      const description = {
        code: 404,
        message: error.message,
        status: 'failed',
        deliveryStatus: error.deliveryStatus || {},
      };
      res.status(404).json(description);
      nodemailer.sendError(process.env.DEVELOPER_EMAIL, error, description);
    } else {
      const description = {
        code: 500,
        message: 'Internal Server Error',
        status: 'error',
        deliveryStatus: error.deliveryStatus || {},
      };
      res.status(500).json();
      nodemailer.sendError(process.env.DEVELOPER_EMAIL, error, description);
    }
  });

  return app;
};

const init = async () => {
  const browserUrl = new URL(process.env.BROWSER_URL);
  const { address } = await dns.promises.lookup(browserUrl.hostname);
  const browser = await puppeteer.connect({
    browserURL: `${browserUrl.protocol}//${address}:${browserUrl.port}`,
    defaultViewport: {
      width: 1920,
      height: 1080,
      isLandscape: true,
    },
  });

  const whatsapp = new WhatsApp();
  const nodemailer = new NodeMailer({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT),
    secure: true,
    auth: {
      user: process.env.MAIL_ADDRESS,
      pass: process.env.MAIL_PASSWORD,
    },
  });
  const app = createApp(browser, whatsapp, nodemailer);

  app.listen(parseInt(process.env.PORT), '0.0.0.0', () => {
    console.log(`Running on port: ${process.env.PORT}`);
  });
};

init();
