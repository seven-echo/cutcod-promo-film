let lastCopiedId = null;
let currentUser = null;
let resourceSnapshot = '';
let loadingResources = false;
const favoritesOnly = new URLSearchParams(location.search).get('favorites') === '1';
const esc = CutCod.escape;
const typeDescriptions={
  zh:{code:'不用Claude模型，节省95%token，即可在你常用智能体复现并二次编辑代码视频',prompt:'粘贴视频提示词，在Claude Opus 5.5及以上模型即可复现。',skill:'使用Agent Skill产出高质量创意视频'},
  en:{code:'No Claude model needed. Save 95% of tokens and reproduce and re-edit code videos in your usual AI agent.',prompt:'Paste the video prompt and reproduce it with Claude Opus 5.5 or newer.',skill:'Use an Agent Skill to produce high-quality creative videos.'}
};
function updateTypeDescription(){
  const description=document.getElementById('typeDescription');
  if(description) description.textContent=typeDescriptions[currentLang]?.[activeType]||'';
}

function publicationValue(v){return v.displayPublishedAt||v.effectivePublishedAt||(v.origin==='external'?v.sourcePublishedAt:'')||''}
function publicationTime(v){const n=Date.parse(publicationValue(v));return Number.isFinite(n)?n:-8640000000000000}
function updatePublicationDate(v){
  const value=publicationValue(v),node=document.getElementById('modalPublishedDate');
  document.getElementById('modalPublishedLabel').textContent=currentLang==='zh'?'发布日期':'Published';
  if(!value||!Number.isFinite(Date.parse(value))){node.textContent=currentLang==='zh'?'日期待确认':'Date unconfirmed';node.removeAttribute('datetime');return}
  const day=/^\d{4}-\d{2}-\d{2}$/.test(value)?value:new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Shanghai'}).format(new Date(value));node.dateTime=value;
  node.textContent=day+(v.publicationDateBasis==='upload'?(currentLang==='zh'?' · 本站上传':' · Uploaded here'):'');
}

function render() {
  const q = searchInput.value.trim().toLowerCase();
  const list = videos.filter(v => (favoritesOnly ? v.liked : v.type === activeType) && (activeCategory === 'all' || v.category === activeCategory) && (!q || [v.title,v.author,...v.tags,v.desc].join(' ').toLowerCase().includes(q)));
  if (sortMode === 'popular') list.sort((a,b) => b.copies-a.copies);
  else if (sortMode === 'recommended') list.sort((a,b) => b.likes-a.likes || b.copies-a.copies);
  else list.sort((a,b) => publicationTime(b)-publicationTime(a) || String(a.id).localeCompare(String(b.id)));
  cancelSynchronizedPlayback();
  grid.innerHTML = '';
  results.textContent = `${list.length} ${languageLabels[currentLang].results}`;
  empty.textContent = favoritesOnly
    ? (currentLang === 'zh' ? '还没有收藏资源' : 'No saved resources yet')
    : (currentLang === 'zh' ? '没有找到匹配的资源' : 'No matching resources');
  empty.style.display = list.length ? 'none' : 'block';
  list.forEach((v, order) => {
    const card = document.createElement('article');
    card.className = 'card'; card.dataset.id = v.id; card.dataset.order = order;
    const videoSrc=CutCod.safeUrl(v.video);
    const posterSrc=CutCod.safeUrl(v.poster||v.thumbnail||v.posterUrl||'');
    const posterAttr=posterSrc?` poster="${esc(posterSrc)}"`:'';
    card.innerHTML = `<div class="card-media" style="--ratio:${Number(v.ratio)||1.48}"><video muted playsinline preload="none" loop data-video-src="${esc(videoSrc)}"${posterAttr} aria-label="${esc(v.title)}"></video><div class="card-shade"></div><div class="card-actions"><button class="card-action heart-card${v.liked?' liked':''}" aria-label="${v.liked?'取消收藏':'收藏'}" aria-pressed="${!!v.liked}">${heartSvg}</button><button class="card-action copy-card${v.id===lastCopiedId?' copied':''}" aria-label="${v.id===lastCopiedId?'已复制':'复制内容'}">${v.id===lastCopiedId?checkSvg:copySvg}</button></div><span class="duration">${esc(v.duration)}</span></div><div class="card-meta"><span class="card-title" title="${esc(v.title)}">${esc(v.title)}</span><span class="card-author">${esc(v.author)}</span></div>`;

    card.querySelector('.heart-card').addEventListener('click', async e => {
      e.stopPropagation(); const button = e.currentTarget; button.disabled = true;
      if (!currentUser) {
        button.disabled = false;
        window.CutCodAuthModal?.open({returnTo:location.pathname+location.search,onSuccess:user=>{currentUser=user;loadAccount();loadResources();}});
        return;
      }
      try {
        const data = await CutCod.request(`/api/resources/${encodeURIComponent(v.id)}/like`, {method:'POST',body:JSON.stringify({liked:!v.liked})});
        Object.assign(v,data.resource);
        button.classList.toggle('liked',v.liked); button.setAttribute('aria-pressed',String(v.liked)); button.setAttribute('aria-label',v.liked?'取消收藏':'收藏');
        showToast(v.liked?'已收藏':'已取消收藏');
        if (favoritesOnly && !v.liked) render();
      } catch(error) { showToast(error.message); }
      finally { button.disabled = false; }
    });
    card.querySelector('.copy-card').addEventListener('click', e => { e.stopPropagation(); copy(copyPayload(v),v); });
    card.querySelector('.card-media').addEventListener('click', () => openModal(v));
    card.querySelector('.card-title').tabIndex = 0;
    card.querySelector('.card-title').addEventListener('click',()=>openModal(v));
    card.querySelector('.card-title').addEventListener('keydown',e=>{if(e.key==='Enter')openModal(v)});
    grid.appendChild(card);
  });
  layoutMasonry(); startSynchronizedPlayback();
}

