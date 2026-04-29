/**
 * Global guard that rewrites any direct *.supabase.co storage URL to go
 * through the regional reverse proxy (api.wbgen.ru).
 *
 * Why: users in restricted regions (RU) cannot reach *.supabase.co directly.
 * We already have helpers (rewriteStorageUrl, optimizeStorageImage,
 * getProxiedPublicUrl) but it's easy to forget them in new components or in
 * dynamically built URLs (lazy-loaded images, support chat attachments,
 * preview dialogs, etc.). This guard installs low-level interceptors so that
 * NO storage request can leak to supabase.co regardless of where the URL
 * came from.
 *
 * Patches:
 *   - window.fetch
 *   - XMLHttpRequest.open
 *   - HTMLImageElement.src setter (also covers `new Image()` and JSX <img>)
 *   - HTMLSourceElement.src / HTMLVideoElement.src / HTMLAudioElement.src
 *   - Element.setAttribute (catches src/href/srcset assignments)
 *
 * The rewrite is idempotent: URLs already pointing to the proxy are left
 * untouched, and non-storage URLs are not modified.
 */

const PROXY_HOST = "api.wbgen.ru";
const STORAGE_HINT = "/storage/v1/";
const SUPABASE_HOST_RE = /^https?:\/\/[a-z0-9-]+\.supabase\.(co|in)/i;

function rewrite(url: string): string {
  if (!url || typeof url !== "string") return url;
  if (!url.includes(STORAGE_HINT)) return url;
  if (url.includes(PROXY_HOST)) return url;
  if (!SUPABASE_HOST_RE.test(url)) return url;
  return url.replace(SUPABASE_HOST_RE, `https://${PROXY_HOST}`);
}

function rewriteSrcset(value: string): string {
  if (!value || typeof value !== "string") return value;
  // srcset: "url1 1x, url2 2x" — rewrite each URL part.
  return value
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return part;
      const [u, ...rest] = trimmed.split(/\s+/);
      return [rewrite(u), ...rest].join(" ");
    })
    .join(", ");
}

let installed = false;
let expiredJwtHandled = false;

function handleExpiredJwt(): void {
  if (expiredJwtHandled) return;
  expiredJwtHandled = true;
  try {
    // Очищаем все токены supabase из storage и редиректим на /auth.
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        try { localStorage.removeItem(key); } catch {}
      }
    }
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        try { sessionStorage.removeItem(key); } catch {}
      }
    }
  } catch {
    /* noop */
  }
  try {
    if (window.location.pathname !== "/auth") {
      window.location.replace("/auth");
    }
  } catch {
    /* noop */
  }
}

export function installStorageProxyGuard(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // 1. fetch
  try {
    const origFetch = window.fetch.bind(window);
    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      let urlForCheck = "";
      try {
        if (typeof input === "string") {
          urlForCheck = input;
          input = rewrite(input);
        } else if (input instanceof URL) {
          urlForCheck = input.toString();
          const fixed = rewrite(urlForCheck);
          if (fixed !== urlForCheck) input = fixed;
        } else if (input instanceof Request) {
          urlForCheck = input.url;
          const fixed = rewrite(input.url);
          if (fixed !== input.url) {
            input = new Request(fixed, input);
          }
        }
      } catch {
        /* fall through */
      }

      const response = await origFetch(input as any, init);

      // Detect expired JWT on PostgREST/auth endpoints and force a clean logout once.
      try {
        if (
          response.status === 401 &&
          urlForCheck.includes(PROXY_HOST) &&
          (urlForCheck.includes("/rest/v1/") || urlForCheck.includes("/auth/v1/"))
        ) {
          const cloned = response.clone();
          const text = await cloned.text();
          if (
            text.includes("PGRST303") ||
            /jwt expired/i.test(text) ||
            /invalid jwt/i.test(text)
          ) {
            handleExpiredJwt();
          }
        }
      } catch {
        /* noop */
      }

      return response;
    }) as typeof window.fetch;
  } catch (e) {
    console.warn("[storage-proxy-guard] fetch patch failed", e);
  }

  // 2. XMLHttpRequest
  try {
    const OrigOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      ...rest: any[]
    ) {
      try {
        const u = typeof url === "string" ? url : url.toString();
        const fixed = rewrite(u);
        return (OrigOpen as any).call(this, method, fixed, ...rest);
      } catch {
        return (OrigOpen as any).call(this, method, url, ...rest);
      }
    } as any;
  } catch (e) {
    console.warn("[storage-proxy-guard] XHR patch failed", e);
  }

  // 3. HTMLImageElement.src / .srcset
  const patchSrcProp = (Ctor: any, prop: "src" | "srcset" = "src") => {
    try {
      const proto = Ctor.prototype;
      const desc =
        Object.getOwnPropertyDescriptor(proto, prop) ||
        Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop);
      if (!desc || !desc.set || !desc.get) return;
      Object.defineProperty(proto, prop, {
        configurable: true,
        enumerable: desc.enumerable,
        get(this: any) {
          return desc.get!.call(this);
        },
        set(this: any, value: string) {
          const fixed = prop === "srcset" ? rewriteSrcset(value) : rewrite(value);
          desc.set!.call(this, fixed);
        },
      });
    } catch (e) {
      console.warn(`[storage-proxy-guard] ${Ctor?.name}.${prop} patch failed`, e);
    }
  };

  patchSrcProp(HTMLImageElement, "src");
  patchSrcProp(HTMLImageElement, "srcset");
  if (typeof HTMLSourceElement !== "undefined") {
    patchSrcProp(HTMLSourceElement, "src");
    patchSrcProp(HTMLSourceElement, "srcset");
  }
  if (typeof HTMLVideoElement !== "undefined") patchSrcProp(HTMLVideoElement, "src");
  if (typeof HTMLAudioElement !== "undefined") patchSrcProp(HTMLAudioElement, "src");
  if (typeof HTMLIFrameElement !== "undefined") patchSrcProp(HTMLIFrameElement, "src");

  // 4. Element.setAttribute — covers src/href/srcset set via attribute API
  //    (e.g. React sometimes uses setAttribute for non-standard attrs).
  try {
    const origSetAttr = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name: string, value: string) {
      try {
        const lower = name.toLowerCase();
        if (lower === "src" || lower === "href") {
          value = rewrite(value);
        } else if (lower === "srcset") {
          value = rewriteSrcset(value);
        }
      } catch {
        /* noop */
      }
      return origSetAttr.call(this, name, value);
    };
  } catch (e) {
    console.warn("[storage-proxy-guard] setAttribute patch failed", e);
  }
}
