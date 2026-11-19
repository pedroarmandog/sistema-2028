// Pages Functions: keep browser cookies/API on the community's own origin.
export async function onRequest(context) {
  const url = new URL(context.request.url),
    path = url.pathname;
  if (!/^\/api\/(?:comunidade(?:-admin)?(?:\/|$)|admin\/login$)/.test(path))
    return new Response("Não encontrado", { status: 404 });
  let origin;
  try {
    origin = new URL(context.env.COMMUNITY_API_ORIGIN);
    if (origin.protocol !== "https:") throw Error();
  } catch {
    return Response.json(
      { erro: "API da Comunidade não configurada." },
      { status: 503 },
    );
  }
  const destination = new URL(path + url.search, origin.origin),
    headers = new Headers(context.request.headers);
  headers.delete("host");
  headers.delete("content-length");
  const request = new Request(destination, {
    method: context.request.method,
    headers,
    body: ["GET", "HEAD"].includes(context.request.method)
      ? undefined
      : context.request.body,
    redirect: "manual",
    duplex: "half",
  });
  try {
    const upstream = await fetch(request),
      out = new Headers(upstream.headers);
    out.set("Cache-Control", "private, no-store");
    return new Response(upstream.body, {
      status: upstream.status,
      headers: out,
    });
  } catch {
    return Response.json(
      { erro: "A API está indisponível. Tente novamente." },
      { status: 503 },
    );
  }
}