async function loadResources() {
  if (loadingResources) return;
  loadingResources = true;
  try {
    const data = await CutCod.request(favoritesOnly ? '/api/favorites' : '/api/resources');
    const snapshot = JSON.stringify(data.resources.map(({likes,copies,liked,updatedAt,...content})=>content));
    if (snapshot !== resourceSnapshot) {
      resourceSnapshot = snapshot;
      videos = data.resources.map(v=>({...v,tags:v.tags||[],copies:v.copies||0,likes:v.likes||0}));
      render();
    } else {
      // Counter refreshes must not recreate cards while the visitor is scrolling.
      const fresh=new Map(data.resources.map(v=>[v.id,v]));
      videos.forEach(v=>{if(fresh.has(v.id))Object.assign(v,fresh.get(v.id))});
      grid.querySelectorAll('.card').forEach(card=>{const v=fresh.get(card.dataset.id);const b=card.querySelector('.heart-card');if(v&&b){b.classList.toggle('liked',!!v.liked);b.setAttribute('aria-pressed',String(!!v.liked));b.setAttribute('aria-label',v.liked?'取消收藏':'收藏')}});
    }
  } catch(error) {
    if (favoritesOnly && error.status === 401) {
      currentUser = null;
      const empty = document.getElementById('empty');
      empty.textContent = currentLang === 'zh' ? '请登录后查看我的收藏' : 'Sign in to view your saved resources';
      empty.style.display = 'block';
      window.CutCodAuthModal?.open({returnTo:location.pathname+location.search,onSuccess:user=>{currentUser=user;loadAccount();loadResources();}});
      return;
    }
    if (!videos.length) { empty.textContent = '资源暂时无法加载，请确认本地服务已启动后刷新。'; empty.style.display='block'; }
    else showToast('资源更新失败，请稍后刷新');
  } finally { loadingResources=false; }
}

