import * as puppeteer from 'puppeteer';

export type BrowserOptions = puppeteer.LaunchOptions &
  puppeteer.BrowserLaunchArgumentOptions &
  puppeteer.BrowserConnectOptions & {
    product?: puppeteer.Product;
    extraPrefsFirefox?: Record<string, unknown>;
  };

export interface BrowserCommand<T> {
  execute: (page: puppeteer.Page) => Promise<T>;
}

class Browser {
  private _options: BrowserOptions;
  private _url: string;
  private _browser: puppeteer.Browser;
  private _page: puppeteer.Page;

  constructor(entryUrl: string, options?: BrowserOptions) {
    this._options = options;
    this._url = entryUrl;
  }

  get page(): puppeteer.Page {
    return this._page;
  }

  init = async (): Promise<void> => {
    this._browser = await puppeteer.launch(this._options);
    this._page = await this._browser.newPage();
    await this._page.goto(this._url);
  };

  execute = async <T>(command: BrowserCommand<T>): Promise<T> => {
    return command.execute(this._page);
  };

  screenshot = async (
    options?: puppeteer.ScreenshotOptions,
  ): Promise<string | void | Buffer> => {
    return this._page.screenshot(options);
  };

  close = async (): Promise<void> => {
    await this._browser.close();
  };
}

export default Browser;
