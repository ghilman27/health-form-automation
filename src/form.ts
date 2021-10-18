import { Browser } from 'puppeteer-core';
import * as path from 'path';

import { questionConstructors } from './config';
import { AgreeTermsCommand, SubmitFormCommand } from './commands';
import { QuestionTemplate } from './questions';
import { createQuestions } from './utils';

interface FillHealthOptions {
  screenshot?: boolean;
  submit?: boolean;
}

export const fillHealthForm = async (
  browser: Browser,
  formUrl: string,
  questionTemplates: QuestionTemplate[],
  options?: FillHealthOptions,
): Promise<string> => {
  // extract options
  const { submit = true, screenshot = true } = options || {};

  // open a new page
  const page = await browser.newPage();

  try {
    // create commands
    const submitForm = new SubmitFormCommand();
    const agreeTerms = new AgreeTermsCommand();
    const questions = createQuestions(questionTemplates, questionConstructors);

    // go to the url
    await page.goto(formUrl);

    // agree terms and fill all the questions
    await agreeTerms.execute(page);
    await Promise.all([...questions.map((question) => question.execute(page))]);

    // submit the form
    if (submit) {
      await submitForm.execute(page);
    }

    // screenshot the page
    const screenshotPath = `screenshots/${Date.now()}.png`;
    if (screenshot) {
      await page.screenshot({
        path: path.join(__dirname, `../${screenshotPath}`),
        fullPage: true,
      });
    }

    return screenshot ? screenshotPath : '';
  } finally {
    // close the page
    await page.close();
  }
};
