export const config = { runtime: 'edge' }

export default async function handler(req) {
  const url = new URL(req.url)
  const backendUrl = 'https://concretetrack-backend.onrender.com' + url.pathname + url.search

  const headers = new Headers(req.headers)
  headers.delete('host')

  const response = await fetch(backendUrl, {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
    duplex: 'half',
  })

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  })
}
