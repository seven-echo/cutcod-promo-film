const $ = id => document.getElementById(id);
const api = CutCod;
const esc = api.escape;
const types = {code:'视频源代码',prompt:'视频提示词',skill:'视频 Skill'};
const typeProfiles = {
  code: {
    intro: '视频源代码：上传代码文件或填写来源链接，其他用户即可获取并在常用智能体中复现。',
    copyLabel: '预览用户复制的内容',
    copyHint: '源码链接、附件和补充材料会自动加入复现与二创指令。',
    copyPlaceholder: '提交后由系统自动生成',
    attachmentLabel: '源码附件（可选）',
    attachmentHint: 'ZIP、JSON、JS、TS、HTML、CSS 或其他源代码文件',
    accept: '.zip,.json,.js,.ts,.tsx,.html,.css,.md,.txt',
    requiresAttachment: false
  },
  prompt: {
    intro: '视频提示词：粘贴完整提示词、变量和使用步骤，其他用户可直接复制给模型复现。',
    copyLabel: '视频提示词',
    copyHint: '粘贴视频提示词，在Claude Opus 5.5及以上模型即可复现。',
    copyPlaceholder: '粘贴完整视频提示词、变量和使用步骤',
    requiresAttachment: false
  },
  skill: {
    intro: '视频 Skill：上传 Skill 文件或填写来源链接，让其他用户可以安装并复用创作流程。',
    copyLabel: '预览用户复制的内容',
    copyHint: '系统按统一模板生成安装与调用指令，使用说明单独保存。',
    instructionsLabel: '安装与使用说明（可选）',
    instructionsHint: '补充必要的安装和调用信息；单独展示，不加入复制指令。',
    copyPlaceholder: '提交后由系统自动生成',
    attachmentLabel: 'Skill 文件（可选）',
    attachmentHint: '上传 .skill、ZIP 或包含 SKILL.md 的文件包',
    accept: '.skill,.zip,.md,.txt',
    requiresAttachment: false
  }
};
const submissionHelperCommands = CutCodCopy.definitions.submission;
let submissionHelperCopyTimer;
const states = {draft:'草稿',pending:'待审核',published:'已发布',rejected:'需要修改',archived:'已下架'};
let saving = false;
let user = null, myResources = [], editing = null, previewObjectUrl = '', savedVideo = '', savedAttachment = '';
let selectedVideoFile = null, selectedAttachmentFile = null;
let videoValidation = {file:null, status:'idle', message:''};
const filePickerCanceled = {video:false, attachment:false};
let filePickerActive = false;
let autoOpenRequested = new URLSearchParams(location.search).get('open') === '1';
function toast(text) { $('toast').textContent=text; $('toast').classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2500); }
function ratioLabel(value) {
  const ratio = Number(value);
  if(!Number.isFinite(ratio) || ratio <= 0) return '上传视频后自动识别';
  const known = [[1.7778,'横屏 16:9'],[1,'方形 1:1'],[0.5625,'竖屏 9:16'],[1.3333,'横屏 4:3']];
  const match = known.find(([n])=>Math.abs(ratio-n)<0.03);
  return match ? match[1] : `原始比例 ${ratio.toFixed(2)}`;
}
function formatDuration(seconds) {
  if(typeof seconds==='string' && /^\d+:\d{2}$/.test(seconds.trim())) return seconds.trim();
  if(!Number.isFinite(seconds) || seconds < 0) return '上传视频后自动识别';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole/60)}:${String(whole%60).padStart(2,'0')}`;
}
function setVideoMetadata(duration, ratio) {
  $('duration').textContent = formatDuration(duration);
  $('ratio').value = Number.isFinite(Number(ratio)) && Number(ratio)>0 ? String(Number(ratio)) : '';
  $('ratioDisplay').textContent = ratioLabel(ratio);
}
function updateTypeUI(type=$('type').value) {
  const profile = typeProfiles[type] || typeProfiles.code;
  const supportsAttachment = type !== 'prompt';
  updateSubmissionHelper(type);
  $('copyLabelText').textContent = profile.copyLabel;
  $('copyHint').textContent = profile.copyHint || '';
  $('copyHint').hidden = type !== 'prompt';
  $('copyText').placeholder = profile.copyPlaceholder;
  $('copyLabel').classList.toggle('auto-generated', supportsAttachment);
  $('copyLabel').classList.toggle('prompt-copy', type === 'prompt');
  $('copyText').readOnly = supportsAttachment;
  $('copyText').required = type === 'prompt';
  $('resourceInstructionsField').hidden = type !== 'skill';
  $('resourceInstructionsLabel').textContent = profile.instructionsLabel || '安装与使用说明（可选）';
  $('resourceInstructionsHint').textContent = profile.instructionsHint || '';
  $('resourceMaterialsField').hidden = type !== 'code';
  $('resourceFileOptions').hidden = !supportsAttachment;
  $('resourceFilesTitle').textContent = type === 'skill' ? 'Skill 文件' : '视频源代码文件';
  $('attachmentOptionLabel').textContent = type === 'skill' ? 'Skill 文件' : '源代码附件';
  $('attachmentLabel').textContent = profile.attachmentLabel || '源码附件（可选）';
  $('attachmentHint').textContent = profile.attachmentHint || '';
  $('attachmentFile').accept = profile.accept || '';
  $('attachmentField').classList.toggle('required-attachment', profile.requiresAttachment);
  $('attachmentField').dataset.required = profile.requiresAttachment ? 'true' : 'false';
  if(!supportsAttachment) {
    $('sourceOption').checked = false;
    $('attachmentOption').checked = false;
  }
  syncFileOptionUI();
}

function updateSubmissionHelper(type) {
  const command = submissionHelperCommands[type] || '';
  clearTimeout(submissionHelperCopyTimer);
  $('submissionHelper').hidden = !command;
  $('submissionHelperText').value = command;
  $('submissionHelperText').scrollTop = 0;
  $('submissionHelperText').setAttribute('aria-label', `${types[type] || ''}提交辅助指令`);
  $('copySubmissionHelper').textContent = '复制指令';
  $('submissionHelperStatus').textContent = '';
  $('submissionHelperStatus').hidden = true;
}

async function copySubmissionHelper() {
  const field = $('submissionHelperText'), text = field.value;
  if (!text || $('submissionHelper').hidden) return;
  let copied = false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch { /* Select the visible readonly field for manual copying. */ }
  if (!copied) {
    if (field.value !== text || $('submissionHelper').hidden) return;
    field.focus({preventScroll:true});
    field.select();
    field.setSelectionRange(0, text.length);
  }
  if (field.value !== text || $('submissionHelper').hidden) return;
  clearTimeout(submissionHelperCopyTimer);
  $('copySubmissionHelper').textContent = copied ? '已复制' : '复制指令';
  $('submissionHelperStatus').textContent = copied ? '已复制，粘贴到你的智能体即可继续。' : '自动复制未成功，已选中全部内容，请按 Ctrl+C（Mac 使用 ⌘C）或长按复制。';
  $('submissionHelperStatus').hidden = false;
  if (copied) submissionHelperCopyTimer = setTimeout(() => {
    $('copySubmissionHelper').textContent = '复制指令';
    $('submissionHelperStatus').hidden = true;
  }, 2500);
}

function absoluteResourceUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try { return new URL(raw, location.origin).href; } catch { return raw; }
}

function resourceMaterials() {
  return $('type').value === 'code' ? $('resourceMaterials').value.split(/\r?\n/).map(value=>value.trim()).filter(Boolean) : [];
}
function generatedResourceCopy(type, source, attachment) {
  return CutCodCopy.format({type, title:$('title').value, source, attachment:attachment==='__pending_attachment__'?'':attachment, materials:resourceMaterials()});
}
function syncGeneratedCopy() {
  if ($('type').value === 'prompt') return;
  const source = $('sourceOption').checked ? $('source').value.trim() : '';
  let attachment = $('attachmentOption').checked ? savedAttachment : '';
  if (!attachment && $('attachmentOption').checked && (selectedAttachmentFile || $('attachmentFile').files[0])) {
    attachment = '__pending_attachment__';
  }
  $('copyText').value = generatedResourceCopy($('type').value, source, attachment);
}
function syncFileOptionUI() {
  const enabled = $('type').value !== 'prompt';
  const sourceSelected = enabled && $('sourceOption').checked;
  const attachmentSelected = enabled && $('attachmentOption').checked;
  $('sourceField').hidden = !sourceSelected;
  $('attachmentField').hidden = !attachmentSelected;
  $('attachmentName').hidden = !attachmentSelected;
  const sourceHint = $('sourceFieldHint');
  if (sourceHint) {
    sourceHint.hidden = !sourceSelected;
    sourceHint.textContent = '填写后会自动加入到用户的可复制内容。';
  }
  const attachmentHint = $('attachmentUserHint');
  if (attachmentHint) {
    attachmentHint.hidden = !attachmentSelected;
    attachmentHint.textContent = '上传后会自动生成下载链接，并加入到用户的可复制内容。';
  }
  if(!sourceSelected) $('source').setCustomValidity('');
  if(!attachmentSelected) $('attachmentFile').setCustomValidity('');
  syncGeneratedCopy();
}
function setAccountMenuOpen(open) {
  const menu = $('accountMenu'), entry = $('accountEntry');
  if (!menu || !entry) return;
  const visible = Boolean(open && user);
  menu.hidden = !visible;
  entry.setAttribute('aria-expanded', String(visible));
}
function syncAccountMenu() {
  const entry = $('accountEntry');
  if (!entry) return;
  const displayName = user ? (String(user.name || '').trim() || String(user.email || '').split('@')[0] || 'CutCod 用户') : '';
  entry.textContent = user ? displayName.slice(0, 2) : '登录';
  entry.title = user ? `${displayName} · 创作者中心` : '登录 / 注册';
  entry.classList.toggle('logged-in', !!user);
  entry.setAttribute('aria-expanded', 'false');
  if ($('accountMenuName')) $('accountMenuName').textContent = displayName;
  if ($('accountMenuEmail')) $('accountMenuEmail').textContent = user?.email || '';
  if ($('accountAdminItem')) $('accountAdminItem').hidden = user?.role !== 'admin';
  setAccountMenuOpen(false);
}
async function refreshSession() {
  try {
    const data=await api.request('/api/session'); user=data.user;
    $('authView').hidden=!!user; $('authView').setAttribute('aria-hidden',String(!!user)); $('creatorView').hidden=!user; const adminLink=$('adminLink'); if(adminLink) adminLink.hidden=user?.role!=='admin'; syncAccountMenu();
    if(!user && !window.CutCodAuthModal.isOpen()) window.CutCodAuthModal.open({returnTo:location.pathname+location.search,onSuccess:refreshSession});
    if(user) {
      const returnPath=window.CutCodAuthModal.consumeReturnPath?.() || '';
      if(location.pathname==='/contribute.html' && (returnPath==='/' || returnPath==='/index.html')) { location.replace(returnPath); return; }
      $('greeting').textContent=`${user.name}，这是你的作品`; await refreshResources(); if(autoOpenRequested){autoOpenRequested=false;history.replaceState(null,'',location.pathname);openEditor();}
    }
  } catch(error) {
    user=null; $('authView').hidden=false; $('authView').setAttribute('aria-hidden','false'); $('creatorView').hidden=true; const adminLink=$('adminLink'); if(adminLink) adminLink.hidden=true; syncAccountMenu();
    if(!window.CutCodAuthModal.isOpen()) window.CutCodAuthModal.open({returnTo:location.pathname+location.search,onSuccess:refreshSession});
    if(error.status && error.status!==401) window.CutCodAuthModal.setError(error.message || '登录状态暂时无法同步，请重试。');
  }
}
async function refreshResources() {
  $('listError').textContent='';
  try { myResources=(await api.request('/api/mine')).resources; renderMine(); }
  catch(error) { $('listError').textContent=error.message; if(error.status===401){user=null;$('authView').hidden=false;$('authView').setAttribute('aria-hidden','false');$('creatorView').hidden=true;syncAccountMenu();if(!window.CutCodAuthModal.isOpen())window.CutCodAuthModal.open({returnTo:location.pathname+location.search,onSuccess:refreshSession})} }
}
function renderMine() {
  $('statAll').textContent=myResources.length;
  for(const [key,status] of [['statPublished','published'],['statPending','pending'],['statDraft','draft']]) $(key).textContent=myResources.filter(r=>r.status===status).length;
  $('myResources').innerHTML=myResources.length?myResources.map(r=>`<article class="submission"><video class="thumb" muted preload="metadata" src="${esc(api.safeUrl(r.video))}"></video><div class="submission-content"><h3>${esc(r.title)}</h3><p>${types[r.type]} · ${api.date(r.updatedAt)}</p>${r.reviewNote?`<p>审核反馈：${esc(r.reviewNote)}</p>`:''}</div><span class="badge ${esc(r.status)}">${states[r.status]||'草稿'}</span><button class="quiet" data-edit="${esc(r.id)}">查看 / 编辑</button></article>`).join(''):'<div class="empty">还没有投稿。点击「提交新资源」，分享你的第一个作品。</div>';
}
function syncPublicationNote() {
  const note = $('publicationDateNote');
  if (!note) return;
  if (!editing) {
    note.textContent = '本站投稿以首次提交日期作为发布日期；后续编辑或重新发布不会改变该日期。';
    return;
  }
  const value = editing.displayPublishedAt || editing.effectivePublishedAt || '';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : (value ? new Date(value).toLocaleDateString('zh-CN', {year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Shanghai'}) : '');
  note.textContent = editing.origin === 'native'
    ? `发布日期：${date || '日期待确认'}（网站首次上传日期）`
    : `原案例发布日期：${date || '日期待确认'}。修改作品时保留该日期，来源日期由管理员核验。`;
}
function openEditor(id) {
  if(saving)return;
  videoValidation={file:null,status:'idle',message:''};
  selectedVideoFile=null; selectedAttachmentFile=null;
  editing=myResources.find(r=>r.id===id)||null; $('resourceForm').reset();
  $('editorTitle').textContent=editing?'编辑作品':'提交新资源'; $('editorError').textContent=''; $('uploadState').textContent='';
  const r=editing||{};
  syncPublicationNote();
  for(const [key,value] of Object.entries({type:r.type||'code',category:r.category||'product',title:r.title||'',source:r.source||'',description:r.desc||'',resourceInstructions:r.instructions || '',copyText:r.copy||''})) $(key).value=value;
  $('resourceMaterials').value = r.type === 'code' && Array.isArray(r.materials) ? r.materials.join('\n') : '';
  updateTypeUI($('type').value);
  const savedAttachmentUrl = typeof r.attachment === 'object' ? r.attachment?.url || '' : r.attachment || '';
  $('sourceOption').checked = Boolean(r.source);
  $('attachmentOption').checked = Boolean(savedAttachmentUrl);
  syncFileOptionUI();
  setVideoMetadata(r.duration, r.ratio);
  savedVideo=r.video||''; savedAttachment=typeof r.attachment==='object'?r.attachment?.url||'':r.attachment||'';
  if($('type').value==='prompt') savedAttachment='';
  syncGeneratedCopy();
  $('videoFileName').textContent=savedVideo.startsWith('/uploads/')?'已保存的视频':'';
  $('attachmentName').textContent=savedAttachment?'已保存附件，可选择新文件替换':'';
  $('attachmentName').hidden=!$('attachmentOption').checked;
  updatePreview(savedVideo); $('editor').showModal();$('resourceForm').scrollTop=0;document.body.style.overflow='hidden';
}
function updatePreview(url) { const preview=$('videoPreview'), zone=$('videoDropZone') || $('videoFile')?.closest('.preview-zone'); preview.pause(); preview.hidden=!url; zone?.classList.toggle('has-preview',Boolean(url)); if(url)preview.src=url;else{preview.removeAttribute('src');preview.load()} }
function closeEditor(){ $('editor').close();document.body.style.overflow=''; updatePreview(''); if(previewObjectUrl){URL.revokeObjectURL(previewObjectUrl);previewObjectUrl=''} selectedVideoFile=null; selectedAttachmentFile=null; savedVideo=''; savedAttachment=''; videoValidation={file:null,status:'idle',message:''}; }
async function submitResource(event) {
  event.preventDefault(); const desiredStatus=event.submitter?.value||'pending';
  const type=$('type').value;
  const sourceSelected=type!=='prompt' && $('sourceOption').checked;
  const attachmentSelected=type!=='prompt' && $('attachmentOption').checked;
  const videoFile=selectedVideoFile || $('videoFile').files[0], attachmentFile=attachmentSelected ? (selectedAttachmentFile || $('attachmentFile').files[0]) : null;
  const sourceValue=type==='prompt' ? (editing?.source || '') : (sourceSelected ? $('source').value.trim() : '');
  const materials=resourceMaterials();
  $('editorError').textContent='';
  if(!$('title').value.trim()){$('editorError').textContent='请填写作品标题';return;}
  if(materials.length>20){$('editorError').textContent='补充材料最多填写 20 条链接';return;}
  if(materials.some(value=>value.length>3000||!CutCodCopy.materialUrl(value,location.origin))){$('editorError').textContent='补充材料请一行填写一个有效链接，不要填写命令或说明';return;}
  if(sourceSelected&&!sourceValue){$('editorError').textContent='已选择来源链接，请填写链接地址';return;}
  if(sourceSelected&&!/^https?:\/\//i.test(sourceValue)){$('editorError').textContent='来源链接必须使用 http:// 或 https://';return;}
  if(attachmentSelected&&!attachmentFile&&!savedAttachment){$('editorError').textContent='已选择源码附件，请选择要上传的文件';return;}
  if(videoFile){
    try { api.validateUploadFile(videoFile, 'video'); }
    catch(error) { $('editorError').textContent=error.message; return; }
    if(videoValidation.file===videoFile && videoValidation.status==='loading') { $('editorError').textContent='正在读取视频元数据，请稍候再提交'; return; }
    if(videoValidation.file===videoFile && videoValidation.status==='error') { $('editorError').textContent=videoValidation.message; return; }
    if(videoValidation.file!==videoFile || videoValidation.status!=='valid') { $('editorError').textContent='无法读取视频元数据，请重新选择可播放的 MP4 或 WebM 文件'; return; }
  }
  if(desiredStatus==='pending'&&!videoFile&&!savedVideo) { $('editorError').textContent='请上传一个预览视频';return; }
  if(desiredStatus==='pending'&&type!=='prompt'&&!sourceSelected&&!attachmentSelected) { $('editorError').textContent=`${type==='skill'?'视频 Skill':'视频源代码'}请至少勾选来源链接或源码附件`;return; }
  const buttons=[$('closeEditor'),...$('resourceForm').querySelectorAll('button,input,select,textarea')]; buttons.forEach(b=>b.disabled=true); saving=true;
  try {
    if(videoFile){$('uploadState').textContent='正在上传视频…';savedVideo=(await api.upload(videoFile, 'video')).url; selectedVideoFile=null; $('videoFile').value='';$('videoFileName').textContent=`已上传：${videoFile.name}`;}
    if(attachmentFile){$('uploadState').textContent='正在上传附件…';savedAttachment=(await api.upload(attachmentFile, 'attachment')).url;selectedAttachmentFile=null;$('attachmentFile').value='';$('attachmentName').textContent=`已上传：${attachmentFile.name}`;}
    $('uploadState').textContent='正在保存…';
    const selectedAttachment=attachmentSelected?savedAttachment:'';
    const copy=type==='prompt' ? $('copyText').value : generatedResourceCopy(type,sourceValue,selectedAttachment);
    $('copyText').value=copy;
    const instructions=type==='skill' ? $('resourceInstructions').value.trim() : '';
    const payload={type,category:$('category').value,title:$('title').value.trim(),source:sourceValue,desc:$('description').value.trim(),instructions,materials,copy,video:savedVideo,attachment:selectedAttachment,status:desiredStatus};
    if(type==='code'&&editing?.type==='code')delete payload.instructions;
    // Administrator accounts can also submit their own work here. Existing
    // records keep server-managed provenance; only a new submission is native.
    if (!editing) payload.origin = 'native';
    const duration=$('duration').textContent.trim(), ratio=Number($('ratio').value);
    if(savedVideo && /^\d+:\d{2}$/.test(duration)) payload.duration=duration;
    if(savedVideo && Number.isFinite(ratio) && ratio>0) payload.ratio=ratio;
    const result=await api.request(editing?`/api/resources/${encodeURIComponent(editing.id)}`:'/api/resources',{method:editing?'PATCH':'POST',body:JSON.stringify(payload)});
    closeEditor(); await refreshResources(); toast(result.resource.status==='pending'?'已提交审核，通过后会展示在资源库':'草稿已保存');
  } catch(error) { $('editorError').textContent=error.message; }
  finally { saving=false;buttons.forEach(b=>b.disabled=false);$('uploadState').textContent=''; }
}
async function logoutFromCreator(){
  const button=$('accountLogout'); if (!button) return; button.disabled=true;
  let logoutError=null;
  try{await window.cutcodAuth.signOut();}catch(error){logoutError=error;}
  try{await api.request('/api/auth/logout',{method:'POST'});}catch(error){logoutError=logoutError||error;}
  // Refresh even if one provider call failed. This returns the page to the
  // auth view instead of leaving a stale creator dashboard visible.
  await refreshSession();
  if(logoutError) toast(logoutError.message||'退出登录失败，请重试。'); else toast('已退出登录');
  button.disabled=false;
};
$('accountLogout').onclick=event=>{event.preventDefault();logoutFromCreator()};
$('accountEntry').onclick=event=>{
  event.preventDefault();
  if (user) setAccountMenuOpen($('accountMenu').hidden);
  else window.CutCodAuthModal?.open({returnTo:location.pathname+location.search,onSuccess:refreshSession});
};
$('accountMenu').onclick=event=>event.stopPropagation();
document.addEventListener('click',event=>{const wrap=document.querySelector('.account-wrap');if(wrap&&!wrap.contains(event.target))setAccountMenuOpen(false)});
window.addEventListener('cutcod:authenticated',event=>{user=event.detail?.user||user;syncAccountMenu();refreshSession()});
$('newResource').onclick=()=>openEditor();$('refreshList').onclick=refreshResources;
$('myResources').onclick=event=>{const button=event.target.closest('[data-edit]');if(button)openEditor(button.dataset.edit)};
$('closeEditor').onclick=closeEditor;$('editor').addEventListener('cancel',event=>{
  if(event.target!==event.currentTarget)return;
  event.preventDefault();
  if(filePickerActive || filePickerCanceled.video || filePickerCanceled.attachment) {
    filePickerActive=false; filePickerCanceled.video=false; filePickerCanceled.attachment=false;
    return;
  }
  if(!saving)closeEditor();
});
$('resourceForm').onsubmit=submitResource;
$('copySubmissionHelper').onclick=copySubmissionHelper;
function clearDraftForTypeSwitch() {
  if(previewObjectUrl){URL.revokeObjectURL(previewObjectUrl);previewObjectUrl='';}
  selectedVideoFile=null; selectedAttachmentFile=null; savedVideo=''; savedAttachment=''; editing=null;
  syncPublicationNote();
  $('videoFile').value=''; $('attachmentFile').value=''; $('title').value=''; $('description').value=''; $('source').value='';
  $('resourceInstructions').value=''; $('resourceMaterials').value=''; $('copyText').value=''; $('sourceOption').checked=false; $('attachmentOption').checked=false;
  $('videoFileName').textContent=''; $('attachmentName').textContent=''; $('editorError').textContent=''; $('uploadState').textContent='';
  setVideoMetadata(NaN,NaN); updatePreview(''); videoValidation={file:null,status:'idle',message:''};
}
$('type').onchange=()=>{clearDraftForTypeSwitch();updateTypeUI();$('editorTitle').textContent='提交新资源';toast('已切换分组，当前未保存内容已清空')};
$('sourceOption').onchange=()=>syncFileOptionUI();
$('attachmentOption').onchange=()=>syncFileOptionUI();
$('source').oninput=syncGeneratedCopy;
$('resourceInstructions').oninput=syncGeneratedCopy;
$('resourceMaterials').oninput=syncGeneratedCopy;
$('title').oninput=syncGeneratedCopy;
function setInputFile(input,file) { try { const transfer=new DataTransfer(); transfer.items.add(file); input.files=transfer.files; } catch { /* 状态变量仍可供提交使用 */ } }
function handleVideoFile(file) {
  filePickerActive=false; filePickerCanceled.video=false; selectedVideoFile=file||null; videoValidation={file:file,status:'idle',message:''};
  if(!file){$('videoFileName').textContent='';setVideoMetadata(NaN,NaN);updatePreview('');return;}
  try { api.validateUploadFile(file, 'video'); }
  catch(error) { selectedVideoFile=null; videoValidation.status='error';videoValidation.message=error.message;$('videoFileName').textContent=error.message;$('editorError').textContent=error.message;$('videoFile').value='';updatePreview('');return; }
  $('editorError').textContent='';$('videoFileName').textContent=`正在读取：${file.name}`;setVideoMetadata(NaN,NaN);videoValidation.status='loading';
  if(previewObjectUrl)URL.revokeObjectURL(previewObjectUrl);previewObjectUrl=URL.createObjectURL(file);updatePreview(previewObjectUrl);
}
function handleAttachmentFile(file) {
  filePickerActive=false; filePickerCanceled.attachment=false; selectedAttachmentFile=file||null;
  if(!file){$('attachmentName').textContent='';syncGeneratedCopy();return;}
  try { api.validateUploadFile(file, 'attachment'); $('attachmentName').textContent=file.name; $('editorError').textContent=''; syncGeneratedCopy(); }
  catch(error) { selectedAttachmentFile=null; $('attachmentName').textContent=error.message; $('editorError').textContent=error.message; $('attachmentFile').value=''; syncGeneratedCopy(); }
}
$('videoFile').onchange=()=>{const file=$('videoFile').files[0];if(!file&&filePickerCanceled.video){filePickerCanceled.video=false;return;}handleVideoFile(file)};
$('attachmentFile').onchange=()=>{const file=$('attachmentFile').files[0];if(!file&&filePickerCanceled.attachment){filePickerCanceled.attachment=false;return;}handleAttachmentFile(file)};
$('videoFile').addEventListener('click',()=>{filePickerActive=true;filePickerCanceled.video=false});
$('attachmentFile').addEventListener('click',()=>{filePickerActive=true;filePickerCanceled.attachment=false});
$('videoFile').addEventListener('cancel',()=>{filePickerCanceled.video=true;setTimeout(()=>{filePickerActive=false;filePickerCanceled.video=false},300)});
$('attachmentFile').addEventListener('cancel',()=>{filePickerCanceled.attachment=true;setTimeout(()=>{filePickerActive=false;filePickerCanceled.attachment=false},300)});
function bindDropZone(zone,input,kind) {
  if(!zone||!input)return;
  ['dragenter','dragover'].forEach(name=>zone.addEventListener(name,event=>{event.preventDefault();event.stopPropagation();zone.classList.add('is-dragover');event.dataTransfer.dropEffect='copy'}));
  ['dragleave','drop'].forEach(name=>zone.addEventListener(name,event=>{event.preventDefault();event.stopPropagation();if(name==='dragleave'&&event.relatedTarget&&zone.contains(event.relatedTarget))return;zone.classList.remove('is-dragover')}));
  zone.addEventListener('drop',event=>{const files=Array.from(event.dataTransfer.files||[]);if(files.length!==1){$('editorError').textContent='请一次拖入一个文件';return;}setInputFile(input,files[0]);kind==='video'?handleVideoFile(files[0]):handleAttachmentFile(files[0])});
}
function prepareUploadZones() {
  const videoInput=$('videoFile'); let videoZone=videoInput?.closest('.preview-zone');
  if(videoZone&&videoZone.tagName==='LABEL'){const replacement=document.createElement('div');Array.from(videoZone.attributes).forEach(attribute=>replacement.setAttribute(attribute.name,attribute.value));while(videoZone.firstChild)replacement.append(videoZone.firstChild);videoZone.replaceWith(replacement);videoZone=replacement;}
  if(videoZone){videoZone.id='videoDropZone';const preview=$('videoPreview');if(preview&&!videoZone.contains(preview))videoZone.append(preview);videoZone.addEventListener('click',event=>{if(event.target.closest('video')||event.target===videoInput)return;videoInput.click()});videoZone.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target===videoZone){event.preventDefault();videoInput.click()}});bindDropZone(videoZone,videoInput,'video')}
  bindDropZone($('attachmentField'),$('attachmentFile'),'attachment');
}
prepareUploadZones();
$('videoPreview').onloadedmetadata=()=>{const v=$('videoPreview');if(!Number.isFinite(v.duration)||v.duration<=0||!v.videoWidth||!v.videoHeight){videoValidation.status='error';videoValidation.message='无法读取视频时长或尺寸，请重新选择文件';$('editorError').textContent=videoValidation.message;return;}const ratio=v.videoWidth/v.videoHeight;if(ratio<0.2||ratio>5){videoValidation.status='error';videoValidation.message='视频宽高比需在 0.2 至 5 之间';$('editorError').textContent=videoValidation.message;return;}setVideoMetadata(v.duration,ratio);videoValidation.status='valid';videoValidation.message='';$('videoFileName').textContent=`已读取：${videoValidation.file?.name||'视频文件'}`};
$('videoPreview').onerror=()=>{if(videoValidation.file){videoValidation.status='error';videoValidation.message='视频无法解码，请选择可播放的 MP4 或 WebM 文件';$('editorError').textContent=videoValidation.message;}};
window.addEventListener('focus',()=>{setTimeout(()=>{if(!filePickerCanceled.video&&!filePickerCanceled.attachment)filePickerActive=false},0);if(!$('editor').open && !window.CutCodAuthModal.isOpen())refreshSession().catch(error=>toast(error.message))});
refreshSession().catch(error=>toast(error.message==='Failed to fetch'?'本地服务尚未启动，请先启动 CutCod 服务。':error.message));

