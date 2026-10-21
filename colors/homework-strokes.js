/* Guided order and direction checking. All geometry is bundled; no external requests. */
window.HW_WRITING=(()=>{
 function render({a,p,save,next,feedback=()=>{}}){
  const root=document.querySelector('#hw-task'),data=HW_STROKE_DATA[a.han],total=data.strokes.length;
  if(p.strokeSchema!==1){p.strokeProgress=0;p.strokeComplete=false;p.strokeSchema=1;}
  p.strokeProgress=Math.max(0,Math.min(total,Number(p.strokeProgress)||0));p.strokeComplete=p.strokeProgress===total;
  root.innerHTML=`<p>Пиши по одной черте, в нужном порядке и направлении.</p><div class="writing-layout"><div class="copy-model"><strong>${a.han}</strong><span>${a.py}</span><small>${a.ru}</small></div><div class="stroke-board"><div id="hw-canvas" aria-label="Напиши ${a.han} по порядку черт"></div><svg class="stroke-guide" aria-hidden="true"></svg></div></div><p id="stroke-status" role="status"></p><div class="writing-actions"><button class="mint" id="hw-animate">▶ Посмотреть написание</button><button class="mint" id="hw-stroke-hint">Следующая черта</button><button class="mint" id="hw-outline">Скрыть контур</button><button class="mint" id="hw-clear">Заново</button><button class="gold" id="hw-written" ${p.strokeComplete?'':'disabled'}>Готово →</button></div><button class="text-button" id="hw-paper">Написал(а) в тетради и проверил(а) по анимации →</button><p class="quiet">Неточность почерка допустима. Неверная черта не засчитывается; после ошибки появится подсказка.</p>`;
  let writer,disposed=false,animating=false,outline=true,generation=0,showGuide=false;
  const board=root.querySelector('.stroke-board'),target=root.querySelector('#hw-canvas'),guide=root.querySelector('.stroke-guide'),status=root.querySelector('#stroke-status');
  const size=()=>Math.round(board.clientWidth),options=()=>({width:size(),height:size(),padding:20,showCharacter:false,showOutline:outline,strokeColor:'#245d50',outlineColor:'#dcd2b6',highlightColor:'#d99f42',drawingColor:'#25594f',strokeAnimationSpeed:1,delayBetweenStrokes:250,strokeFadeDuration:100,charDataLoader:()=>data});
  function updateStatus(text){status.textContent=text||(p.strokeComplete?'Получилось! Все черты написаны по порядку.':`Черта ${p.strokeProgress+1} из ${total}. Начни у точки и веди в нужную сторону.`);root.querySelector('#hw-written').disabled=!p.strokeComplete||animating;root.querySelector('#hw-stroke-hint').disabled=p.strokeComplete||animating;}
  function drawGuide(){
   guide.innerHTML='';guide.setAttribute('viewBox',`0 0 ${size()} ${size()}`);
   if(animating||p.strokeComplete)return;
   const transform=HanziWriter.getScalingTransform(size(),size(),20),points=data.medians[p.strokeProgress];
   const scale=transform.scale,first=points[0];
   const path=showGuide?`<path d="M${points.map(pt=>pt.join(' ')).join('L')}" fill="none" stroke="#bd903e" stroke-width="${2/scale}" stroke-dasharray="${5/scale} ${5/scale}"/><circle cx="${points[points.length-1][0]}" cy="${points[points.length-1][1]}" r="${3/scale}" fill="#bd903e"/>`:'';
   guide.innerHTML=`<g transform="${transform.transform}">${path}<circle cx="${first[0]}" cy="${first[1]}" r="${7/scale}" fill="#e5b55d" stroke="#a37423" stroke-width="${1.5/scale}"/></g>`;
  }
  function practice(){
   if(disposed)return;animating=false;writer.cancelQuiz();drawGuide();updateStatus();
   if(p.strokeComplete){writer.showCharacter();return;}
   writer.quiz({quizStartStrokeNum:p.strokeProgress,acceptBackwardsStrokes:false,leniency:1.15,showHintAfterMisses:1,highlightOnComplete:false,
    onMistake:()=>{if(disposed)return;feedback(false);showGuide=true;drawGuide();updateStatus('Посмотри на подсказку: нужна следующая черта, от точки в правильную сторону.');},
    onCorrectStroke:event=>{if(disposed)return;feedback(true);p.strokeProgress=event.strokeNum+1;p.strokeComplete=p.strokeProgress===total;showGuide=false;save();drawGuide();updateStatus();},
    onComplete:()=>{if(disposed)return;p.strokeProgress=total;p.strokeComplete=true;p.drew=true;save();drawGuide();updateStatus();}
   });
  }
  function create(){
   const myGeneration=++generation;writer?.cancelQuiz();writer?.pauseAnimation();target.innerHTML='';animating=false;
   writer=HanziWriter.create(target,a.han,options());
   // The bundled loader resolves immediately; allow Hanzi Writer to finish setup.
   Promise.resolve().then(()=>{if(!disposed&&generation===myGeneration)practice();});
  }
  create();let lastSize=size();const observer=new ResizeObserver(()=>{const current=size();if(Math.abs(current-lastSize)>1){lastSize=current;create();}});observer.observe(board);
  root.querySelector('#hw-animate').onclick=()=>{
   if(disposed)return;const current=++generation;writer.cancelQuiz();animating=true;guide.innerHTML='';updateStatus('Смотри, как знак пишется по чертам. Затем попробуй сам.');
   writer.animateCharacter({onComplete:()=>{if(!disposed&&current===generation)practice();}});
  };
  root.querySelector('#hw-stroke-hint').onclick=()=>{showGuide=true;drawGuide();writer.highlightStroke(p.strokeProgress);};
  root.querySelector('#hw-outline').onclick=()=>{outline=!outline;root.querySelector('#hw-outline').textContent=outline?'Скрыть контур':'Показать контур';if(outline)writer.showOutline();else writer.hideOutline();};
  root.querySelector('#hw-clear').onclick=()=>{generation++;writer.cancelQuiz();writer.pauseAnimation();p.strokeProgress=0;p.strokeComplete=false;p.drew=false;showGuide=false;save();create();};
  root.querySelector('#hw-written').onclick=()=>{if(p.strokeComplete&&!animating)next();};
  root.querySelector('#hw-paper').onclick=()=>{p.paper=true;p.paperOrderSelfChecked=true;next();};
  save();return()=>{disposed=true;generation++;observer.disconnect();writer?.cancelQuiz();writer?.pauseAnimation();};
 }
 return {render};
})();
