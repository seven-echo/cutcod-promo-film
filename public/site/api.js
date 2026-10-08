window.CutCod = {
  maxUploadBytes: 100 * 1024 * 1024,
  uploadExtensions: new Set(['.mp4','.webm','.zip','.txt','.md','.json','.js','.ts','.tsx','.html','.css','.skill']),
  videoExtensions: new Set(['.mp4','.webm']),
  validateUploadFile(file, kind = 'attachment') {
    if (!file || typeof file.name !== 'string') throw new Error('请选择要上传的文件');
    if (!file.size || file.size < 1) throw new Error('文件不能为空');
    if (file.size > this.maxUploadBytes) throw new Error('文件不能超过 100 MB');
    const dot = file.name.lastIndexOf('.');
    const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
    if (!this.uploadExtensions.has(ext)) throw new Error('不支持该文件类型');
    if (kind === 'video') {
      const typeOk = !file.type || file.type === 'video/mp4' || file.type === 'video/webm';
      if (!this.videoExtensions.has(ext) || !typeOk) throw new Error('预览视频仅支持 MP4 或 WebM 文件');
    }
    return file;
  },
  async request(path, options = {}) {
    const authHeaders = {};
    // Logout only clears the server-side legacy cookie. It must remain
    // callable after CloudBase has already removed browser credentials; do
    // not ask the SDK for a token for this one idempotent endpoint.
    const credentialFree = path === '/api/auth/logout' || path.startsWith('/api/auth/logout?');
    if (!credentialFree) {
      try {
        const getter = window.cutcodAuth && window.cutcodAuth.getAccessToken;
        const token = typeof getter === 'function' ? await getter() : '';
        if (token) authHeaders.Authorization = `Bearer ${token}`;
      } catch (error) {
        if (path.startsWith('/api/auth/')) throw error;
      }
    }
    const response = await fetch(path, {
      credentials: 'same-origin', cache: 'no-store', ...options,
      headers: { ...(options.body && typeof options.body === 'string' ? {'Content-Type':'application/json'} : {}), ...authHeaders, ...options.headers }
    });
    const data = await response.json().catch(() => ({error:'服务返回了无法读取的数据，请刷新重试'}));
    if (!response.ok) {
      const error = new Error(data.error || '操作失败，请重试'); error.status = response.status; throw error;
    }
    return data;
  },
  async upload(file, kind = 'attachment') {
    this.validateUploadFile(file, kind);
    return this.request('/api/uploads?name=' + encodeURIComponent(file.name), {
      method:'POST', headers:{'Content-Type':file.type || 'application/octet-stream'}, body:file
    });
  },
  escape(value = '') { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
  safeUrl(value = '') { try { const url = new URL(value, location.origin); return ['http:','https:'].includes(url.protocol) ? value : ''; } catch { return ''; } },
  date(value) { return value ? new Date(value).toLocaleString('zh-CN', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—'; }
};
