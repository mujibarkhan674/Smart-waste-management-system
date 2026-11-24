'use client'

export class ClientApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message)
  }
}

/** Fetch a JSON API route and unwrap the `{ data }` / `{ error }` envelope. */
export async function apiFetch<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {}
  let res: Response
  try {
    res = await fetch(url, {
      ...rest,
      headers: json !== undefined ? { 'Content-Type': 'application/json', ...rest.headers } : rest.headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    })
  } catch {
    throw new ClientApiError(0, 'Network error — check your connection and try again.')
  }
  const body = (await res.json().catch(() => null)) as { data?: T; error?: string; details?: unknown } | null
  if (!res.ok) {
    const fieldErrors = (body?.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors
    const firstField = fieldErrors && Object.entries(fieldErrors)[0]
    const message = firstField ? `${firstField[0]}: ${firstField[1][0]}` : body?.error
    throw new ClientApiError(res.status, message || `Request failed (${res.status})`, body?.details)
  }
  return body?.data as T
}
