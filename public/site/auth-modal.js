(() => {
  'use strict';
  const returnKey = 'cutcod.auth.return';
  let dialog, mode = 'login', options = {}, busy = false, countdown = 0, timer, revision = 0;
  const get = id => dialog.querySelector(`#${id}`);

  function create() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.id = 'authDialog';
    dialog.className = 'cutcod-auth';
    dialog.setAttribute('aria-labelledby', 'authTitle');
    dialog.setAttribute('aria-describedby', 'authSubtitle');
    dialog.innerHTML = `
      <button class="auth-close" id="closeAuth" type="button" aria-label="关闭登录弹窗"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
      <h2 id="authTitle">欢迎回到 CutCod</h2>
      <p class="auth-subtitle" id="authSubtitle">登录后收藏灵感、分享作品，让创作方法被看见。</p>
      <form id="authForm">
        <label for="email">邮箱</label>
        <input id="email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required>
        <label for="emailCode">邮箱验证码</label>
        <div class="auth-code-input"><input id="emailCode" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="12" placeholder="输入验证码" required><button id="requestEmailCode" type="button">获取验证码</button></div>
        <p id="authCodeHint" class="auth-code-hint" role="status">无需密码，使用邮箱验证码即可继续。</p>
        <p id="authError" class="auth-error" role="alert" hidden></p>
        <button id="authSubmit" class="auth-primary" type="submit">登录</button>
      </form>
      <div class="auth-divider"><span>或使用以下方式继续</span></div>
      <button class="auth-google" id="googleLogin" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.96-3.38.96-2.6 0-4.81-1.76-5.6-4.12H3.05v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.92A6 6 0 0 1 6.08 12c0-.67.12-1.32.32-1.92V7.49H3.05A10 10 0 0 0 2 12c0 1.61.39 3.14 1.05 4.51l3.35-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.95 5.49l3.35 2.59A6 6 0 0 1 12 5.96Z"/></svg><span>使用 Google 继续</span></button>
      <p class="auth-switch"><span id="authSwitchPrompt">还没有账号？</span><button id="authSwitch" type="button">注册</button></p>`;
    document.body.appendChild(dialog);
    get('closeAuth').addEventListener('click', close);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    let backdropPointer = false;
    dialog.addEventListener('pointerdown', event => { backdropPointer = event.target === dialog && outside(event); });
    dialog.addEventListener('click', event => { if (backdropPointer && event.target === dialog && outside(event)) close(); backdropPointer = false; });
    get('authSwitch').addEventListener('click', () => { if (!busy) setMode(mode === 'login' ? 'register' : 'login'); });
    get('email').addEventListener('input', () => { resetCountdown(); get('emailCode').value = ''; setError(''); get('authCodeHint').textContent = '无需密码，使用邮箱验证码即可继续。'; });
    get('requestEmailCode').addEventListener('click', requestCode);
    get('authForm').addEventListener('submit', signIn);
    get('googleLogin').addEventListener('click', google);
  }
  function outside(event) {
    const rect = dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  }
  function setMode(next) {
    mode = next === 'register' ? 'register' : 'login';
    get('authTitle').textContent = mode === 'login' ? '欢迎回到 CutCod' : '加入 CutCod';
    get('authSubtitle').textContent = mode === 'login' ? '登录后收藏灵感、分享作品，让创作方法被看见。' : '创建账号，收藏灵感并分享你的创作。';
    get('authSubmit').textContent = mode === 'login' ? '登录' : '创建账号';
    get('authSwitchPrompt').textContent = mode === 'login' ? '还没有账号？' : '已有账号？';
    get('authSwitch').textContent = mode === 'login' ? '注册' : '登录';
    get('emailCode').value = '';
    get('authCodeHint').textContent = '无需密码，使用邮箱验证码即可继续。';
    resetCountdown();
    setError('');
  }
  function setError(message) {
    create();
    get('authError').textContent = message || '';
    get('authError').hidden = !message;
  }
  function setBusy(value) {
    busy = value;
    dialog.setAttribute('aria-busy', String(value));
    for (const control of dialog.querySelectorAll('form input, form button, #googleLogin, #authSwitch')) control.disabled = value;
    get('requestEmailCode').disabled = value || countdown > 0;
  }
  function resetCountdown() {
    clearInterval(timer); countdown = 0;
    get('requestEmailCode').textContent = '获取验证码';
    get('requestEmailCode').disabled = busy;
  }
  function startCountdown() {
    countdown = 60;
    const update = () => { get('requestEmailCode').textContent = `${countdown} 秒后重发`; get('requestEmailCode').disabled = true; };
    update();
    timer = setInterval(() => { countdown--; if (countdown <= 0) resetCountdown(); else update(); }, 1000);
  }
  async function requestCode() {
    if (busy || countdown) return;
    if (!get('email').reportValidity()) return;
    const current = revision;
    setError(''); setBusy(true);
    try {
      await window.cutcodAuth.requestEmailCode(get('email').value.trim(), mode);
      if (current !== revision) return;
      get('authCodeHint').textContent = '验证码已发送，请检查收件箱或垃圾邮件。';
      startCountdown();
    } catch (error) { if (current === revision) setError(error.message || '验证码发送失败，请稍后重试。'); }
    finally { if (current === revision) { setBusy(false); if (countdown) get('emailCode').focus(); } }
  }
  async function completed(current) {
    const { user } = await window.CutCod.request('/api/session');
    if (!user) throw new Error('登录状态尚未同步，请稍后重试。');
    if (current !== revision) return;
    const callback = options.onSuccess;
    close(false);
    if (typeof callback === 'function') await callback(user);
    window.dispatchEvent(new CustomEvent('cutcod:authenticated', { detail: { user } }));
  }
  async function signIn(event) {
    event.preventDefault();
    if (busy) return;
    const current = revision;
    setError(''); setBusy(true);
    try { await window.cutcodAuth.signInWithEmailCode(get('email').value.trim(), get('emailCode').value.trim()); await completed(current); }
    catch (error) { if (current === revision) setError(error.message || '登录失败，请重试。'); }
    finally { if (current === revision) setBusy(false); }
  }
  function safeReturnPath(value) {
    try {
      const url = new URL(value, location.origin);
      return url.origin === location.origin && ['/', '/index.html', '/contribute.html'].includes(url.pathname) ? url.pathname + url.search : '';
    } catch { return ''; }
  }
  async function google() {
    if (busy) return;
    const current = revision;
    setError(''); setBusy(true);
    try {
      const path = safeReturnPath(options.returnTo || location.pathname + location.search);
      sessionStorage.setItem(returnKey, JSON.stringify({ path, at: Date.now() }));
      const result = await window.cutcodAuth.signInWithGoogle();
      if (result?.redirecting) return;
      sessionStorage.removeItem(returnKey);
      await completed(current);
    } catch (error) {
      sessionStorage.removeItem(returnKey);
      if (current === revision) setError(error.message || 'Google 登录启动失败，请稍后重试。');
    } finally { if (current === revision) setBusy(false); }
  }
  function close(notify = true) {
    if (!dialog?.open) return;
    const callback = options.onClose;
    revision++;
    dialog.close();
    document.documentElement.classList.remove('cutcod-auth-open');
    resetCountdown(); setBusy(false);
    get('emailCode').value = '';
    if (notify && typeof callback === 'function') callback();
  }
  window.CutCodAuthModal = {
    open(settings = {}) {
      create(); options = settings; revision++;
      setBusy(false); setMode(settings.mode);
      document.documentElement.classList.add('cutcod-auth-open');
      if (!dialog.open) dialog.showModal();
      get('email').focus();
    },
    close,
    setError,
    isOpen: () => Boolean(dialog?.open),
    consumeReturnPath() {
      try {
        const stored = JSON.parse(sessionStorage.getItem(returnKey) || 'null');
        sessionStorage.removeItem(returnKey);
        return stored && Date.now() - stored.at < 15 * 60 * 1000 ? safeReturnPath(stored.path) : '';
      } catch { return ''; }
    }
  };
})();
