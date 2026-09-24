interface PagesContext {
  next(): Promise<Response>;
}

interface HtmlElement {
  setAttribute(name: string, value: string): void;
}

declare class HTMLRewriter {
  on(selector: string, handlers: {element(element: HtmlElement): void}): HTMLRewriter;
  transform(response: Response): Response;
}

const createNonce = (): string => {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
};

export const onRequest = async (context: PagesContext): Promise<Response> => {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const nonce = createNonce();
  const headers = new Headers(response.headers);
  const policy = headers.get('content-security-policy');
  if (policy) {
    headers.set(
      'content-security-policy',
      policy.replace(/script-src\s+/, `script-src 'nonce-${nonce}' `),
    );
  }

  const securedResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });

  return new HTMLRewriter()
    .on('script', {element: (element) => element.setAttribute('nonce', nonce)})
    .transform(securedResponse);
};
