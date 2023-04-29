type KfetchOptions = {
  baseUrl?: string;
  headers?: Record<string, string>;
  onBeforeFetch?: () => Promise<void>;
  onFetchAbort?: () => void;
  onFetchUnresponsive?: (error: unknown) => void;
  onParseBodyError?: (error: unknown) => void;
};

type FetchOptions = {
  body?: BodyInit | null;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  unsetInitialHeaders?: boolean;
};

type ResponseResult<T = unknown> = {
  body?: T;
  response: {
    contentType: string | null;
    status: number;
  };
};

class Kfetch {
  #baseUrl?: string;
  #onBeforeFetch?: (fetchOpts?: FetchOptions) => Promise<void>;
  #onFetchAbort?: () => void;
  #onFetchUnresponsive?: (error: unknown) => void;
  #onParseBodyError?: (error: unknown) => void;

  headers?: Record<string, string>;

  constructor(opts?: KfetchOptions) {
    this.#baseUrl = opts?.baseUrl ?? "";
    this.#onBeforeFetch = opts?.onBeforeFetch;
    this.#onFetchAbort = opts?.onFetchAbort;
    this.#onFetchUnresponsive = opts?.onFetchUnresponsive;
    this.#onParseBodyError = opts?.onParseBodyError;

    this.headers = opts?.headers;
  }

  async #fetchInit<T>(
    url: string,
    method: string,
    fetchOpts?: FetchOptions
  ): Promise<ResponseResult<T | undefined>> {
    if (this.#onBeforeFetch !== undefined) {
      await this.#onBeforeFetch(fetchOpts);
    }

    let response: Response;

    try {
      if (
        fetchOpts?.unsetInitialHeaders !== undefined &&
        fetchOpts.unsetInitialHeaders
      ) {
        response = await fetch(`${this.#baseUrl}${url}`, {
          body: fetchOpts?.body,
          headers: { ...fetchOpts?.headers },
          method,
          signal: fetchOpts?.signal,
        });
      } else {
        response = await fetch(`${this.#baseUrl}${url}`, {
          body: fetchOpts?.body,
          headers: { ...this.headers, ...fetchOpts?.headers },
          method,
          signal: fetchOpts?.signal,
        });
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError" &&
        this.#onFetchAbort !== undefined
      ) {
        this.#onFetchAbort();
      } else if (this.#onFetchUnresponsive !== undefined) {
        this.#onFetchUnresponsive(error);
      }

      throw new Error("The fetch was unresponsive!");
    }

    let body: T | undefined;

    try {
      body = await this.#parseBody<T>(response);
    } catch (error) {
      if (this.#onParseBodyError !== undefined) {
        this.#onParseBodyError(error);
      }

      throw new Error("Parsing the response body has failed!");
    }

    const result: ResponseResult<T> = {
      body,
      response: {
        contentType: response.headers.get("content-type"),
        status: response.status,
      },
    };

    return result;
  }

  async #parseBody<T>(response: Response): Promise<T | undefined> {
    let body: T | undefined;

    if (response.headers.get("content-type")?.startsWith("application/json")) {
      body = (await response.json()) as T;
    } else if (response.headers.get("content-type")?.startsWith("text/plain")) {
      body = (await response.text()) as T;
    } else {
      body = undefined;
    }

    return body;
  }

  async delete<T = unknown>(
    url: string,
    fetchOpts?: FetchOptions
  ): Promise<ResponseResult<T | undefined>> {
    const result = await this.#fetchInit<T>(url, "DELETE", fetchOpts);
    return result;
  }

  async get<T = unknown>(
    url: string,
    fetchOpts?: FetchOptions
  ): Promise<ResponseResult<T | undefined>> {
    const result = await this.#fetchInit<T>(url, "GET", fetchOpts);
    return result;
  }

  async patch<T = unknown>(
    url: string,
    fetchOpts?: FetchOptions
  ): Promise<ResponseResult<T | undefined>> {
    const result = await this.#fetchInit<T>(url, "PATCH", fetchOpts);
    return result;
  }

  async post<T = unknown>(
    url: string,
    fetchOpts?: FetchOptions
  ): Promise<ResponseResult<T | undefined>> {
    const result = await this.#fetchInit<T>(url, "POST", fetchOpts);
    return result;
  }
}

export { Kfetch };

export type { FetchOptions, ResponseResult };
