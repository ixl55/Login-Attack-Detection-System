export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type Params = Record<string, string | number | boolean | undefined | null>

function buildUrl(path: string, params?: Params): string {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  const q = qs.toString()
  return q ? `${path}?${q}` : path
}

export async function apiFetch<T>(path: string, init?: RequestInit & { params?: Params }): Promise<T> {
  const { params, ...rest } = init ?? {}
  const res = await fetch(buildUrl(path, params), {
    ...rest,
    headers: { Accept: 'application/json', ...(rest.body ? { 'Content-Type': 'application/json' } : {}) },
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
    } catch {
      /* not JSON */
    }
    throw new ApiError(res.status, detail)
  }
  return res.json() as Promise<T>
}
