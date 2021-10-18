import { Page } from 'puppeteer-core';

export interface BrowserCommand<T> {
  execute: (page: Page) => Promise<T>;
}
