'use strict';
(() => {
  const N = window.Nocturne, tracks = window.NOCTURNE_DRIFT;
  if (!N || !Array.isArray(tracks)) return;
  const $ = s => document.querySelector(s), esc = N.esc;
  const regions = [
    {id:'all',label:'Весь мир'},
    {id:'asia',label:'Япония',map:'JAPAN',x:85,y:25},
    {id:'americas',label:'Америка',map:'AMERICA',x:22,y:42},
    {id:'europe',label:'Европа',map:'EUROPE',x:49,y:17},
    {id:'middle-east',label:'Ближний Восток',map:'MIDDLE EAST',x:67,y:52},
    {id:'oceania',label:'Австралия',map:'AUSTRALIA',x:86,y:79},
    {id:'africa',label:'Африка',map:'AFRICA',x:49,y:74}
  ];
  const valid = new Set(tracks.map(t=>t.id)), states = new WeakMap(), hosts = new Set();
  const count = id => tracks.filter(t=>t.region===id).length;
  const key = 'nocturne-drift-passport-v1';
  const cleanPlans = input => Array.isArray(input) ? [...new Set(input.filter(id=>valid.has(id)))].slice(0,tracks.length) : [];
  let plans=[]; try { plans=cleanPlans(JSON.parse(localStorage.getItem(key)||'[]')); } catch (_) {}
  function savePlans() {
    try { localStorage.setItem(key,JSON.stringify(plans)); }
    catch (_) { N.toast('Маршрут доступен до закрытия вкладки. Скачай его, чтобы сохранить.'); }
  }
  function xy(t) { return [(t.lon+180)/360*1120,(85-t.lat)/170*560]; }
  function regionButtons() {
    return regions.map(r=>'<button type="button" data-drift-region="'+r.id+'" aria-pressed="false">'+r.label+'<sup>'+String(r.id==='all'?tracks.length:count(r.id)).padStart(2,'0')+'</sup></button>').join('');
  }
  function mapButtons() {
    return regions.filter(r=>r.map).map(r=>'<button type="button" class="map-region" data-drift-region="'+r.id+'" style="left:'+r.x+'%;top:'+r.y+'%" aria-label="'+r.label+': '+count(r.id)+' трассы" aria-pressed="false"><span>'+r.map+'</span><b>'+String(count(r.id)).padStart(2,'0')+'</b></button>').join('');
  }
  function mount(host,params=new URLSearchParams()) {
    hosts.add(host);
    const region=regions.some(r=>r.id===params.get('region'))?params.get('region'):'all';
    states.set(host,{region,selected:valid.has(params.get('track'))?params.get('track'):'ebisu',planOnly:params.get('plan')==='1'});
    host.innerHTML=[
      '<div class="atlas-shell"><div class="atlas-topbar"><div class="atlas-regions" role="group" aria-label="Регионы Drift Atlas">',regionButtons(),
      '</div><button type="button" class="atlas-plan-toggle" data-drift-plan-only aria-pressed="false">МОЙ МАРШРУТ <b data-drift-count>0</b></button></div>',
      '<div class="atlas-stage"><div class="atlas-map" aria-label="Карта мировых дрифт-регионов"><div class="world-map-layer"><img class="world-shape" src="./assets/drift/world-land.svg" alt="" width="1120" height="560" loading="lazy"><svg class="world-connections" viewBox="0 0 1120 560" aria-hidden="true"><path data-drift-connection d=""/></svg>',
      mapButtons(),'<div class="atlas-city-pin" data-drift-city-pin aria-hidden="true"></div></div><div class="atlas-map-caption"><span>ВЫБЕРИ РЕГИОН НА КАРТЕ<br>ГОРОДА ОТМЕЧЕНЫ ПРИБЛИЗИТЕЛЬНО</span><strong data-drift-map-word>THE ORIGIN.</strong></div></div><aside class="track-spotlight" data-drift-spotlight aria-label="Выбранная трасса"></aside></div>',
      '<div class="atlas-track-index" data-drift-index role="group" aria-label="Трассы выбранного региона"></div>',
      '<div class="atlas-bottom"><p>Редакционный гид по дрифт-культуре. «Мой маршрут» — личный список мечты в этом браузере. Посещение и условия заездов уточняй у организаторов.</p><button type="button" data-drift-export>СКАЧАТЬ МОЙ МАРШРУТ ↓</button><button type="button" data-drift-share>ССЫЛКА НА ТРАССУ ↗</button></div><input class="atlas-copy-field" data-drift-copy readonly hidden aria-label="Ссылка на выбранную трассу"></div>'
    ].join('');
    draw(host);
  }
  function draw(host) {
    const state=states.get(host);if(!state)return;
    const list=tracks.filter(t=>(state.region==='all'||t.region===state.region)&&(!state.planOnly||plans.includes(t.id)));
    if(!list.some(t=>t.id===state.selected))state.selected=list[0]?.id||'';
    const t=tracks.find(t=>t.id===state.selected), spot=host.querySelector('[data-drift-spotlight]');
    host.querySelectorAll('[data-drift-region]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.driftRegion===state.region)));
    host.querySelector('[data-drift-plan-only]').setAttribute('aria-pressed',String(state.planOnly));
    host.querySelector('[data-drift-count]').textContent=String(plans.length).padStart(2,'0');
    host.querySelector('[data-drift-export]').disabled=plans.length===0;
    host.querySelector('[data-drift-share]').disabled=!t;
    host.querySelector('[data-drift-index]').innerHTML=list.length?list.map(track=>'<button type="button" class="atlas-track-item" data-drift-track="'+track.id+'" aria-pressed="'+(track.id===state.selected)+'"><span>'+track.code+'</span><div><strong>'+track.short+'</strong><small>'+esc(track.scene)+'</small></div></button>').join(''):'<div class="atlas-empty">Здесь пока нет трасс в твоём маршруте.<button type="button" data-drift-show-all>ИССЛЕДОВАТЬ МИР ↗</button></div>';
    const pin=host.querySelector('[data-drift-city-pin]'), connection=host.querySelector('[data-drift-connection]');
    pin.hidden=!t;
    if(t){
      const p=xy(t),origin=xy(tracks[0]),bend=Math.max(20,Math.min(origin[1],p[1])-Math.abs(origin[0]-p[0])*.14);
      pin.style.left=p[0]/1120*100+'%';pin.style.top=p[1]/560*100+'%';
      connection.setAttribute('d',t.id==='ebisu'?'':'M'+origin[0].toFixed(1)+','+origin[1].toFixed(1)+' Q'+((origin[0]+p[0])/2).toFixed(1)+','+bend.toFixed(1)+' '+p[0].toFixed(1)+','+p[1].toFixed(1));
      host.querySelector('[data-drift-map-word]').textContent=t.word;
      const car=N.cars.find(c=>c.id===t.car),on=plans.includes(t.id);
      spot.innerHTML=[
        '<div class="track-eyebrow"><span>'+esc(t.scene)+'</span><b>'+String(tracks.indexOf(t)+1).padStart(2,'0')+' / 10</b></div>',
        '<h3>'+esc(t.name)+'</h3><p class="track-location">'+esc(t.country)+' / '+esc(t.city)+'</p><p>'+esc(t.description)+'</p>',
        '<div class="track-fact">'+esc(t.fact)+'</div><div class="track-actions"><button type="button" data-drift-save="'+t.id+'" aria-pressed="'+on+'">'+(on?'✓ В МОЁМ МАРШРУТЕ':'＋ В МОЙ МАРШРУТ')+'</button><a href="'+esc(t.source)+'" target="_blank" rel="noopener noreferrer">ОРГАНИЗАТОР <span>↗</span></a></div>',
        car?'<div class="track-editorial"><span>НАСТРОЕНИЕ ДЛЯ ГАРАЖА /</span><a href="#/car/'+car.id+'">'+esc(car.brand+' '+car.model)+' ↗</a></div>':''
      ].join('');
    }else{
      connection.setAttribute('d','');host.querySelector('[data-drift-map-word]').textContent='YOUR NEXT CHAPTER.';
      spot.innerHTML='<div class="track-eyebrow">YOUR PERSONAL ATLAS</div><h3>THE NEXT<br>DESTINATION.</h3><p>Добавляй понравившиеся трассы в маршрут. Твой список останется на этом устройстве; его можно скачать.</p>';
    }
    if(host.dataset.atlas==='route'&&N.current().route==='drift')canonical(state);
  }
  function canonical(state) {
    const p=new URLSearchParams();if(state.selected)p.set('track',state.selected);if(state.region!=='all')p.set('region',state.region);if(state.planOnly)p.set('plan','1');
    history.replaceState(null,'',location.pathname+location.search+'#/drift'+(p.size?'?'+p.toString():''));
  }
  function renderRoute(params) {
    $('#drift-view').innerHTML=[
      '<div class="breadcrumb"><a href="#/">Главная</a><span>/</span>Drift Atlas</div>',
      '<div class="atlas-view-heading"><div><p class="eyebrow">NOCTURNE × WORLD DRIFT CULTURE</p><h1>FIND YOUR<br><em>NEXT LINE.</em></h1></div><p>Десять настоящих трасс. Шесть регионов. Собери личную карту мест, где хочется услышать звук следующего заезда.</p></div><div data-atlas="route"></div>',
      '<div class="atlas-route-footer"><p>Площадки и серии независимы от NOCTURNE.<br>Мы собираем культуру в одном месте — твой следующий шаг выбираешь ты.</p><a class="text-link" href="#/?section=formula">FORMULA DRIFT / КОНЦЕПТ <span>↗</span></a></div>'
    ].join('');
    for(const host of hosts)if(!host.isConnected)hosts.delete(host);
    mount($('#drift-view [data-atlas]'),params);
  }
  function exportPlans() {
    const lines=['NOCTURNE / MY DRIFT ATLAS','Личный список мечты. Не бронь и не расписание событий.',''];
    tracks.filter(t=>plans.includes(t.id)).forEach((t,i)=>lines.push(String(i+1).padStart(2,'0')+' / '+t.name,t.country+' — '+t.city,t.fact,t.source,''));
    const blob=new Blob(['\uFEFF'+lines.join('\n')],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='NOCTURNE-drift-atlas.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function share(host) {
    const state=states.get(host);if(!valid.has(state.selected))return;
    const p=new URLSearchParams({track:state.selected});if(state.region!=='all')p.set('region',state.region);
    const url=location.href.split('#')[0]+'#/drift?'+p.toString();
    try{await navigator.clipboard.writeText(url);N.toast('Ссылка на трассу скопирована');}
    catch(_){const input=host.querySelector('[data-drift-copy]');input.hidden=false;input.value=url;input.focus();input.select();N.toast('Скопируй ссылку из поля под атласом');}
  }
  document.addEventListener('click',e=>{
    const host=e.target.closest('[data-atlas]');if(!host||!states.has(host))return;
    const state=states.get(host),region=e.target.closest('[data-drift-region]'),track=e.target.closest('[data-drift-track]'),save=e.target.closest('[data-drift-save]');
    if(region){state.region=region.dataset.driftRegion;state.planOnly=false;draw(host);host.querySelector('.atlas-regions [data-drift-region="'+state.region+'"]')?.focus({preventScroll:true});}
    if(track){state.selected=track.dataset.driftTrack;draw(host);host.querySelector('[data-drift-track="'+state.selected+'"]')?.focus({preventScroll:true});}
    if(save){const id=save.dataset.driftSave;plans=plans.includes(id)?plans.filter(x=>x!==id):[...plans,id];savePlans();for(const h of hosts)if(h.isConnected)draw(h);host.querySelector('[data-drift-save="'+id+'"]')?.focus({preventScroll:true});N.toast(plans.includes(id)?'Трасса добавлена в твой маршрут':'Трасса убрана из маршрута');}
    if(e.target.closest('[data-drift-plan-only]')){state.planOnly=!state.planOnly;state.region='all';draw(host);}
    if(e.target.closest('[data-drift-show-all]')){state.planOnly=false;state.region='all';draw(host);}
    if(e.target.closest('[data-drift-export]'))exportPlans();
    if(e.target.closest('[data-drift-share]'))share(host);
  });
  addEventListener('storage',e=>{if(e.key!==key)return;try{plans=cleanPlans(JSON.parse(e.newValue||'[]'));for(const h of hosts)if(h.isConnected)draw(h);}catch(_){}});
  document.querySelectorAll('[data-atlas]').forEach(h=>mount(h));
  N.registerRoute('drift',renderRoute,'Drift Atlas — трассы мира');
  N.refresh();

  // A visual study, with no physics, telemetry or competition scoring claims.
  const path=$('#tandem-line'),lead=$('#tandem-lead'),chase=$('#tandem-chase'),smoke=$('#tandem-smoke'),lab=$('.tandem-lab'),pause=$('#tandem-pause');
  if(!path||!lab)return;
  const systemMotion=matchMedia('(prefers-reduced-motion:reduce)');
  const reduced=()=>document.documentElement.classList.contains('motion-reduced')||systemMotion.matches;
  const total=path.getTotalLength();
  let angle=32,gap=90,phase=.43,paused=false,inView=false,raf=0,last=0;
  function carPosition(el,distance,driftAngle){
    const d=((distance%total)+total)%total,p=path.getPointAtLength(d),q=path.getPointAtLength(Math.min(total,d+1)),before=path.getPointAtLength(Math.max(0,d-1));
    const heading=Math.atan2(q.y-before.y,q.x-before.x)*180/Math.PI;
    el.setAttribute('transform','translate('+p.x.toFixed(2)+' '+p.y.toFixed(2)+') rotate('+(heading-driftAngle).toFixed(2)+')');
    return p;
  }
  function position(){
    carPosition(lead,total*phase,angle);const p=carPosition(chase,total*phase-gap,angle*.95);
    smoke.setAttribute('transform','translate('+p.x.toFixed(2)+' '+p.y.toFixed(2)+')');
  }
  function wanted(){return !paused&&!reduced()&&inView&&!document.hidden&&N.current().route==='home';}
  function frame(now){raf=0;if(!wanted()){last=0;return;}if(last)phase=(phase+Math.min(now-last,70)/10000)%1;last=now;position();raf=requestAnimationFrame(frame);}
  function sync(){
    const off=reduced();pause.disabled=off;pause.setAttribute('aria-label',off?'Анимации отключены в настройках сайта':paused?'Продолжить анимацию заезда':'Приостановить анимацию заезда');pause.setAttribute('aria-pressed',String(paused||off));pause.textContent=off?'АНИМАЦИЯ ВЫКЛ.':paused?'▶ ПРОДОЛЖИТЬ':'Ⅱ ПАУЗА';
    if(wanted()&&!raf){last=0;raf=requestAnimationFrame(frame);}else if(!wanted()&&raf){cancelAnimationFrame(raf);raf=0;last=0;}
    position();
  }
  $('#tandem-angle').addEventListener('input',e=>{angle=Number(e.target.value);$('#tandem-angle-output').textContent=angle+'°';position();});
  $('#tandem-gap').addEventListener('input',e=>{gap=Number(e.target.value);$('#tandem-gap-output').textContent=gap<100?'БЛИЗКО':gap<140?'СРЕДНЕ':'ДАЛЬШЕ';position();});
  pause.addEventListener('click',()=>{paused=!paused;sync();});
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();},{threshold:.12}).observe(lab);
  new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  systemMotion.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);addEventListener('nocturne:route',sync);position();
  const hero=$('.drift-hero');
  hero?.addEventListener('pointermove',e=>{if(reduced()||innerWidth<901)return;const bounds=hero.getBoundingClientRect();hero.style.setProperty('--hero-pointer',((e.clientX-bounds.left)/bounds.width*12-6).toFixed(2)+'px');},{passive:true});
  hero?.addEventListener('pointerleave',()=>hero.style.setProperty('--hero-pointer','0px'));
})();
