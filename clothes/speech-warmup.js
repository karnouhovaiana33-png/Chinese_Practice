/* Shared, offline tone routes. Spoken answers are confirmed by the learner/teacher. */
window.SPEECH_WARMUP = (() => {
  'use strict';
  const lessons = {
    1: {name:'Парк животных', sounds:'b · p · m · f', syllables:['ma','bo','pa','fa'], pair:'pa — fa: одинаковая финаль a'},
    2: {name:'Квартал красок', sounds:'d · t · n · l', syllables:['na','la','da','ta'], pair:'da — ta: одинаковая финаль a'},
    3: {name:'Гардероб дракона', sounds:'g · k · h', syllables:['ha','gu','ge','ke'], pair:'ge — ke: одинаковая финаль e'}
  };
  const tones = [
    {name:'По канату', hint:'Высоко и ровно', gesture:'Держи голос на одной высоте.', path:'M140 165 L860 165', icon:'M3 8H37'},
    {name:'На горку', hint:'Снизу вверх', gesture:'Плавно поднимай голос вместе с героем.', path:'M160 365 L840 155', icon:'M3 23L37 4'},
    {name:'Через лужу', hint:'Вниз, затем вверх', gesture:'Опусти голос низко, затем подними.', path:'M140 165 C300 165 330 365 510 365 S720 250 860 250', icon:'M3 5Q18 38 37 13'},
    {name:'Прыжок с вышки', hint:'Резко вниз', gesture:'Начни высоко и резко опусти голос.', path:'M420 155 Q470 200 600 365', icon:'M3 4L37 24'}
  ];
  const vowels = {a:'āáǎà',o:'ōóǒò',e:'ēéěè',i:'īíǐì',u:'ūúǔù'};
  const form = (syllable,tone) => syllable.replace(/[aoeiu]/,v=>vowels[v][tone]);
  let ctx, dialog, launcher, current, frame=0, progress=0, travelled=false, dragging=null, activeGroup=null, previousFocus=null, closingReason=null;
  const $ = selector => dialog.querySelector(selector);
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function state() {
    const group=ctx.state();
    if(!group.speechWarmup || group.speechWarmup.version!==1)group.speechWarmup={version:1,cursor:0,done:[],deferred:false};
    const s=group.speechWarmup;
    s.cursor=Number.isInteger(s.cursor)?Math.max(0,Math.min(15,s.cursor)):0;
    s.done=[...new Set(Array.isArray(s.done)?s.done.filter(n=>Number.isInteger(n)&&n>=0&&n<16):[])];
    return s;
  }
  function stop(){cancelAnimationFrame(frame);frame=0;dragging=null;}
  function notice(text){const el=$('#tw-status');if(el)el.textContent=text;}
  function close(reason){closingReason=reason;dialog.close();}
  function defer(){if(current&&current.done.length<16){current.deferred=true;ctx.save();}close(current.done.length===16?'complete':'defer');}

  function scenery(tone) {
    const background='<rect width="1000" height="440" rx="24" fill="#edf5ed"/><circle cx="879" cy="64" r="31" fill="#ffe6a4"/><path d="M0 335Q160 250 300 320T600 310T1000 300V440H0Z" fill="#d9e8d6"/>';
    const scenes=[
      '<g stroke="#6c8d77" stroke-width="12" fill="#c4d5ba"><path d="M140 165V430M860 165V430"/><path d="M91 212H188M91 280H188M812 212H908M812 280H908"/></g><path d="M140 165H860" stroke="#b38b54" stroke-width="22"/><path d="M140 173H860" stroke="#e9cc91" stroke-width="3"/>',
      '<path d="M90 415L840 155L980 415Z" fill="#91b59a"/><path d="M160 378L840 167" stroke="#c5d8a9" stroke-width="24"/><path d="M840 155V62" stroke="#466e60" stroke-width="7"/><path d="M844 62L921 84L844 103Z" fill="#ef9b5d"/><g fill="#76977f"><ellipse cx="355" cy="335" rx="19" ry="8"/><ellipse cx="657" cy="241" rx="23" ry="8"/></g>',
      '<path d="M0 165H140C300 165 330 365 510 365S720 250 860 250H1000V440H0Z" fill="#bfaf8d"/><path d="M0 165H140M860 250H1000" stroke="#82a481" stroke-width="19"/><ellipse cx="510" cy="372" rx="119" ry="22" fill="#75bed0"/><ellipse cx="510" cy="372" rx="79" ry="10" fill="none" stroke="#c2e7e9" stroke-width="4"/><g stroke="#8c795b" stroke-width="7"><path d="M726 298L758 292M766 276L798 270M812 260L838 255"/></g>',
      '<g stroke="#9a7c55" stroke-width="12" fill="none"><path d="M330 155V425M420 155V425M330 217H420M330 279H420M330 341H420M330 403H420"/><path d="M300 155H437" stroke-width="22"/></g><path d="M550 382Q642 346 751 382" stroke="#a1c38a" stroke-width="26" fill="none"/><g fill="#f4bc62"><path d="M620 400l8-18 7 18zM662 404l7-17 7 17z"/></g>'
    ];
    return background+scenes[tone];
  }
  function setProgress(value) {
    progress=Math.max(0,Math.min(1,value));
    const path=$('#tw-route'),character=$('#tw-character');if(!path||!character)return;
    const length=path.getTotalLength(),p=path.getPointAtLength(length*progress);
    character.style.left=`${p.x/10}%`;character.style.top=`${p.y/4.4}%`;
    $('#tw-trail').style.strokeDasharray=`${length*progress} ${length}`;
    $('#tw-position').value=Math.round(progress*100);
    if(progress>=.995){
      travelled=true;$('#tw-confirm').disabled=false;
      notice(ctx.homework?'Произнеси слог вслух и сравни направление голоса с дорожкой. Затем нажми «Произнёс(ла)».':'Произнеси слог вслух. Учитель слушает. Затем нажми «Произнёс(ла)».');
    }
  }
  function animate() {
    stop();setProgress(0);travelled=false;$('#tw-confirm').disabled=true;
    notice(tones[current.cursor%4].gesture+' Произноси слог во время движения.');
    if(reduced()){setProgress(1);return;}
    const duration=current.cursor%4===3?1000:current.cursor%4===2?2700:2200;
    let start;
    const tick=time=>{if(!dialog.open||document.hidden){stop();return;}start??=time;setProgress(Math.min(1,(time-start)/duration));if(progress<1)frame=requestAnimationFrame(tick);else frame=0;};
    frame=requestAnimationFrame(tick);
  }
  function nearest(clientX,clientY) {
    const path=$('#tw-route'),matrix=path.getScreenCTM(),length=path.getTotalLength();
    let best={distance:Infinity,t:0};
    for(let i=0;i<=160;i++){
      const point=path.getPointAtLength(length*i/160),screen=new DOMPoint(point.x,point.y).matrixTransform(matrix);
      const distance=Math.hypot(screen.x-clientX,screen.y-clientY);
      if(distance<best.distance)best={distance,t:i/160};
    }
    return best;
  }
  function bindRoute() {
    const hero=$('#tw-character');
    hero.onpointerdown=e=>{
      if(e.button!==0)return;stop();
      const path=$('#tw-route'),point=path.getPointAtLength(path.getTotalLength()*progress),screen=new DOMPoint(point.x,point.y).matrixTransform(path.getScreenCTM());
      dragging={id:e.pointerId,moved:false,x:e.clientX,y:e.clientY,offsetX:e.clientX-screen.x,offsetY:e.clientY-screen.y};
      hero.setPointerCapture(e.pointerId);
    };
    hero.onpointermove=e=>{
      if(!dragging||dragging.id!==e.pointerId)return;
      if(Math.hypot(e.clientX-dragging.x,e.clientY-dragging.y)>4)dragging.moved=true;
      const target=nearest(e.clientX-dragging.offsetX,e.clientY-dragging.offsetY);
      if(target.distance<Math.max(42,$('#tw-scene').clientWidth*.045)&&target.t>=progress-.04&&target.t<=progress+.16){setProgress(Math.max(progress,target.t));e.preventDefault();}
    };
    hero.onpointerup=e=>{if(!dragging||dragging.id!==e.pointerId)return;const moved=dragging.moved;dragging=null;if(hero.hasPointerCapture(e.pointerId))hero.releasePointerCapture(e.pointerId);if(!moved)animate();};
    hero.onpointercancel=()=>{dragging=null;};
    hero.onclick=e=>{if(e.detail===0)animate();};
    $('#tw-play').onclick=animate;
    $('#tw-position').oninput=e=>{stop();setProgress(Number(e.target.value)/100);};
    const confirm=()=>{
      if(!travelled)return;
      stop();if(!current.done.includes(current.cursor))current.done.push(current.cursor);
      current.deferred=false;
      if(current.done.length<16){
        let next=(current.cursor+1)%16;while(current.done.includes(next))next=(next+1)%16;current.cursor=next;
      }
      ctx.save();render();$('#tw-play')?.focus();
    };
    $('#tw-confirm').onclick=confirm;
    // A fresh tap immediately after a touch drag may suppress Chrome's synthetic click.
    // Confirm on release inside the button; rendering removes the old click target.
    $('#tw-confirm').onpointerup=e=>{
      if(e.pointerType!=='touch'||!e.isPrimary)return;
      const r=e.currentTarget.getBoundingClientRect();
      if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom){e.preventDefault();confirm();}
    };
  }
  function render() {
    stop();ctx.stopAudio();progress=0;travelled=false;
    const data=lessons[ctx.lesson],syllableIndex=Math.floor(current.cursor/4),tone=current.cursor%4,syllable=data.syllables[syllableIndex],complete=current.done.length===16;
    dialog.dataset.tone=String(tone+1);dialog.dataset.syllable=syllable;dialog.dataset.complete=String(complete);
    dialog.innerHTML=`<div class="tw-shell">
      <header class="tw-top">${ctx.homework?'<button id="tw-pause" type="button">Пауза</button>':'<a href="map.html" class="tw-map">← Карта</a>'}<span>${ctx.homework?`ДЗ · УРОК ${ctx.lesson} <span id="tw-homework-clock"></span>`:`УРОК ${ctx.lesson} · ГРУППА ${ctx.group()+1}`}</span><button id="tw-defer" type="button">${complete?(ctx.homework?'К заданиям →':'К уроку →'):(ctx.homework?'Пока трудно':'Отложить')}</button></header>
      <div class="tw-heading"><div><p class="tw-eyebrow">ГОЛОС В ПУТИ · ${data.sounds}</p><h1 id="tw-title">${complete?'Маршруты пройдены!':'Речевая разминка'}</h1></div><span class="tw-count">${current.done.length} / 16<span>маршрутов</span></span></div>
      <nav class="tw-syllables" aria-label="Слоги разминки">${data.syllables.map((s,i)=>`<button type="button" data-tw-syllable="${i}" ${complete?'disabled':''} aria-pressed="${!complete&&i===syllableIndex}" aria-label="Слог ${s}, ${current.done.filter(n=>Math.floor(n/4)===i).length} из 4 маршрутов"><img src="assets/art/syllables/${s}.png" alt="" draggable="false"><span>${s}</span><small>${[0,1,2,3].map(t=>current.done.includes(i*4+t)?'●':'○').join(' ')}</small></button>`).join('')}</nav>
      ${complete?`<div class="tw-finish"><h2>А теперь сравни пару</h2><p>Произнеси два слога по очереди.<br>В каждой паре сохраняй одинаковый тон.</p><div class="tw-pair-examples">${tones.map((_,t)=>`<span>${form(data.syllables[2],t)} — ${form(data.syllables[3],t)}</span>`).join('')}</div><p class="tw-pair">${data.pair}</p><button class="tw-primary" id="tw-lesson">Пары произнесены · ${ctx.homework?'к заданиям':'к уроку'} →</button><button class="tw-secondary" id="tw-restart">Повторить все маршруты</button></div><p class="tw-footnote">${data.name} ждёт тебя.</p>`:
      `<nav class="tw-tones" aria-label="Выбрать тон">${tones.map((t,i)=>`<button type="button" data-tw-tone="${i}" aria-pressed="${i===tone}" aria-label="${i+1}-й тон, ${t.name}"><svg viewBox="0 0 40 30" aria-hidden="true"><path d="${t.icon}"/></svg><span>${i+1}-й тон</span><small>${t.name}${current.done.includes(syllableIndex*4+i)?' ✓':''}</small></button>`).join('')}</nav>
      <div class="tw-route-heading"><strong>${form(syllable,tone)}</strong><span>${tones[tone].hint}<small>${tones[tone].gesture}</small></span>${ctx.toneModels?`<button type="button" id="tw-model" class="tw-model" aria-label="Послушать образец ${tone+1}-го тона на слоге ${ctx.toneModels[tone].label}">Образец <b>${ctx.toneModels[tone].label}</b></button>`:`<span class="tw-difficulty">${syllableIndex<2?'Разогреваемся':'Сравниваем слоги'}</span>`}</div>
      <div class="tw-scene" id="tw-scene"><svg viewBox="0 0 1000 440" preserveAspectRatio="none" aria-hidden="true">${scenery(tone)}<path id="tw-route" d="${tones[tone].path}" fill="none" stroke="#fdf9e9" stroke-width="10" stroke-linecap="round" stroke-dasharray="3 22"/><path id="tw-trail" d="${tones[tone].path}" fill="none" stroke="#e6a443" stroke-width="8" stroke-linecap="round" stroke-dasharray="0 2000"/><circle cx="${tone===3?420:tone===1?160:140}" cy="${tone===1?365:tone===3?155:165}" r="13" fill="#436e60" stroke="#fff8e9" stroke-width="5"/><circle cx="${tone===3?600:tone===1?840:860}" cy="${tone===3?365:tone===1?155:tone===2?250:165}" r="15" fill="#eab85e" stroke="#fff8e9" stroke-width="5"/></svg><button type="button" id="tw-character" aria-label="Вести слог ${syllable} по маршруту. Enter — показать движение."><img src="assets/art/syllables/${syllable}.png" alt="Слог ${syllable} с глазками, ручками и кедами" draggable="false"></button></div>
      <div class="tw-controls"><div class="tw-actions"><button type="button" class="tw-secondary" id="tw-play">${ctx.homework?'':'▶ '}Показать маршрут</button><button type="button" class="tw-primary" id="tw-confirm" disabled>Произнёс(ла) · дальше →</button></div><label class="tw-slider">Веди героя <input id="tw-position" type="range" min="0" max="100" value="0" aria-label="Положение героя на тоновом маршруте"></label><p id="tw-status" role="status">${ctx.homework?`Послушай тон на слоге ${ctx.toneModels[tone].label}. Затем произноси`: 'Послушай учителя. Затем произноси'} <b>${form(syllable,tone)}</b> и веди героя по дорожке.</p></div><p class="tw-footnote">${syllableIndex<2?'Каждый слог пройдёт четыре маршрута.':data.pair+' · Меняем начало, сохраняем финаль.'}</p>`}
    </div>`;
    $('#tw-defer').onclick=defer;
    if(ctx.homework)$('#tw-pause').onclick=()=>close('pause');
    dialog.querySelectorAll('[data-tw-syllable]').forEach(b=>b.onclick=()=>{
      const i=Number(b.dataset.twSyllable),first=[0,1,2,3].find(t=>!current.done.includes(i*4+t));
      current.cursor=i*4+(first??0);ctx.save();render();
    });
    if(complete){
      $('#tw-lesson').onclick=()=>close('complete');
      $('#tw-restart').onclick=()=>{current.done=[];current.cursor=0;current.deferred=false;ctx.save();render();$('#tw-play').focus();};
    }else{
      dialog.querySelectorAll('[data-tw-tone]').forEach(b=>b.onclick=()=>{current.cursor=syllableIndex*4+Number(b.dataset.twTone);ctx.save();render();});
      setProgress(0);bindRoute();
      if(ctx.toneModels)$('#tw-model').onclick=()=>ctx.say(ctx.toneModels[tone].text);
    }
  }
  function open() {
    if(!ctx)return;
    const other=document.querySelector('dialog[open]');if(other&&other!==dialog)return;
    closingReason=null;ctx.stopAudio();current=state();current.deferred=false;ctx.save();activeGroup=ctx.state();previousFocus=document.activeElement;render();
    if(!dialog.open)dialog.showModal();
    (current.done.length===16?$('#tw-lesson'):$('#tw-play')).focus();
  }
  function sync() {
    if(!ctx||ctx.auto===false)return;
    if(dialog.open&&activeGroup!==ctx.state()){stop();dialog.close();}
    const s=state();launcher.setAttribute('aria-label',s.done.length===16?'Повторить речевую разминку':'Речевая разминка');
    if(!dialog.open&&s.done.length<16&&!s.deferred&&!document.querySelector('dialog[open]'))open();
  }
  function attach(options) {
    ctx=options;
    dialog=document.createElement('dialog');dialog.id='speech-warmup';dialog.className='tw-dialog';dialog.setAttribute('aria-labelledby','tw-title');document.body.append(dialog);
    dialog.addEventListener('cancel',e=>{e.preventDefault();ctx.homework?close('pause'):defer();});
    dialog.addEventListener('close',()=>{stop();ctx.stopAudio();if(previousFocus?.isConnected)previousFocus.focus();ctx.onClose?.(closingReason||'pause');closingReason=null;});
    document.addEventListener('close',e=>{if(e.target!==dialog)queueMicrotask(sync);},true);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
    window.addEventListener('pagehide',stop);
    launcher=document.createElement('button');launcher.type='button';launcher.id='speech-warmup-open';launcher.className='tw-launcher';launcher.textContent='Разминка';launcher.onclick=open;
    if(!ctx.hideLauncher)document.querySelector('.hud-actions,.topbar nav').prepend(launcher);
    sync();
  }
  return {attach,sync,open,close};
})();
