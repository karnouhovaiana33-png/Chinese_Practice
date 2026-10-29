/* A large, saved copybook: optional guided tracing and independent handwriting. */
window.CLOTHES_COPYBOOK = (() => {
  'use strict';
  const cards=CLOTHES_HOMEWORK_DATA.copybook;
  const data={...CLOTHES_STROKE_DATA,...CLOTHES_COPYBOOK_EXTRA};
  const chars=[...new Set(cards.flatMap(card=>[...card.practice]))];
  const freshIndependent=()=>({schema:1,stroke:0,complete:false});
  const freshChar=()=>({trace:0,attempts:[[],[],[]],independent:Array.from({length:3},freshIndependent),done:false,paper:false});
  const independentlyComplete=(p,char)=>p.independent?.some(a=>a.schema===1&&a.complete&&a.stroke===data[char].strokes.length);
  function ensure(state){
    if(!state.copybook||state.copybook.version!==1){
      state.copybook={version:1,cursor:0,chars:{}};
      for(const [id,char] of [['yi','衣'],['zi','子'],['wa','袜']]){
        const old=state.writing?.[id];if(!old)continue;
        state.copybook.chars[char]={...freshChar(),trace:Number(old.strokeProgress)||0,done:Boolean(state.written?.includes(id)),paper:Boolean(old.paper)};
      }
    }
    const book=state.copybook;
    book.cursor=Math.max(0,Math.min(cards.length-1,Number(book.cursor)||0));
    book.chars??={};
    for(const char of chars){
      const p=book.chars[char]&&typeof book.chars[char]==='object'?book.chars[char]:(book.chars[char]=freshChar());
      p.done=Boolean(p.done);p.paper=Boolean(p.paper);
      p.trace=Math.max(0,Math.min(data[char].strokes.length,Number(p.trace)||0));
      p.attempts=Array.from({length:3},(_,i)=>Array.isArray(p.attempts?.[i])?p.attempts[i]:[]);
      p.independent=Array.from({length:3},(_,i)=>{
        const a=p.independent?.[i]?.schema===1?p.independent[i]:freshIndependent();
        a.stroke=Math.max(0,Math.min(data[char].strokes.length,Number(a.stroke)||0));
        a.complete=Boolean(a.complete)&&a.stroke===data[char].strokes.length;
        return a;
      });
      p.done=p.done&&(p.paper||independentlyComplete(p,char));
    }
    return book;
  }
  const count=state=>{const book=ensure(state);return chars.filter(c=>book.chars[c].done).length;};
  const ready=(p,char)=>p.paper||independentlyComplete(p,char);
  function render({root,state,save,rerender,finish,status}){
    const book=ensure(state),card=cards[book.cursor],current=[...card.practice];
    let dead=false;const writers=[],observers=[];
    const cell=(char,kind,index)=>kind==='model'
      ?`<button type="button" class="cb-cell cb-model" data-model="${char}" aria-label="Показать порядок черт ${char}"><span data-model-host="${char}"></span></button>`
      :kind==='trace'?`<div class="cb-cell cb-trace" data-trace="${char}" aria-label="Обведи ${char}"><div class="cb-trace-host"></div><svg class="cb-guide" aria-hidden="true"></svg></div>`
      :`<div class="cb-cell cb-free ${index===2?'cb-extra':''}"><div class="cb-free-host" data-free="${char}" data-attempt="${index}" aria-label="Напиши ${char} самостоятельно, попытка ${index+1}"></div></div>`;
    root.innerHTML=`<section class="cb-book" aria-label="Пропись"><div class="cb-toolbar"><label>Карточка <select id="cb-card" aria-label="Выбрать карточку прописи">${cards.map((c,i)=>`<option value="${i}" ${i===book.cursor?'selected':''}>${c.han} · ${c.ru}</option>`).join('')}</select></label><span id="cb-progress"></span></div><div class="cb-word"><strong>${card.han}</strong><span>${card.py}</span><small>${card.ru}</small></div><div class="cb-rows">${current.map(char=>`<div class="cb-row" data-row="${char}"><div class="cb-row-cells"><div class="cb-group"><div class="cb-labels"><span>Образец</span><span>Обведи</span></div><div class="cb-strip">${cell(char,'model')}${cell(char,'trace')}</div></div><div class="cb-group"><div class="cb-label">Напиши сам(а)</div><div class="cb-strip">${[0,1,2].map(i=>cell(char,'free',i)).join('')}</div></div></div><div class="cb-row-tools"><button type="button" data-clear-row="${char}">Стереть строку</button></div></div>`).join('')}</div><div class="cb-navigation"><button type="button" class="mint" id="cb-prev" ${book.cursor===0?'disabled':''}>Назад</button><button type="button" class="gold" id="cb-next"></button></div><button type="button" class="text-button" id="cb-paper">Написал(а) в тетради →</button></section>`;
    const $=s=>root.querySelector(s);
    function controls(){
      const completed=count(state),valid=current.every(c=>ready(book.chars[c],c));
      $('#cb-progress').textContent=`${book.cursor+1} / ${cards.length} · написано ${completed} / ${chars.length}`;
      $('#cb-next').disabled=!valid;
      $('#cb-next').hidden=!valid;
      const final=book.cursor===cards.length-1;
      $('#cb-next').textContent=final&&(chars.every(c=>book.chars[c].done||current.includes(c)))?'Завершить пропись →':'Следующая карточка →';
      for(const char of current){const p=book.chars[char];$(`[data-clear-row="${char}"]`).disabled=!(p.done||p.paper||p.trace||p.attempts.some(a=>a.length)||p.independent.some(a=>a.stroke));}
    }
    function advance(paper=false){
      if(!paper&&!current.every(c=>ready(book.chars[c],c)))return;
      for(const char of current){book.chars[char].done=true;if(paper)book.chars[char].paper=true;}
      save();
      if(count(state)===chars.length){finish();return;}
      book.cursor=book.cursor<cards.length-1?book.cursor+1:cards.findIndex(c=>[...c.practice].some(char=>!book.chars[char].done));
      save();rerender();
    }
    $('#cb-next').onclick=()=>advance();$('#cb-paper').onclick=()=>advance(true);
    $('#cb-prev').onclick=()=>{book.cursor=Math.max(0,book.cursor-1);save();rerender();};
    $('#cb-card').onchange=e=>{book.cursor=Number(e.target.value);save();rerender();};
    for(const char of current){
      const p=book.chars[char],model=$(`[data-model-host="${char}"]`),trace=$(`[data-trace="${char}"]`),host=trace.querySelector('.cb-trace-host'),guide=trace.querySelector('.cb-guide');
      const size=()=>Math.round(trace.clientWidth);
      let modelWriter,traceWriter,lastSize=0,epoch=0;
      function drawGuide(){
        guide.innerHTML='';if(p.trace===data[char].strokes.length)return;
        const transform=HanziWriter.getScalingTransform(size(),size(),8),point=data[char].medians[p.trace][0],radius=3.5/transform.scale;
        guide.setAttribute('viewBox',`0 0 ${size()} ${size()}`);
        guide.innerHTML=`<g transform="${transform.transform}"><circle cx="${point[0]}" cy="${point[1]}" r="${radius}" fill="#c79543"/></g>`;
      }
      function practice(){
        if(dead)return;traceWriter.cancelQuiz();drawGuide();
        if(p.trace===data[char].strokes.length){traceWriter.showCharacter();return;}
        traceWriter.quiz({quizStartStrokeNum:p.trace,acceptBackwardsStrokes:false,leniency:1.25,showHintAfterMisses:1,highlightOnComplete:false,
          onMistake:()=>{if(!dead)status('Начни у точки и проведи следующую черту по образцу.');},
          onCorrectStroke:event=>{if(dead)return;p.trace=event.strokeNum+1;save();drawGuide();controls();},
          onComplete:()=>{if(dead)return;p.trace=data[char].strokes.length;save();drawGuide();controls();}
        });
      }
      function create(){
        const token=++epoch;lastSize=size();modelWriter?.pauseAnimation();traceWriter?.cancelQuiz();model.innerHTML='';host.innerHTML='';
        const opts={width:lastSize,height:lastSize,padding:8,strokeColor:'#285447',outlineColor:'#d4d8c8',drawingColor:'#285447',highlightColor:'#b79244',strokeAnimationSpeed:1,delayBetweenStrokes:180,charDataLoader:()=>data[char]};
        modelWriter=HanziWriter.create(model,char,{...opts,showCharacter:true,showOutline:false});
        traceWriter=HanziWriter.create(host,char,{...opts,showCharacter:false,showOutline:true});
        writers.push(modelWriter,traceWriter);Promise.resolve().then(()=>{if(!dead&&token===epoch)practice();});
      }
      create();
      const observer=new ResizeObserver(()=>{if(!dead&&Math.abs(size()-lastSize)>1)create();});observer.observe(trace);observers.push(observer);
      $(`[data-model="${char}"]`).onclick=()=>{modelWriter.cancelQuiz();modelWriter.animateCharacter();};
      $(`[data-clear-row="${char}"]`).onclick=()=>{book.chars[char]=freshChar();save();rerender();};
    }
    root.querySelectorAll('.cb-free-host').forEach(host=>{
      const char=host.dataset.free,p=book.chars[char],index=Number(host.dataset.attempt),attempt=p.independent[index];
      let writer,lastSize=0,epoch=0;
      function practice(){
        if(dead)return;
        writer.cancelQuiz();
        if(attempt.complete){writer.showCharacter();return;}
        writer.quiz({quizStartStrokeNum:attempt.stroke,acceptBackwardsStrokes:false,leniency:1.25,showHintAfterMisses:2,highlightOnComplete:false,
          onCorrectStroke:event=>{
            if(dead)return;
            attempt.stroke=event.strokeNum+1;
            attempt.complete=attempt.stroke===data[char].strokes.length;
            save();controls();
          },
          onComplete:()=>{
            if(dead)return;
            attempt.stroke=data[char].strokes.length;attempt.complete=true;save();controls();
          }
        });
      }
      function create(){
        const size=Math.round(host.parentElement.clientWidth);
        lastSize=size;
        writer?.cancelQuiz();writer?.pauseAnimation();host.innerHTML='';
        if(size===0)return;
        const token=++epoch;
        writer=HanziWriter.create(host,char,{width:size,height:size,padding:8,showCharacter:false,showOutline:false,strokeColor:'#285447',drawingColor:'#285447',highlightColor:'#b79244',charDataLoader:()=>data[char]});
        writers.push(writer);
        Promise.resolve().then(()=>{if(!dead&&token===epoch)practice();});
      }
      create();const observer=new ResizeObserver(()=>{if(!dead&&Math.abs(host.parentElement.clientWidth-lastSize)>1)create();});observer.observe(host.parentElement);observers.push(observer);
    });
    controls();save();
    return()=>{dead=true;observers.forEach(o=>o.disconnect());writers.forEach(w=>{w.cancelQuiz();w.pauseAnimation();});};
  }
  return {ensure,count,render,cards,chars,data};
})();
