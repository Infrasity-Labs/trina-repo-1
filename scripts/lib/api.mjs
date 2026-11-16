// Minimal client for the Trina AX team server's HTTP API (the same calls the web app and the product's own seed
// script make). The API is not a stable public API (Trina AX docs, "HTTP API"): this file is the only place that
// knows paths and shapes, and the version is pinned in config.mjs.

export class ApiError extends Error {
  constructor(status, code, message, body) {
    super(`${status} ${code}: ${message}`)
    this.status = status
    this.code = code
    this.body = body
  }
}

export class Api {
  constructor(base, token = null) {
    this.base = base.replace(/\/$/, '')
    this.token = token
  }

  withToken(token) {
    return new Api(this.base, token)
  }

  async raw(method, path, { query, json, form, headers = {} } = {}) {
    let url = this.base + path
    if (query) {
      const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null))
      if (qs.size) url += '?' + qs
    }
    const h = { origin: this.base, ...headers }
    if (this.token) h.authorization = `Bearer ${this.token}`
    if (method !== 'GET') h['x-mycel-csrf'] = '1'
    let body
    if (json !== undefined) {
      h['content-type'] = 'application/json'
      body = JSON.stringify(json)
    } else if (form) body = form
    return fetch(url, { method, headers: h, body })
  }

  async call(method, path, opts = {}) {
    const res = await this.raw(method, path, opts)
    if (!res.ok) {
      let err = { code: `http_${res.status}`, message: res.statusText }
      try {
        const j = await res.json()
        if (j?.error) err = j.error
      } catch {}
      throw new ApiError(res.status, err.code, err.message, err)
    }
    if (res.status === 204) return undefined
    const type = res.headers.get('content-type') ?? ''
    return type.includes('json') ? res.json() : res.text()
  }

  // ---- setup and sign-in ----
  setupStatus() { return this.call('GET', '/api/setup') }
  setup(body) { return this.call('POST', '/api/setup', { json: body }) }
  login(username, password) {
    return this.call('POST', '/api/auth/login', { json: { username, password, client: 'web', tokenMode: 'bearer' } })
  }
  logout() { return this.call('POST', '/api/auth/logout') }
  changePassword(currentPassword, newPassword) {
    return this.call('POST', '/api/auth/password', { json: { currentPassword, newPassword } })
  }
  health() { return this.call('GET', '/api/health') }

  // ---- admin ----
  listGroups() { return this.call('GET', '/api/admin/groups') }
  createGroup(body) { return this.call('POST', '/api/admin/groups', { json: body }) }
  listUsers() { return this.call('GET', '/api/admin/users') }
  createUser(body) { return this.call('POST', '/api/admin/users', { json: body }) }
  updateUser(id, body) { return this.call('PATCH', `/api/admin/users/${encodeURIComponent(id)}`, { json: body }) }
  listFolders() { return this.call('GET', '/api/admin/folders') }
  createFolder(body) { return this.call('POST', '/api/admin/folders', { json: body }) }
  putFolderRules(id, body) { return this.call('PUT', `/api/admin/folders/${encodeURIComponent(id)}/rules`, { json: body }) }
  updateSettings(body) { return this.call('PATCH', '/api/admin/settings', { json: body }) }
  getCompanyProfile() { return this.call('GET', '/api/onboarding/profile') }
  saveCompanyProfile(body) { return this.call('PUT', '/api/onboarding/profile', { json: body }) }

  // ---- files and skills (as the signed-in person) ----
  mkdir(path) { return this.call('POST', '/api/files/mkdir', { json: { path } }) }
  upload(folder, name, data) {
    const form = new FormData()
    form.set('folder', folder)
    form.set('name', name)
    form.set('onExists', 'fail')
    form.set('file', new Blob([data]), name)
    return this.call('POST', '/api/files/upload', { form })
  }
  tree(path = '') { return this.call('GET', '/api/files/tree', { query: { path } }) }
  content(path) { return this.call('GET', '/api/files/content', { query: { path } }) }
  skills() { return this.call('GET', '/api/skills') }
  skillIssues() { return this.call('GET', '/api/skills/issues') }
  me() { return this.call('GET', '/api/me') }
}
