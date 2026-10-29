(() => {
  'use strict';
  const D=CLOTHES_HOMEWORK_DATA,W=D.words,KEY='chinesequest-clothes-homework-v1',$=s=>document.querySelector(s);
  const stages=[['Речевая разминка',3],['Эхо гардероба',2],['Соедини пары',2],['Мэмори',3],['Верни порядок',3],['Мой гардероб',2],['Пропись',10]];
  const shuffle=items=>{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  const makeDeck=()=>[...shuffle(W.slice(0,3).flatMap(w=>[w.id+':word',w.id+':picture'])),...shuffle(W.slice(3).flatMap(w=>[w.id+':word',w.id+':picture']))];
  const fresh=()=>({schema:2,started:false,stage:0,elapsed:0,done:[],deferred:[],echo:0,heard:{},matched:[],deck:makeDeck(),memory:[],memoryRound:0,memoryHint:false,phrase:0,order:[],phraseReady:false,written:[],writing:{},hunt:0,huntSelected:null,huntResponses:[]});
  let S=fresh();try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved?.schema===1||saved?.schema===2)S={...S,...saved};}catch(_){}
  if(S.schema===1){
    const remap=n=>n===6?5:n===5?6:n;
    S.done=(Array.isArray(S.done)?S.done:[]).filter(n=>n!==5).map(remap);
    S.deferred=(Array.isArray(S.deferred)?S.deferred:[]).map(remap);
    if(S.stage>=5)S.stage=S.hunt>=3||S.done.includes(5)||S.deferred.includes(5)?6:5;
    S.schema=2;
  }
  CLOTHES_COPYBOOK.ensure(S);
  if(S.done.includes(6)&&CLOTHES_COPYBOOK.count(S)<13){
    S.done=S.done.filter(stage=>stage!==6);
    if(S.stage>=7&&S.elapsed<1800)S.stage=6;
  }
  S.stage=Math.max(0,Math.min(7,Number(S.stage)||0));S.elapsed=Math.max(0,Math.min(1800,Number(S.elapsed)||0));
  for(const key of ['done','deferred'])S[key]=[...new Set((Array.isArray(S[key])?S[key]:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<7))];
  let active=false,dispose=null,audio=null,flipped=[],locked=false,memoryTimer,recording=null,stream=null,recordTimer=null,recordToken=0,voiceURL=null,view=0,lastTick=performance.now();
  const word=id=>W.find(w=>w.id===id),art=w=>w.sprite===null?`<span class="clothing-collection">${[0,2,8].map(sprite=>spriteArt(sprite)).join('')}</span>`:spriteArt(w.sprite);
  function spriteArt(sprite){return `<span class="clothing-art" aria-hidden="true" style="--clothes-x:${sprite%5*25}%;--clothes-y:${Math.floor(sprite/5)/3*100}%"></span>`;}
  const picture=w=>`<span class="clothing-picture" role="img" aria-label="${w.ru}">${art(w)}</span>`;
  function save(){try{localStorage.setItem(KEY,JSON.stringify(S));$('#hw-save').textContent='Сохранено';}catch(_){$('#hw-save').textContent='Не удалось сохранить прогресс';}}
  function note(text){const target=$('#speech-warmup[open] #tw-status')||$('#status')||$('#hw-feedback');target.textContent=text;target.hidden=false;}
  function stopAudio(){audio?.pause();audio=null;}
  function cleanup(){view++;dispose?.();dispose=null;clearTimeout(memoryTimer);clearTimeout(recordTimer);recordToken++;if(recording?.state==='recording')recording.stop();recording=null;stream?.getTracks().forEach(track=>track.stop());stream=null;if(voiceURL)URL.revokeObjectURL(voiceURL);voiceURL=null;stopAudio();flipped=[];locked=false;}
  function feedback(correct){const panel=$('.hw-panel');if(!panel)return;panel.classList.remove('wrong-answer','correct-answer');void panel.offsetWidth;panel.classList.add(correct?'correct-answer':'wrong-answer');}
  function say(text,ended){
    stopAudio();const src=CLOTHES_HOMEWORK_AUDIO[text]||AUDIO_MANIFEST[text];
    if(!src){note('Не удалось найти образец. Можно оставить этот шаг учителю.');return;}
    const token=view,a=audio=new Audio(src);
    a.onended=()=>{if(audio===a&&token===view&&active)ended?.();};
    a.onerror=()=>{if(audio===a)note('Запись не открылась. Попробуй ещё раз или оставь шаг учителю.');};
    a.play().catch(()=>{if(audio===a)note('Нажми «Послушать» ещё раз и проверь звук.');});
  }
  function clock(){const left=Math.max(0,1800-Math.floor(S.elapsed)),text=`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`;const el=$('#clock');if(el){el.textContent='Осталось '+text;el.classList.toggle('urgent',left<180);}if($('#tw-homework-clock'))$('#tw-homework-clock').textContent=text;}
  function timeout(){active=false;if($('#speech-warmup[open]'))SPEECH_WARMUP.close('timeout');render();}
  setInterval(()=>{const now=performance.now(),delta=(now-lastTick)/1000;lastTick=now;if(!active||document.hidden)return;S.elapsed=Math.min(1800,S.elapsed+delta);save();clock();if(S.elapsed>=1800)timeout();},1000);
  document.addEventListener('visibilitychange',()=>{lastTick=performance.now();if(document.hidden)stopAudio();});
  window.addEventListener('pagehide',()=>{cleanup();save();});
  function finishStage(){if(!S.done.includes(S.stage))S.done.push(S.stage);S.deferred=S.deferred.filter(n=>n!==S.stage);S.stage++;S.order=[];S.phraseReady=false;feedback(true);render();}
  function deferStage(){if(!S.deferred.includes(S.stage))S.deferred.push(S.stage);S.stage++;S.order=[];S.phraseReady=false;render();}
  function reset(){if(confirm('Очистить только прогресс ДЗ по одежде?')){active=false;S=fresh();render();}}
  function render(){
    cleanup();save();
    if(S.elapsed>=1800||S.stage>=7){active=false;return report();}
    if(!active)return home();
    $('#hw-content').innerHTML=`<div class="mission-bar"><button class="text-button" id="pause">Пауза</button><div class="mission-progress" aria-label="Выполнено ${S.done.length} из 7 этапов">${stages.map((_,i)=>`<i class="${S.done.includes(i)?'done':S.deferred.includes(i)?'deferred':''}"></i>`).join('')}</div><span id="clock" class="mission-clock"></span></div><section class="hw-panel"><div class="task-heading"><div class="eyebrow">ЭТАП ${S.stage+1} ИЗ 7 · ОКОЛО ${stages[S.stage][1]} МИНУТ</div><h1>${stages[S.stage][0]}</h1></div><div id="activity"></div><p id="status" class="mission-status" role="status"></p><button class="text-button" id="defer">Пока трудно · оставить учителю и идти дальше →</button></section>`;
    $('#pause').onclick=()=>{active=false;render();};$('#defer').onclick=deferStage;
    clock();[warmup,echo,matching,memory,sequence,hunt,writing][S.stage]();
  }
  function home(){
    $('#hw-content').innerHTML=`<section class="hw-intro"><div class="mission-hero"><div class="hero-copy"><div class="eyebrow">УРОК 3 · 25 МИНУТ · МАКСИМУМ 30</div><h1>Что возьмём<br>в путешествие?</h1><p>Помоги Лунлуну собрать одежду. Сначала разбудим голос, затем вернём вещам имена и подписи.</p></div></div><div class="mission-grid">${stages.map(([name,min],i)=>`<article><span>${i+1}</span><b>${name}</b><small>${S.done.includes(i)?'Выполнено':S.deferred.includes(i)?'Оставлено учителю':min+' мин'}</small></article>`).join('')}</div><button class="gold" id="start">${S.started?'Продолжить':'Начать с разминки'} →</button><p class="mission-note">Приготовь тетрадь и карандаш.</p>${S.started?'<button class="text-button" id="reset">Начать ДЗ заново</button>':''}</section>`;
    $('#start').onclick=()=>{S.started=true;active=true;lastTick=performance.now();render();};$('#reset')?.addEventListener('click',reset);
  }
  function warmup(){
    $('#activity').innerHTML=`<p>Проведи знакомые слоги по четырём тоновым дорожкам.</p><div class="homework-warmup-intro">${['ha','gu','ge','ke'].map(s=>`<div><img src="assets/art/syllables/${s}.png" alt="Слог ${s} с глазками, ручками и кедами"><b>${s}</b></div>`).join('')}</div><button class="gold" id="open-warmup">Открыть тоновые маршруты →</button><p class="quiet">Тон можно послушать на знакомом слове: 猫 māo, 鱼 yú, 马 mǎ, 兔 tù. Затем повтори его направление на своём слоге.</p>`;
    $('#open-warmup').onclick=()=>{SPEECH_WARMUP.open();clock();};
    SPEECH_WARMUP.open();clock();
  }
  function echo(){
    const w=W[S.echo];
    $('#activity').innerHTML=`<p>Послушай слово и повтори вслух.</p><div class="word-picture">${art(w)}</div><div class="mission-word">${w.han}</div><div class="mission-py">${w.py}</div><p>${w.ru} · ${S.echo+1} / 6</p><div class="mission-actions"><button class="mint" id="listen">Послушать образец</button><button class="mint" id="record">Записать себя</button></div><div class="voice-note" id="voice"></div><p class="tone-note">В 衣服 второй слог fu — лёгкий, без отдельного тона. В остальных словах такой же лёгкий второй слог zi.</p><button class="gold" id="echo-next" ${S.heard[w.id]?'':'hidden'}>Дальше →</button>`;
    $('#listen').onclick=()=>{say(w.han);S.heard[w.id]=true;save();$('#echo-next').hidden=false;};
    $('#echo-next').onclick=()=>{if(!S.heard[w.id])return;S.echo++;S.echo===6?finishStage():render();};
    $('#record').onclick=recordVoice;
  }
  async function recordVoice(){
    if(recording?.state==='recording'){recording.stop();return;}
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){note('Микрофон недоступен. Повтори вслух и продолжай.');return;}
    const token=++recordToken;$('#record').disabled=true;stopAudio();
    try{
      const media=await navigator.mediaDevices.getUserMedia({audio:true});
      if(token!==recordToken){media.getTracks().forEach(t=>t.stop());return;}
      stream=media;const r=recording=new MediaRecorder(media),chunks=[];
      r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      r.onstop=()=>{media.getTracks().forEach(t=>t.stop());clearTimeout(recordTimer);if(token!==recordToken)return;recording=null;stream=null;if(voiceURL)URL.revokeObjectURL(voiceURL);voiceURL=URL.createObjectURL(new Blob(chunks,{type:r.mimeType}));$('#voice').innerHTML='<p>Послушай себя и сравни с образцом.</p><audio controls aria-label="Твоя запись"></audio>';$('#voice audio').src=voiceURL;$('#record').textContent='Записать ещё раз';};
      r.start();$('#record').disabled=false;$('#record').textContent='Остановить запись';recordTimer=setTimeout(()=>{if(r.state==='recording')r.stop();},12000);
    }catch(_){stream?.getTracks().forEach(t=>t.stop());stream=null;if(token===recordToken){$('#record').disabled=false;note('Нет доступа к микрофону. Можно повторить без записи.');}}
  }
  function matching(){
    let selected=null;
    $('#activity').innerHTML=`<p>Выбери название слева, затем его пиньинь справа. Найденную пару прочитай вслух.</p><div class="match-headings"><span>Название</span><span>Произношение</span></div><div class="matching-board"><div id="match-han"></div><div id="match-py"></div></div><p>Найдено ${S.matched.length} / 6</p>${S.matched.length===6?'<button class="gold" id="matching-next">Все пары прочитаны →</button>':''}`;
    $('#match-han').innerHTML=W.map(w=>`<div class="match-word-row"><button data-han="${w.id}" class="${S.matched.includes(w.id)?'matched':''}" ${S.matched.includes(w.id)?'disabled':''}>${w.han}</button><button type="button" class="match-listen" data-listen-word="${w.id}" aria-label="Послушать ${w.han} — ${w.ru}">Слушать</button></div>`).join('');
    $('#match-py').innerHTML=shuffle(W).map(w=>`<button data-py="${w.id}" class="${S.matched.includes(w.id)?'matched':''}" ${S.matched.includes(w.id)?'disabled':''}>${w.py}</button>`).join('');
    document.querySelectorAll('[data-han]').forEach(b=>b.onclick=()=>{selected=b.dataset.han;document.querySelectorAll('[data-han]').forEach(el=>el.classList.toggle('selected',el===b));});
    document.querySelectorAll('[data-listen-word]').forEach(b=>b.onclick=()=>say(word(b.dataset.listenWord).han));
    document.querySelectorAll('[data-py]').forEach(b=>b.onclick=()=>{if(!selected)return note('Сначала выбери название слева.');if(selected!==b.dataset.py){feedback(false);return note('Послушай подсказку и попробуй ещё раз: '+word(selected).py);}const w=word(selected);S.matched.push(w.id);render();say(w.han);});
    $('#matching-next')?.addEventListener('click',finishStage);
  }
  function memory(){
    const indices=Array.from({length:6},(_,i)=>S.memoryRound*6+i),roundWords=W.slice(S.memoryRound*3,S.memoryRound*3+3),done=()=>roundWords.every(w=>S.memory.includes(w.id));
    const face=key=>{const [id,kind]=key.split(':'),w=word(id);return kind==='word'?`<strong>${w.han}</strong><small>Послушай и прочитай</small>`:`${picture(w)}<small>${w.py}</small>`;};
    const back='<img src="assets/art/clothes-suitcase-v2.png" alt=""><small>Открыть</small>';
    $('#activity').innerHTML=`<p>Найди пары: название и подходящая одежда. Открывай по две карточки, слушай и повторяй.</p><span class="round-label">Раунд ${S.memoryRound+1} / 2 · три пары</span><div class="memory-grid">${indices.map(i=>{const [id,kind]=S.deck[i].split(':'),matched=S.memory.includes(id),visible=matched||S.memoryHint;return `<button class="memory-tile ${visible?'face-up':''} ${matched?'matched':''}" data-card="${i}" aria-label="${visible?word(id).ru+' — '+(kind==='word'?'название':'картинка'):'Открыть карточку '+(i-S.memoryRound*6+1)}">${visible?face(S.deck[i]):back}</button>`;}).join('')}</div><p id="memory-count">Найдено ${S.memory.length} / 6 пар</p><div class="mission-actions"><button class="mint" id="memory-hint">${S.memoryHint?'Спрятать подсказки':'Играть с открытыми карточками'}</button><button class="gold" id="memory-next" ${done()?'':'disabled'}>${S.memoryRound===0?'Следующие три пары →':'Все пары прочитаны →'}</button></div>`;
    $('#memory-hint').onclick=()=>{S.memoryHint=!S.memoryHint;render();};
    $('#memory-next').onclick=()=>{if(!done())return;if(S.memoryRound===0){S.memoryRound=1;S.memoryHint=false;render();}else finishStage();};
    document.querySelectorAll('[data-card]').forEach(b=>b.onclick=()=>{
      if(locked)return;const index=Number(b.dataset.card),[id,kind]=S.deck[index].split(':'),w=word(id);
      say(kind==='word'?w.han:`这是${w.han}。`);
      if(S.memory.includes(id)||flipped.includes(index))return;
      b.innerHTML=face(S.deck[index]);b.classList.add('face-up','picked');b.setAttribute('aria-label',w.ru+' — '+(kind==='word'?'название':'картинка'));flipped.push(index);
      if(flipped.length<2)return;locked=true;
      if(S.deck[flipped[0]].split(':')[0]===S.deck[flipped[1]].split(':')[0]){
        S.memory.push(id);save();feedback(true);flipped.forEach(i=>{const tile=$(`[data-card="${i}"]`);tile.classList.add('matched');tile.classList.remove('picked');});flipped=[];locked=false;$('#memory-count').textContent=`Найдено ${S.memory.length} / 6 пар`;$('#memory-next').disabled=!done();note(`Верно: ${w.han} · ${w.py}. Повтори вслух.`);
      }else{
        feedback(false);memoryTimer=setTimeout(()=>{flipped.forEach(i=>{const tile=$(`[data-card="${i}"]`);tile.classList.remove('picked');if(!S.memoryHint){tile.innerHTML=back;tile.classList.remove('face-up');tile.setAttribute('aria-label','Открыть карточку '+(i-S.memoryRound*6+1));}});flipped=[];locked=false;},1200);
      }
    });
  }
  function sequence(){
    const p=D.phrases[S.phrase],w=word(p.word),indices=shuffle(p.parts.map((_,i)=>i));
    $('#activity').innerHTML=`<p>Посмотри на вещь и собери фразу. Нажимай на слова по порядку; собранное слово можно вернуть назад.</p><div class="order-prompt">${picture(w)}<div><span class="round-label">Фраза ${S.phrase+1} / 4</span><p><b>${p.ru}</b></p><span class="order-help">${S.phrase<2?'这 + 是 + предмет':'我 + 要 + цвет + 的 + предмет'}</span></div></div><div class="sequence-slots" id="slots"></div><div class="token-tray" id="parts"></div><div class="mission-actions"><button class="mint" id="check-order">Проверить</button><button class="mint" id="order-hint">Подсказка</button></div><div id="order-result"></div>`;
    function draw(){
      $('#slots').innerHTML=S.order.map((n,i)=>`<button data-remove="${i}">${p.parts[n]}</button>`).join('')||'<span class="quiet">Здесь появится фраза</span>';
      $('#parts').innerHTML=indices.map(i=>`<button data-part="${i}" ${S.order.includes(i)?'disabled':''}>${p.parts[i]}</button>`).join('');
      document.querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>{S.order.push(Number(b.dataset.part));S.phraseReady=false;save();draw();});
      document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{S.order.splice(Number(b.dataset.remove),1);S.phraseReady=false;save();draw();});
      $('#order-result').innerHTML=S.phraseReady?`<div class="phrase-result"><div class="mission-py">${p.py}</div><div class="mission-actions"><button class="mint" id="phrase-listen">Послушать ответ</button><button class="gold" id="phrase-next">Прочитал(а) вслух →</button></div></div>`:'';
      if(S.phraseReady){$('#phrase-listen').onclick=()=>say(p.text);$('#phrase-next').onclick=()=>{S.phrase++;S.order=[];S.phraseReady=false;S.phrase===4?finishStage():render();};}
    }
    draw();$('#order-hint').onclick=()=>note(p.py);
    $('#check-order').onclick=()=>{if(S.order.map(i=>p.parts[i]).join('')!==p.text){feedback(false);return note('Проверь порядок. Подсказка: '+p.py);}feedback(true);S.phraseReady=true;save();draw();};
  }
  function writing(){
    dispose=CLOTHES_COPYBOOK.render({root:$('#activity'),state:S,save,rerender:render,finish:finishStage,status:note});
  }
  function hunt(){
    const prompts=['Найди рядом настоящую вещь: брюки, юбку, головной убор, обувь или носки.','Найди другую вещь из гардероба. Назови её по-китайски.','Выбери вещь, которую возьмёшь в путешествие. Скажи, что ты хочешь.'];
    const options=W.filter(w=>w.id!=='all'&&(S.hunt!==1||w.id!==S.huntResponses[0]?.word));
    $('#activity').innerHTML=`<p>${prompts[S.hunt]}</p><span class="round-label">${S.hunt+1} / 3 · ${S.hunt===2?'我要… — я хочу…':'这是… — это…'}</span><div class="hunt-grid">${options.map(w=>`<button data-hunt="${w.id}" class="${S.huntSelected===w.id?'selected':''}">${picture(w)}<span>${w.han}</span></button>`).join('')}</div><div id="hunt-answer"></div>`;
    function answer(id){const w=word(id),text=S.hunt===2?`我要${w.han}。`:`这是${w.han}。`,py=S.hunt===2?`Wǒ yào ${w.py}.`:`Zhè shì ${w.py}.`;
      $('#hunt-answer').innerHTML=`<div class="mission-word" style="font-size:34px">${text}</div><p>${py}</p><div class="mission-actions"><button class="mint" id="hunt-listen">Послушать образец</button><button class="gold" id="hunt-next">Сказал(а) вслух →</button></div>`;
      $('#hunt-listen').onclick=()=>say(text);$('#hunt-next').onclick=()=>{S.huntResponses.push({word:id,text});S.hunt++;S.huntSelected=null;S.hunt===3?finishStage():render();};
    }
    document.querySelectorAll('[data-hunt]').forEach(b=>b.onclick=()=>{S.huntSelected=b.dataset.hunt;save();document.querySelectorAll('[data-hunt]').forEach(el=>el.classList.toggle('selected',el===b));answer(S.huntSelected);});
    if(S.huntSelected&&options.some(w=>w.id===S.huntSelected))answer(S.huntSelected);
  }
  function report(){
    const counts=[`${S.speechWarmup?.done?.length||0} / 16 маршрутов`,`${S.echo} / 6 слов`,`${S.matched.length} / 6 пар`,`${S.memory.length} / 6 пар`,`${S.phrase} / 4 фраз`,`${S.hunt} / 3 ответов`,`${CLOTHES_COPYBOOK.count(S)} / 13 знаков`],complete=S.done.length===7;
    $('#hw-content').innerHTML=`<section class="hw-panel"><div class="eyebrow">ЧЕМОДАН ЛУНЛУНА · ИТОГ</div><h1>${complete?'Чемодан готов к путешествию!':'На сегодня достаточно!'}</h1><div class="report-art" role="img" aria-label="Лунлун с одеждой и чемоданом"></div><p>${S.elapsed>=1800?'Прошло 30 минут. Пора отдохнуть.':`Время работы: ${Math.floor(S.elapsed/60)} мин ${Math.floor(S.elapsed%60)} с.`} Выполнено ${S.done.length} из 7 этапов.</p><ul class="report-list">${stages.map(([name],i)=>`<li><span>${name}<small>${counts[i]}</small></span><b>${S.done.includes(i)?'Выполнено':S.deferred.includes(i)?'Нужна помощь':'Не завершено'}</b></li>`).join('')}</ul><p>Покажи учителю итог и свою пропись.</p>${CLOTHES_COPYBOOK.count(S)?`<p>Знаки: ${CLOTHES_COPYBOOK.chars.filter(char=>S.copybook.chars[char].done).map(char=>char+(S.copybook.chars[char].paper?' — в тетради':'')).join('、')}.</p>`:''}<div class="mission-actions"><button class="mint" id="print-report">Сохранить итог / печать</button><button class="text-button" id="reset">Начать ДЗ заново</button></div></section>`;
    $('#print-report').onclick=()=>window.print();$('#reset').onclick=reset;save();
  }
  SPEECH_WARMUP.attach({lesson:3,homework:true,auto:false,hideLauncher:true,group:()=>0,state:()=>S,save,stopAudio,say,toneModels:D.toneModels,onClose:reason=>{
    if(reason==='timeout'||!active||S.stage!==0)return;
    if(reason==='complete')finishStage();else if(reason==='defer')deferStage();else{active=false;render();}
  }});
  render();
})();
