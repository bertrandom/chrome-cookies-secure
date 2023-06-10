declare module "chrome-cookies-secure" {
  type PuppeteerCookie = {
    name: string;
    value: string;
    expires: number;
    domain: string;
    path: string;
    HttpOnly?: boolean;
    Secure?: boolean;
  };

  type Callback<T> = (err: Error, cookies: T) => void;

  type CookieFormat = 'object' | 'curl' | 'header' | 'jar' | 'set-cookie' | 'puppeteer'

  /**
   * getCookies
   */
  function getCookies(url: string, cb: Callback<Record<string, string>>): void;

  function getCookies(
    url: string,
    format: "object",
    cb: Callback<Record<string, string>>,
    profile?: string
  ): void;

  function getCookies(
    url: string,
    format: "curl" | "header",
    cb: Callback<string>,
    profile?: string
  ): void;

  function getCookies(
    url: string, 
    format: "jar", 
    cb: Callback<Record<string, unknown>>, 
    profile?: string
  ): void;

  function getCookies(
    url: string,
    format: "set-cookie",
    cb: Callback<string[]>,
    profile?: string
  ): void;

  function getCookies(
    url: string,
    format: "puppeteer",
    cb: Callback<PuppeteerCookie[]>,
    profile?: string
  ): void;

  /**
   * getCookiesPromised
   */
  function getCookiesPromised(
    url: string
  ): Promise<Record<string, string>>;

  function getCookiesPromised(
    url: string,
    format: "object",
    profile?: string
  ): Promise<Record<string, string>>;

  function getCookiesPromised(
    url: string,
    format: "curl" | "header",
    profile?: string
  ): Promise<string>;

  function getCookiesPromised(
    url: string, 
    format: "jar", 
    profile?: string,
  ): Promise<Record<string, unknown>>;

  function getCookiesPromised(
    url: string,
    format: "set-cookie",
    profile?: string
  ): Promise<string[]>;

  function getCookiesPromised(
    url: string,
    format: "puppeteer",
    profile?: string
  ): Promise<PuppeteerCookie[]>;
}
