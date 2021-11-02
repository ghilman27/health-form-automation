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

  const reportToWA = async (jid: string, name: string) => {
    if (whatsapp.conn.state === 'connecting') {
      console.log('Whatsapp State: Reconnecting. Wait for another 3 seconds');
      setTimeout(reportToWA, 3 * 1000);
      return;
    }
    await whatsapp.reportHealthForm(jid, name);
  };

  const app = express();

  app.use(express.json());
  app.use(morgan('combined'));

  app.post('/', async (req, res, next) => {
    const { questions, formUrl, targetEmail, reportName, reportWhatsapp } =
      req.body;

    try {
      const screenshotPath = await fillHealthForm(
        browser,
        formUrl as string,
        questions as QuestionTemplate[],
        {
          screenshot: process.env.NODE_ENV !== 'production' ? false : true,
          submit: process.env.NODE_ENV !== 'production' ? false : true,
        },
      );

      res.status(201).send(screenshotPath);

      setTimeout(
        async () =>
          nodemailer.sendHealthFormEmail(
            targetEmail,
            screenshotPath,
            questions,
          ),
        0,
      );

      setTimeout(async () => {
        if (whatsapp.conn.state === 'close') {
          await whatsapp.connect();
        }
        await reportToWA(reportWhatsapp, reportName);
      }, 0);
    } catch (error) {
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
    if (error.message === 'No Unfilled Form Found') {
      res.status(404).send(error.message);
    } else {
      res.status(500).send('Internal Server Error');
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
  const nodemailer = new NodeMailer();
  const app = createApp(browser, whatsapp, nodemailer);

  app.listen(parseInt(process.env.PORT), '0.0.0.0', () => {
    console.log(`Running on port: ${process.env.PORT}`);
  });
};

init();
