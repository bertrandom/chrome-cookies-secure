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

  function getCookies(url: string, cb: Callback<Record<string, string>>): void;

  function getCookies(
    url: string,
    format: "object",
    cb: Callback<Record<string, string>>
  ): void;

  function getCookies(
    url: string,
    format: "curl" | "header",
    cb: Callback<string>
  ): void;

  function getCookies(url: string, format: "jar", cb: Callback<any>): void;

  function getCookies(
    url: string,
    format: "set-cookie",
    cb: Callback<string[]>
  ): void;

  function getCookies(
    url: string,
    format: "puppeteer",
    cb: Callback<PuppeteerCookie[]>
  ): void;
}
