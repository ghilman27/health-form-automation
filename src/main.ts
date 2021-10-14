import * as dotenv from 'dotenv';
import * as express from 'express';
import * as path from 'path';
import * as morgan from 'morgan';

dotenv.config();

import { fillHealthForm } from './form';
import { QuestionTemplate } from './questions';

morgan.token('date', function () {
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
  const { questions } = req.body;

  try {
    const screenshotPath = await fillHealthForm(
      process.env.FORM_URL,
      questions as QuestionTemplate[],
      {
        headless: process.env.NODE_ENV === 'dev' ? false : true,
        screenshot: process.env.NODE_ENV === 'dev' ? false : true,
        submit: process.env.NODE_ENV === 'dev' ? false : true,
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

app.listen(process.env.PORT);
console.log(`Running on port: ${process.env.PORT}`);