async function loadAccount() {
  try {
    const {user} = await CutCod.request('/api/session');
    currentUser = user || null;
    const entry = document.getElementById('accountEntry');
    const displayName = user ? (String(user.name || '').trim() || String(user.email || '').split('@')[0] || 'CutCod 用户') : '';
    entry.textContent = user ? displayName.slice(0,2) : (currentLang==='zh'?'登录':'Log in');
    entry.title = user ? `${displayName} · 创作者中心` : '登录 / 注册';
    entry.classList.toggle('logged-in',!!user);
    entry.setAttribute('aria-expanded','false');
    const menu = document.getElementById('accountMenu');
    const menuName = document.getElementById('accountMenuName');
    const menuEmail = document.getElementById('accountMenuEmail');
    const adminItem = document.getElementById('accountAdminItem');
    if (menuName) menuName.textContent = displayName;
    if (menuEmail) menuEmail.textContent = user?.email || '';
    if (adminItem) adminItem.hidden = user?.role !== 'admin';
    setAccountMenuOpen(false);
    if (!user) {
      setAccountMenuOpen(false);
      if (favoritesOnly && !window.CutCodAuthModal?.isOpen()) {
        window.CutCodAuthModal?.open({returnTo:location.pathname+location.search,onSuccess:nextUser=>{currentUser=nextUser;loadAccount();loadResources();}});
      }
    }
  } catch { /* Resource loading provides the service status. */ }
}

function setAccountMenuOpen(open) {
  const menu = document.getElementById('accountMenu');
  const entry = document.getElementById('accountEntry');
  if (!menu || !entry) return;
  const visible = Boolean(open && currentUser);
  menu.hidden = !visible;
  entry.setAttribute('aria-expanded',String(visible));
}

async function logoutFromCatalog() {
  const button = document.getElementById('accountLogout');
  if (button) button.disabled = true;
  let logoutError = null;
  try { await window.cutcodAuth?.signOut?.(); } catch (error) { logoutError = error; }
  try { await CutCod.request('/api/auth/logout',{method:'POST'}); } catch (error) { logoutError = logoutError || error; }
  currentUser = null;
  setAccountMenuOpen(false);
  await loadAccount();
  await loadResources();
  if (logoutError) showToast(logoutError.message || '退出登录失败，请重试。');
  else showToast(currentLang === 'zh' ? '已退出登录' : 'You are now signed out');
  if (button) button.disabled = false;
}

function updateSortUI(){const labels=languageLabels[currentLang].sort;sortTrigger.querySelector('.sort-current').textContent=labels[sortMode];sortMenu.querySelectorAll('[data-sort]').forEach(o=>{o.textContent=labels[o.dataset.sort];o.setAttribute('aria-selected',String(o.dataset.sort===sortMode))})}
function closeSortMenu(){sortDropdown.classList.remove('open');sortTrigger.setAttribute('aria-expanded','false')}
function updateAccountLanguage(){
  const labels=currentLang==='zh'?{work:'我的作品',favorites:'我的收藏',submit:'提交新资源',admin:'管理后台',logout:'退出登录'}:{work:'My work',favorites:'My favorites',submit:'Submit resource',admin:'Admin',logout:'Log out'};
  for(const [key,label] of Object.entries(labels)){
    const node=document.querySelector(`[data-menu="${key}"]`)||document.getElementById(key==='logout'?'accountLogout':key);
    if(node) node.textContent=label;
  }
  const title=document.querySelector('#favoritesViewbar strong'); if(title) title.textContent=currentLang==='zh'?'我的收藏':'My favorites';
  const back=document.querySelector('#favoritesViewbar a'); if(back) back.textContent=currentLang==='zh'?'返回资源库':'Back to library';
}
function updateLanguageUI(){typeNames=languageLabels[currentLang].typeNames;document.documentElement.lang=currentLang==='zh'?'zh-CN':'en';document.querySelectorAll('.nav-tabs .tab').forEach(t=>{t.textContent=typeNames[t.dataset.tab]});document.querySelectorAll('.category-tab').forEach(t=>{t.textContent=languageLabels[currentLang].categories[t.dataset.category]});document.querySelector('.sort-control>span').textContent=languageLabels[currentLang].sortLabel;updateSortUI();searchInput.placeholder=languageLabels[currentLang].search;document.getElementById('languageToggle').textContent=currentLang==='zh'?'中 / EN':'EN / 中';document.getElementById('uploadEntry').textContent=currentLang==='zh'?'上传':'Submit';updateAccountLanguage();updateTypeDescription();updateModalCopyButton();render();loadAccount()}

