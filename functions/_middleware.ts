interface PagesContext {
  request: Request;
  next(input?: Request): Promise<Response>;
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
  const requestUrl = new URL(context.request.url);
  if (requestUrl.hostname === 'waytoasia.pages.dev') {
    const destination = new URL('https://waytoasia.com');
    destination.pathname = requestUrl.pathname;
    destination.search = requestUrl.search;
    return new Response(null, {
      status: 308,
      headers: {
        location: destination.toString(),
        'cache-control': 'no-store',
      },
    });
  }

  // The public proposal alias must not expose the private pre-launch website.
  const proposalRoute = requestUrl.pathname.startsWith('/proposal/')
    || requestUrl.pathname.startsWith('/api/proposals/');
  const proposalAsset = requestUrl.pathname === '/proposal.css'
    || requestUrl.pathname === '/flights.css'
    || requestUrl.pathname === '/proposal.js'
    || requestUrl.pathname.startsWith('/images/');
  if (requestUrl.hostname === 'proposal.waytoasia.com' && !proposalRoute && !proposalAsset) {
    const headers = {'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow'};
    if (!['GET', 'HEAD'].includes(context.request.method)) return new Response(null, {status: 404, headers});
    const destination = new URL('https://waytoasia.com');
    destination.pathname = requestUrl.pathname;
    return new Response(null, {status: 302, headers: {
      ...headers,
      location: destination.toString(),
    }});
  }

  // HTML receives a fresh CSP nonce, so a 304 cannot safely reuse an older body.
  // Keep conditional caching for images, scripts, styles and API responses.
  const isDocument = ['GET', 'HEAD'].includes(context.request.method)
    && !requestUrl.pathname.startsWith('/api/')
    && (context.request.headers.get('sec-fetch-dest') === 'document'
      || context.request.headers.get('accept')?.includes('text/html')
      || !/\.[^/]+$/.test(requestUrl.pathname)
      || requestUrl.pathname.endsWith('.html'));
  let forwarded: Request | undefined;
  if (isDocument) {
    forwarded = new Request(context.request);
    forwarded.headers.delete('if-none-match');
    forwarded.headers.delete('if-modified-since');
  }
  const response = await context.next(forwarded);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const nonce = createNonce();
  const headers = new Headers(response.headers);
  headers.delete('etag');
  headers.delete('last-modified');
  if (!/\b(?:private|no-store)\b/i.test(headers.get('cache-control') || '')) {
    headers.set('cache-control', 'public, max-age=0, must-revalidate');
  }
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

  if (!securedResponse.body) return securedResponse;

  return new HTMLRewriter()
    .on('script', {element: (element) => element.setAttribute('nonce', nonce)})
    .transform(securedResponse);
};
