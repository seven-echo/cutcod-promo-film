/*
 * CutCod's browser authentication bridge.
 *
 * CloudBase's Web SDK is loaded by the page before this file. Deployment may
 * inject a project-specific `window.CLOUD_BASE_CONFIG` (envId, region,
 * accessKey, callback) and/or a complete `window.CLOUD_BASE_AUTH` adapter.
 * The adapter override is checked at call time so a host page can provide its
 * own bundled SDK without changing this file.
 *
 * This file never fabricates a session. When CloudBase is not configured it
 * fails with a user-facing message and leaves the API client unauthenticated.
 */
(function () {
  'use strict';

  const config = window.CLOUD_BASE_CONFIG || {};
  window.CLOUD_BASE_CONFIG = config;
  const missingMessage = '真实登录服务尚未配置，请联系管理员。';
  let sdkApp = null;
  let sdkAuth = null;
  let sdkInitError = null;
  let sdkInitPromise = null;
  let pendingOtp = null;

  function missing() {
    return new Error(missingMessage);
  }

  function responseError(error, fallback) {
    if (!error) return null;
    if (error instanceof Error) return error;
    const message = error.message || error.msg || error.error_description || fallback || '认证服务请求失败，请稍后重试。';
    const result = new Error(String(message));
    if (error.code != null) result.code = error.code;
    if (error.errorCode != null) result.errorCode = error.errorCode;
    if (error.status != null) result.status = error.status;
    return result;
  }

  // CloudBase can report a missing browser credential when the user has
  // already signed out in another tab, the refresh token expired, or the
  // provider callback was cancelled. Signing out is an idempotent action in
  // all of those cases, so the logout button should not surface this SDK
  // implementation detail as a failure.
  function isMissingCredentialError(error) {
    const code = String(error && (error.code || error.errorCode || '')).toLowerCase();
    const message = String(error && (error.message || error.msg || error.error_description || error) || '').toLowerCase();
    return /credential(?:s)?[_ -]?(?:not[_ -]?found|missing|invalid)/.test(code)
      || /(?:missing|not[_ -]?found)[_ -]?credential(?:s)?/.test(code)
      || /no[_ -]?credential(?:s)?/.test(code)
      || /(?:credential|凭证).*(?:not found|missing|不存在|未找到|无效)/i.test(message)
      || /(?:not found|missing).*(?:credential|凭证)/i.test(message);
  }

  function unwrap(result, fallback) {
    if (result && result.error) throw responseError(result.error, fallback);
    return result;
  }

  function override() {
    const value = window.CLOUD_BASE_AUTH;
    return value && typeof value === 'object' ? value : null;
  }

  function configured() {
    return String(config.envId || config.env || '').trim();
  }

  function authFromApp(app) {
    if (!app) return null;
    // v3 exposes `app.auth`; older compatible builds expose `app.auth()`.
    if (typeof app.auth === 'function') return app.auth();
    return app.auth || null;
  }

  async function initSdk() {
    if (sdkAuth) return sdkAuth;
    if (sdkInitError) throw sdkInitError;
    if (sdkInitPromise) return sdkInitPromise;
    sdkInitPromise = (async () => {
      const env = configured();
      const sdk = window.cloudbase;
      if (!env || !sdk || typeof sdk.init !== 'function') throw missing();
      try {
        const initOptions = {
          env,
          region: config.region || undefined,
          // accessKey is CloudBase's browser-safe Publishable Key. It is not
          // a Tencent secret key and must never be replaced with secretKey.
          accessKey: config.accessKey || config.publishableKey || undefined,
          auth: {
            // CloudBase verifies the OAuth code/state on return from Google.
            detectSessionInUrl: config.detectSessionInUrl !== false,
          },
        };
        if (config.lang) initOptions.lang = config.lang;
        sdkApp = sdk.init(initOptions);
        sdkAuth = authFromApp(sdkApp);
        if (!sdkAuth) throw new Error('CloudBase SDK 未加载身份认证模块。');

        // If a deployment deliberately disables automatic callback detection,
        // verify the callback explicitly. The default path uses the SDK's
        // documented detectSessionInUrl flow to avoid double verification.
        const query = new URLSearchParams(window.location.search || '');
        const hasOAuthCallback = query.has('code') || query.has('state');
        if (hasOAuthCallback && config.detectSessionInUrl === false && typeof sdkAuth.verifyOAuth === 'function') {
          unwrap(await sdkAuth.verifyOAuth(), 'Google 登录回调验证失败，请重试。');
        }
        return sdkAuth;
      } catch (error) {
        sdkInitError = responseError(error, missingMessage);
        throw sdkInitError;
      } finally {
        sdkInitPromise = null;
      }
    })();
    return sdkInitPromise;
  }

  async function getAuth() {
    const custom = override();
    if (custom) return { custom, auth: null };
    return { custom: null, auth: await initSdk() };
  }

  function sessionToken(result) {
    const root = result && result.data ? result.data : result;
    const session = root && root.session ? root.session : root;
    if (!session || typeof session !== 'object') return '';
    return session.access_token || session.accessToken || session.token || '';
  }

  async function tokenFromSdk(auth) {
    if (!auth || typeof auth.getSession !== 'function') return '';
    const result = unwrap(await auth.getSession(), '登录状态读取失败，请重试。');
    return sessionToken(result);
  }

  async function customToken(custom) {
    if (!custom || typeof custom.getAccessToken !== 'function') return '';
    const result = unwrap(await custom.getAccessToken(), '登录状态读取失败，请重试。');
    return typeof result === 'string' ? result : sessionToken(result);
  }

  window.cutcodAuth = {
    // Calling getSession on every API request lets CloudBase refresh an
    // expired access token with its persisted refresh token.
    async getAccessToken() {
      const { custom, auth } = await getAuth();
      return custom ? ((await customToken(custom)) || '') : ((await tokenFromSdk(auth)) || '');
    },

    async requestEmailCode(email, mode = 'login') {
      const address = String(email || '').trim().toLowerCase();
      if (!address) throw new Error('请先填写邮箱');
      const { custom, auth } = await getAuth();
      if (custom) {
        if (typeof custom.requestEmailCode !== 'function') throw missing();
        return unwrap(await custom.requestEmailCode({ email: address, mode, envId: configured() }), '验证码发送失败，请稍后重试。');
      }
      if (typeof auth.signInWithOtp !== 'function') throw new Error('当前 CloudBase SDK 不支持邮箱验证码登录。');
      const result = unwrap(await auth.signInWithOtp({
        email: address,
        options: { shouldCreateUser: mode === 'register' },
      }), '验证码发送失败，请稍后重试。');
      const data = result && result.data;
      const verifyOtp = data && data.verifyOtp;
      if (typeof verifyOtp !== 'function') throw new Error('认证服务未返回验证码校验句柄，请重新获取验证码。');
      pendingOtp = { email: address, verifyOtp };
      return result;
    },

    async signInWithEmailCode(email, code) {
      const address = String(email || '').trim().toLowerCase();
      const token = String(code || '').trim();
      if (!address || !token) throw new Error('请输入邮箱和验证码');
      const { custom, auth } = await getAuth();
      if (custom) {
        if (typeof custom.signInWithEmailCode !== 'function') throw missing();
        return unwrap(await custom.signInWithEmailCode({ email: address, code: token, envId: configured() }), '验证码无效或已过期，请重新获取。');
      }
      if (!pendingOtp || pendingOtp.email !== address || typeof pendingOtp.verifyOtp !== 'function') {
        throw new Error('验证码已失效，请重新获取验证码。');
      }
      const result = unwrap(await pendingOtp.verifyOtp({ token }), '验证码无效或已过期，请重新获取。');
      pendingOtp = null;
      return result;
    },

    async signInWithGoogle(settings = {}) {
      const callback = String(settings.callback || config.callback || '').trim();
      const { custom, auth } = await getAuth();
      if (custom) {
        if (typeof custom.signInWithGoogle !== 'function') throw missing();
        return unwrap(await custom.signInWithGoogle({ envId: configured(), callback }), 'Google 登录启动失败，请稍后重试。');
      }
      if (typeof auth.signInWithOAuth !== 'function') throw new Error('当前 CloudBase SDK 不支持 Google 登录。');
      const oauthOptions = {
        // Ask the SDK for the URL and perform the redirect ourselves. This
        // keeps the return value deterministic for v3 builds.
        skipBrowserRedirect: true,
      };
      if (callback) oauthOptions.redirectTo = callback;
      const result = unwrap(await auth.signInWithOAuth({ provider: 'google', options: oauthOptions }), 'Google 登录启动失败，请稍后重试。');
      const root = result && result.data ? result.data : result;
      const url = root && root.url;
      if (!url) throw new Error('Google 登录未返回授权地址，请检查 CloudBase 配置。');
      window.location.assign(url);
      // Tell the calling page that navigation is in progress. This prevents
      // it from showing a false “登录成功” toast before the OAuth callback
      // returns to the page.
      return Object.assign({}, result || {}, { redirecting: true });
    },

    async signOut() {
      pendingOtp = null;
      try {
        const custom = override();
        if (custom) {
          if (typeof custom.signOut === 'function') return unwrap(await custom.signOut(), '退出登录失败，请重试。');
          return undefined;
        }
        const auth = await initSdk();
        if (typeof auth.signOut !== 'function') return undefined;
        // Explicitly clear the SDK's local credential storage. The idempotent
        // catch below handles the separate case where a token is already
        // missing or expired.
        return unwrap(await auth.signOut({ options: { clearStorage: true } }), '退出登录失败，请重试。');
      } catch (error) {
        if (isMissingCredentialError(error)) return undefined;
        throw responseError(error, '退出登录失败，请重试。');
      }
    },
  };
})();
