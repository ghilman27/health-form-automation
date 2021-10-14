import { Page } from 'puppeteer';
import { BrowserCommand } from './browser';

export type QuestionConstructor = new (template: QuestionTemplate) => Question;

export interface QuestionTemplate {
  questionId: number;
  type: string;
  value: string | number | boolean;
  desc?: string;
}

export abstract class Question implements BrowserCommand<void> {
  _template: QuestionTemplate;
  abstract _getSelector: () => string;
  abstract execute: (page: Page) => Promise<void>;

  constructor(template: QuestionTemplate) {
    this._template = template;
  }

  _questionName = (): string => {
    const { questionId } = this._template;
    return `questionnaire_response[answers_attributes][${questionId}][value]`;
  };
}

export class CheckboxQuestion extends Question {
  _getSelector = (): string => {
    const { value } = this._template;
    return `//div[@class="acl-multiple-choice-question"][div/input/@name="${this._questionName()}"]//label[contains(., "${value}")]`;
  };

  execute = async (page: Page): Promise<void> => {
    const selector = this._getSelector();
    await page.waitForXPath(selector);
    const [element] = await page.$x(selector);
    await page.evaluate((element) => element.click(), element);
  };
}

export class RadioQuestion extends Question {
  _getSelector = (): string => {
    const { value } = this._template;
    return `//input[@name="${this._questionName()}"][@value="${value}"]/following-sibling::label`;
  };

  execute = async (page: Page): Promise<void> => {
    const selector = this._getSelector();
    await page.waitForXPath(selector);
    const [element] = await page.$x(selector);
    await page.evaluate((element) => element.click(), element);
  };
}

export class TextQuestion extends Question {
  _getSelector = (): string => {
    return `input[name="${this._questionName()}"]`;
  };

  execute = async (page: Page): Promise<void> => {
    const { value } = this._template;
    const selector = this._getSelector();
    await page.waitForSelector(selector, { visible: true });

    // hack to input to each input element in parallel using Promise.all()
    // https://github.com/puppeteer/puppeteer/issues/1648#issuecomment-439483004
    await page.evaluate(
      (selector, value) => {
        const inputElement = document.querySelector(selector);
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        ).set;
        nativeInputValueSetter.call(inputElement, value);

        const event = new Event('input', { bubbles: true });
        inputElement.dispatchEvent(event);
      },
      selector,
      value,
    );
  };
}

export class SelectQuestion extends Question {
  _getSelector = (): string => {
    return `select[name="${this._questionName()}"]`;
  };

  execute = async (page: Page): Promise<void> => {
    const { value } = this._template;
    const selector = this._getSelector();
    await page.waitForSelector(selector);
    await page.select(selector, `${value}`);
  };
}
