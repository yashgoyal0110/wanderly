export function send(res, result) {
  if (result.headers) {
    for (const [key, value] of Object.entries(result.headers)) res.setHeader(key, value);
  }
  if (result.status === 204) return res.status(204).end();
  return res.status(result.status).json(result.json ?? {});
}

export function toResponse(result) {
  const headers = result.headers || {};
  if (result.status === 204) return new Response(null, { status: 204, headers });
  return Response.json(result.json ?? {}, { status: result.status, headers });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