function attachmentUrl(item){
  const attachment=item?.attachment;
  return String(typeof attachment==='object' ? attachment?.url||'' : attachment||'').trim();
}
function copyLinkUrl(value){
  const safe=CutCod.safeUrl(String(value||'').trim());
  if(!safe) return '';
  try { return new URL(safe,location.origin).href; } catch { return ''; }
}
function copyPayload(item){
  return CutCodCopy.format(item);
}

function updateModalCopyButton(){
  const button=document.getElementById('modalCopy');
  const copied=Boolean(current && current.id===lastCopiedId);
  const label=currentLang==='zh'?(copied?'已复制':'复制'):(copied?'Copied':'Copy');
  button.innerHTML=`${copied?checkSvg:copySvg}<span>${label}</span>`;
  button.setAttribute('aria-label',label);
  button.classList.toggle('copied',copied);
  document.querySelector('#modalSource span').textContent=currentLang==='zh'?'查看来源':'View source';
  if(current) document.getElementById('modalCopyHint').textContent=languageLabels[currentLang].copyHint[current.type];
}

async function copy(text,item) {
  try {
    if (navigator.clipboard) await navigator.clipboard.writeText(text);
    else {
      const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();
      const copied=document.execCommand('copy');ta.remove();if(!copied)throw new Error('复制失败，请手动选中内容复制');
    }
    lastCopiedId=item.id;
    grid.querySelectorAll('.card').forEach(card=>{
      const button=card.querySelector('.copy-card'),copied=card.dataset.id===item.id;
      button.innerHTML=copied?checkSvg:copySvg;button.classList.toggle('copied',copied);button.setAttribute('aria-label',copied?'已复制':'复制内容');
    });
    updateModalCopyButton();
    showToast('已复制，可以粘贴使用');
    try {
      const data=await CutCod.request(`/api/resources/${encodeURIComponent(item.id)}/copy`,{method:'POST'});
      Object.assign(item,data.resource);
    } catch { showToast('已复制，复制次数暂未同步'); }
  } catch(error) {showToast(error.message||'复制失败，请手动选中内容复制');}
}
function showToast(message){const t=document.getElementById('toast');t.textContent=message;t.classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>t.classList.remove('show'),2400)}
function openModal(v){
  current=v;pauseCardPlayback();
  const modalVideo=document.getElementById('modalVideo');
  modalVideo.preload='metadata';
  const modalPoster=CutCod.safeUrl(v.poster||v.thumbnail||v.posterUrl||'');
  if(modalPoster) modalVideo.poster=modalPoster; else modalVideo.removeAttribute('poster');
  modalVideo.src=CutCod.safeUrl(v.video);
  modalVideo.load();
  document.getElementById('modalKicker').textContent=v.author;
  document.getElementById('modalTitle').textContent=v.title;
  document.getElementById('modalDesc').textContent=v.desc;
  updatePublicationDate(v);
  const source=document.getElementById('modalSource');const sourceUrl=CutCod.safeUrl(v.source||'');source.hidden=!sourceUrl;source.href=sourceUrl;
  const attachment=document.getElementById('modalAttachment');attachment.hidden=!v.attachment;attachment.href=CutCod.safeUrl(typeof v.attachment==='object'?v.attachment?.url||'':v.attachment||'');
  const instructions=document.getElementById('modalInstructions');
  instructions.hidden=v.type!=='skill'||!String(v.instructions||'').trim();instructions.open=false;
  document.getElementById('modalInstructionsTitle').textContent=v.type==='skill'?'安装与使用说明':'运行说明';
  document.getElementById('modalInstructionsText').textContent=v.instructions||'';
  document.getElementById('modalCopyBlock').textContent=copyPayload(v);
  document.getElementById('modalCopyHint').textContent=languageLabels[currentLang].copyHint[v.type];
  updateModalCopyButton();
  document.getElementById('modalBackdrop').classList.add('open');document.body.style.overflow='hidden';
  document.querySelector('.modal-info').scrollTop=0;
  document.querySelector('#modalBackdrop .modal').scrollTop=0;
  document.getElementById('modalCopyBlock').scrollTop=0;
}
function closeModal(){document.getElementById('modalBackdrop').classList.remove('open');const mv=document.getElementById('modalVideo');mv.pause();mv.removeAttribute('src');mv.removeAttribute('poster');mv.load();document.body.style.overflow='';scheduleCardPlayback()}
document.querySelectorAll('.nav-tabs .tab').forEach(t=>t.addEventListener('click',()=>{
  document.querySelectorAll('.nav-tabs .tab').forEach(x=>{x.classList.toggle('active',x===t);x.setAttribute('aria-selected',String(x===t))});activeType=t.dataset.tab;activeCategory='all';
  document.querySelectorAll('.category-tab').forEach(x=>x.classList.toggle('active',x.dataset.category==='all'));updateTypeDescription();render();
}));
document.querySelectorAll('.category-tab').forEach(t=>t.addEventListener('click',()=>{document.querySelectorAll('.category-tab').forEach(x=>x.classList.toggle('active',x===t));activeCategory=t.dataset.category;render()}));
sortTrigger.addEventListener('click',e=>{e.stopPropagation();const open=sortDropdown.classList.toggle('open');sortTrigger.setAttribute('aria-expanded',String(open))});
sortMenu.querySelectorAll('[data-sort]').forEach(option=>option.addEventListener('click',()=>{sortMode=option.dataset.sort;updateSortUI();closeSortMenu();render()}));
document.addEventListener('click',e=>{if(!sortDropdown.contains(e.target))closeSortMenu()});
searchInput.addEventListener('input',render);
document.getElementById('languageToggle').addEventListener('click',()=>{currentLang=currentLang==='zh'?'en':'zh';updateLanguageUI()});
document.getElementById('closeModal').addEventListener('click',closeModal);
document.getElementById('modalBackdrop').addEventListener('click',e=>{if(e.target.id==='modalBackdrop')closeModal()});
document.getElementById('modalCopy').addEventListener('click',()=>current&&copy(copyPayload(current),current));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();closeSortMenu();setAccountMenuOpen(false)}});
window.addEventListener('resize',()=>{clearTimeout(window.masonryResizeTimer);window.masonryResizeTimer=setTimeout(scheduleMasonryLayout,120)});
window.addEventListener('focus',()=>{loadResources();loadAccount()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){loadResources();loadAccount()}});
document.getElementById('favoritesViewbar')?.toggleAttribute('hidden', !favoritesOnly);
document.querySelector('.nav-tabs')?.toggleAttribute('hidden', favoritesOnly);
document.getElementById('typeDescription')?.toggleAttribute('hidden', favoritesOnly);
updateLanguageUI();
const accountEntry = document.getElementById('accountEntry');
const uploadEntry = document.getElementById('uploadEntry');
accountEntry?.addEventListener('click', event => {
  if (currentUser) {
    event.preventDefault();
    setAccountMenuOpen(document.getElementById('accountMenu')?.hidden !== false);
    return;
  }
  event.preventDefault();
  window.CutCodAuthModal?.open({returnTo:location.pathname+location.search,onSuccess:user=>{currentUser=user;loadAccount();loadResources();}});
});
document.getElementById('accountLogout')?.addEventListener('click', event => { event.preventDefault(); logoutFromCatalog(); });
document.getElementById('accountMenu')?.addEventListener('click', event => { event.stopPropagation(); });
uploadEntry?.addEventListener('click', event => {
  if (currentUser) return;
  event.preventDefault();
  window.CutCodAuthModal?.open({returnTo:'/contribute.html?open=1',onSuccess:()=>location.assign('/contribute.html?open=1')});
});
window.addEventListener('cutcod:authenticated', event => { currentUser=event.detail?.user||currentUser; loadAccount(); loadResources(); });
document.addEventListener('click', event => {
  const wrap = document.querySelector('.account-wrap');
  if (wrap && !wrap.contains(event.target)) setAccountMenuOpen(false);
});
empty.textContent="正在加载资源…";
loadResources();
