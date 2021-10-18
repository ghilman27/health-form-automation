import { Page } from 'puppeteer-core';
import { BrowserCommand } from './types';

export class AgreeTermsCommand implements BrowserCommand<void> {
  private nextPageBtnSelector = 'span[aria-label="Next page"]';
  private agreeBtnSelector =
    'input[value="Saya memahami dan menyetujui untuk melaksanakan protokol kesehatan tersebut, serta bersedia menerima konsekuensi sesuai ketentuan yang berlaku apabila saya melakukan pelanggaran atas protokol tersebut."]';

  execute = async (page: Page): Promise<void> => {
    // wait till the buttons show up
    await Promise.all([
      page.waitForSelector(this.agreeBtnSelector),
      page.waitForSelector(this.nextPageBtnSelector),
    ]);

    // query the buttons
    const agreeInputBtn = await page.$(this.agreeBtnSelector);
    const nextPageBtn = await page.$(this.nextPageBtnSelector);

    // click the buttons
    await page.evaluate((element) => element.click(), agreeInputBtn);
    await page.evaluate((element) => element.click(), nextPageBtn);
  };
}

export class SubmitFormCommand implements BrowserCommand<void> {
  private submitBtnSelector = 'span[aria-label="Submit"]';
  private submittedTextSelector = '.questionnaire_thank-you';

  execute = async (page: Page): Promise<void> => {
    // wait till the submit button showed up
    await page.waitForSelector(this.submitBtnSelector);
    const submitBtn = await page.$(this.submitBtnSelector);

    // submit and wait till it completely submitted
    await page.evaluate((element) => element.click(), submitBtn);
    await page.waitForSelector(this.submittedTextSelector);
  };
}
