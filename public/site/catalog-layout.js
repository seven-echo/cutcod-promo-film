let videos = [];
let currentLang='zh';
const languageLabels={
  zh:{typeNames:{skill:'视频 Skill',code:'视频源代码',prompt:'视频提示词'},categories:{all:'全部',product:'产品动画',knowledge:'知识讲解',other:'其他'},sortLabel:'排序',sort:{latest:'最新',popular:'最热门',recommended:'推荐'},results:'个案例',search:'搜索视频、作者或标签',copyHint:{skill:'复制到你常用的智能体即可使用',code:'复制到你常用的智能体即可使用',prompt:'复制完整提示词'}},
  en:{typeNames:{skill:'Video Skills',code:'Source Code',prompt:'Video Prompts'},categories:{all:'All',product:'Product Motion',knowledge:'Explainers',other:'Other'},sortLabel:'Sort',sort:{latest:'Latest',popular:'Popular',recommended:'Recommended'},results:'results',search:'Search videos, creators or tags',copyHint:{skill:'Copy install / usage text',code:'Copy and use it in your usual AI agent',prompt:'Copy full prompt'}}
};
let typeNames=languageLabels[currentLang].typeNames;
const grid=document.getElementById('grid'), empty=document.getElementById('empty'), results=document.getElementById('results'), searchInput=document.getElementById('searchInput'), sortDropdown=document.getElementById('sortDropdown'), sortTrigger=document.getElementById('sortTrigger'), sortMenu=document.getElementById('sortMenu');
let activeType='code', activeCategory='all', sortMode='recommended', current=null;
const copySvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="11" height="11" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg>';
const checkSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 4 4L19 7"></path></svg>';
const heartSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733C11.285 4.876 9.623 3.75 7.688 3.75 5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"></path></svg>';
// Keep card nodes attached: media loading must never rebuild the masonry columns.
let masonryLayoutFrame=0;
let masonryContainerObserver=null;
let masonryCardObserver=null;
let masonryObservedCards=new Set();
let masonryWidth=0;
let cardVideoObserver=null;
let cardPreloadObserver=null;
let visibleCardVideos=new Set();
let playbackFrame=0;
let scrollIdleTimer=0;
let catalogScrolling=false;
const networkInformation=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
const constrainedNetwork=!!(networkInformation?.saveData||/^(slow-2g|2g)$/.test(networkInformation?.effectiveType||''));
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
function pauseCardPlayback(){grid.querySelectorAll('video').forEach(video=>video.pause())}
function cancelSynchronizedPlayback(){
  cardVideoObserver?.disconnect();cardPreloadObserver?.disconnect();
  cardVideoObserver=null;cardPreloadObserver=null;
  cancelAnimationFrame(playbackFrame);playbackFrame=0;
  pauseCardPlayback();visibleCardVideos.clear();
}
function loadCardVideo(video){
  const src=video.dataset.videoSrc;
  if(src && !video.getAttribute('src')){video.preload='metadata';video.src=src;video.load()}
}
function releaseCardVideo(video){
  video.pause();
  if(video.getAttribute('src')){video.removeAttribute('src');video.load()}
}
function updateCardPlayback(){
  playbackFrame=0;
  const blocked=document.hidden||catalogScrolling||reducedMotion.matches||constrainedNetwork||document.getElementById('modalBackdrop').classList.contains('open');
  let playing=0;
  for(const video of visibleCardVideos){
    if(!video.isConnected){visibleCardVideos.delete(video);continue}
    if(blocked || playing>=4){video.pause();continue}
    playing++;
    loadCardVideo(video);
    if(video.paused) video.play().catch(()=>{});
  }
}
function scheduleCardPlayback(){
  if(!playbackFrame) playbackFrame=requestAnimationFrame(updateCardPlayback);
}
function startSynchronizedPlayback(){
  const media=[...grid.querySelectorAll('.card video')];
  if(!('IntersectionObserver' in window)) return;
  cardVideoObserver=new IntersectionObserver(entries=>{
    for(const {target,isIntersecting} of entries){
      if(isIntersecting){visibleCardVideos.add(target);loadCardVideo(target)}
      else{visibleCardVideos.delete(target);target.pause()}
    }
    scheduleCardPlayback();
  },{threshold:.15});
  cardPreloadObserver=new IntersectionObserver(entries=>{
    for(const {target,isIntersecting} of entries){
      if(isIntersecting){if(!target.poster)loadCardVideo(target)}
      else if(!visibleCardVideos.has(target)) releaseCardVideo(target);
    }
  },{rootMargin:'200px 0px',threshold:0});
  media.forEach(video=>{cardVideoObserver.observe(video);cardPreloadObserver.observe(video)});
}
window.addEventListener('scroll',()=>{
  if(!catalogScrolling){catalogScrolling=true;pauseCardPlayback()}
  clearTimeout(scrollIdleTimer);
  scrollIdleTimer=setTimeout(()=>{catalogScrolling=false;scheduleCardPlayback()},180);
},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseCardPlayback();else scheduleCardPlayback()});
reducedMotion.addEventListener?.('change',scheduleCardPlayback);
function scheduleMasonryLayout(){
  if(!masonryLayoutFrame)masonryLayoutFrame=requestAnimationFrame(()=>{masonryLayoutFrame=0;layoutMasonry()});
}
function watchMasonrySizes(cards){
  if(!('ResizeObserver' in window))return;
  if(!masonryContainerObserver){
    masonryContainerObserver=new ResizeObserver(entries=>{
      const width=entries[0].contentRect.width;
      if(Math.abs(width-masonryWidth)>.5)scheduleMasonryLayout();
    });
    masonryContainerObserver.observe(grid);
  }
  if(!masonryCardObserver)masonryCardObserver=new ResizeObserver(scheduleMasonryLayout);
  if(cards.length!==masonryObservedCards.size||cards.some(card=>!masonryObservedCards.has(card))){
    masonryCardObserver.disconnect();cards.forEach(card=>masonryCardObserver.observe(card));
    masonryObservedCards=new Set(cards);
  }
}
function layoutMasonry(){
  const cards=[...grid.querySelectorAll('.card')];
  const width=grid.clientWidth;
  if(!width)return;
  masonryWidth=width;
  const gap=width<560?12:Math.min(24,Math.max(16,width*.0125));
  const minWidth=width<600?160:width<900?190:220;
  const count=Math.min(5,Math.max(1,Math.floor((width+gap)/(minWidth+gap))));
  const cardWidth=(width-gap*(count-1))/count;
  const widthStyle=cardWidth+'px';
  // Write widths, then read all heights together: no repeated layout/DOM reparenting.
  cards.forEach(card=>{if(card.style.width!==widthStyle)card.style.width=widthStyle});
  const heights=cards.map(card=>card.offsetHeight);
  const columns=Array(count).fill(0), rowGap=width<560?20:25;
  cards.forEach((card,i)=>{
    const column=columns.indexOf(Math.min(...columns));
    const left=(column*(cardWidth+gap))+'px',top=columns[column]+'px';
    if(card.style.left!==left)card.style.left=left;
    if(card.style.top!==top)card.style.top=top;
    columns[column]+=heights[i]+rowGap;
  });
  const height=(cards.length?Math.max(...columns)-rowGap:0)+'px';
  if(grid.style.height!==height)grid.style.height=height;
  grid.dataset.columns=String(count);
  watchMasonrySizes(cards);
}
