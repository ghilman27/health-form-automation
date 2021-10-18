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

const createApp = (browser: puppeteer.Browser): express.Express => {
  morgan.token('date', () => {
    const p = new Date()
      .toString()
      .replace(/[A-Z]{3}\+/, '+')
      .split(/ /);
    return `${p[2]}/${p[1]}/${p[3]}:${p[4]} ${p[5]}`;
  });

  const app = express();

  app.use(express.json());
  app.use(morgan('combined'));

  app.post('/', async (req, res, next) => {
    const { questions, formUrl } = req.body;

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

  const app = createApp(browser);

  app.listen(parseInt(process.env.PORT), '0.0.0.0', () => {
    console.log(`Running on port: ${process.env.PORT}`);
  });
};

init();
