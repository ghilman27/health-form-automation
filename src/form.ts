import Browser from './browser';
import { questionConstructors } from './config';
import { AgreeTermsCommand, SubmitFormCommand } from './commands';
import { QuestionTemplate } from './questions';
import { createQuestions } from './utils';

interface FillHealthOptions {
  headless?: boolean;
  screenshot?: boolean;
  submit?: boolean;
}

export const fillHealthForm = async (
  url: string,
  questionTemplates: QuestionTemplate[],
  options?: FillHealthOptions,
): Promise<string> => {
  const { headless = true, submit = true, screenshot = true } = options || {};

  // initialize browser
  const browser = new Browser(url, {
    headless: headless,
    defaultViewport: {
      width: 1920,
      height: 1080,
      isLandscape: true,
    },
    args: ['--no-sandbox', '--disable-gpu'],
  });

  // create commands
  const submitForm = new SubmitFormCommand();
  const agreeTerms = new AgreeTermsCommand();
  const questions = createQuestions(questionTemplates, questionConstructors);

  // fill the form
  await browser.init();
  await browser.execute(agreeTerms);
  await Promise.all([...questions.map((command) => browser.execute(command))]);

  // submit the form
  if (submit) {
    await browser.execute(submitForm);
  }

  // screenshot for documentation
  const currentTime = Date.now();
  const screenshotPath = `screenshots/${currentTime}.png`;
  if (screenshot) {
    await browser.screenshot({
      path: screenshotPath,
      fullPage: true,
    });
  }

  if (process.env.NODE_ENV === 'production') {
    await browser.close();
  }

  return screenshot ? screenshotPath : '';
};
