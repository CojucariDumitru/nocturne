'use strict';
(() => {
  const N = window.Nocturne, T = window.NocturneTools;
  if (!N || !T) throw new Error('NOCTURNE core is unavailable');
  const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
  const cars = N.cars, ids = cars.map(c => c.id), byId = id => cars.find(c => c.id === id);
  const esc = N.esc, photo = N.photo;
  const euro = value => '€ ' + new Intl.NumberFormat('ru-RU', {maximumFractionDigits:0}).format(value);
  const number = value => new Intl.NumberFormat('ru-RU', {maximumFractionDigits:1}).format(value);
  const key = 'nocturne-workbench-v1';
  const statusLabels = {research:'Изучаю', priority:'В приоритете', viewing:'Хочу осмотреть', later:'На потом'};
  let raw = {}; try { raw = JSON.parse(localStorage.getItem(key) || '{}'); } catch (_) {}
  let w = T.cleanWorkspace(raw, ids), persist = true, garageFilter = 'all', noteTimer = null;
  let quizStep = T.questions.findIndex(q => !w.answers[q.key]);
  if (quizStep === -1) quizStep = T.questions.length;
  let budgetCar = cars[0].id, budgetInput = T.normalizeBudget({price:cars[0].price});
  let saveContext = null, modalFocus = null, commandIndex = 0, commandItems = [], lastRecent = '';
  let compareDifferences = Boolean(raw?.compareDifferences);
  const uid = prefix => prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const route = () => N.current().route;
  const reduced = () => document.documentElement.classList.contains('motion-reduced') || matchMedia('(prefers-reduced-motion:reduce)').matches;
  function save() {
    try { localStorage.setItem(key, JSON.stringify({...w, compareDifferences})); }
    catch (_) { if (persist) N.toast('Данные доступны до закрытия вкладки: хранилище браузера недоступно.'); persist = false; }
  }
  function download(filename, contents, type = 'text/plain;charset=utf-8') {
    const blob = new Blob([contents], {type}), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function date(value) {
    const d = new Date(value); return Number.isNaN(d.getTime()) ? 'Недавно' : new Intl.DateTimeFormat('ru-RU', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(d);
  }
  function title(kicker, first, last, description) {
    return `<div class="breadcrumb"><a href="#/">Главная</a><span>/</span>${({garage:'Мой гараж',finder:'Подбор по анкете',budget:'Бюджет владения',inspection:'Личный чек-лист'})[N.current().route] || first}</div><div class="page-title"><div><p class="eyebrow muted">${kicker}</p><h1>${first}<br><span class="outline">${last}</span></h1></div><p>${description || ''}</p></div>`;
  }
  function meta(id) { return w.notes[id] || {text:'',status:'research',rating:0,updated:''}; }
  function ensureMeta(id) { if (!w.notes[id]) w.notes[id] = meta(id); return w.notes[id]; }
  function garageIds() { return [...new Set([...w.pinned, ...N.state().favorites])].filter(id => byId(id)); }
  function progress(id) {
    const items = T.inspectionItems(byId(id)); const values = w.checks[id] || {};
    return {total:items.length, done:items.filter(i=>values[i.id] && values[i.id] !== 'todo').length, questions:items.filter(i=>values[i.id] === 'question').length};
  }
  function pin(id) {
    if (!byId(id)) return;
    if (!w.pinned.includes(id)) w.pinned.unshift(id);
    save(); syncPins(); if (route() === 'garage') renderGarage(new URLSearchParams(location.hash.split('?')[1] || ''));
    N.toast('Машина закреплена в твоём гараже');
  }
  function syncPins() {
    const selected = garageIds(); const badge = $('#garage-nav-count'); if (badge) badge.textContent = selected.length;
    $$('[data-pin]').forEach(button => { const on = w.pinned.includes(button.dataset.pin); button.setAttribute('aria-pressed', String(on)); button.textContent = on ? '✓ В моём гараже' : '＋ В мой гараж'; });
  }
  function noteEditor(c, compact = false) {
    const m = meta(c.id);
    return `<div class="personal-editor ${compact?'compact':''}"><div class="personal-controls"><label>Мой статус<select data-note-status="${c.id}" aria-label="Мой статус: ${esc(c.model)}">${Object.entries(statusLabels).map(([value,label])=>`<option value="${value}" ${m.status===value?'selected':''}>${label}</option>`).join('')}</select></label><div class="rating"><span>Моя оценка</span><div role="group" aria-label="Личная оценка ${esc(c.model)}">${[1,2,3,4,5].map(n=>`<button type="button" data-rate="${c.id}" data-value="${n}" class="${n<=m.rating?'rated':''}" aria-label="Моя оценка ${esc(c.model)}: ${n} из 5" aria-pressed="${n===m.rating}">★</button>`).join('')}</div></div></div><label class="personal-note-label">Мои заметки<textarea rows="${compact?2:3}" maxlength="2000" data-note="${c.id}" aria-label="Моя заметка: ${esc(c.model)}" placeholder="Что нравится, что проверить, какие вопросы задать...">${esc(m.text)}</textarea></label><span class="note-state" data-note-state="${c.id}" role="status">${m.updated?'Сохранено · '+date(m.updated):'Только на этом устройстве'}</span></div>`;
  }
  function renderGarage(params = new URLSearchParams()) {
    const tabs = {cars:'Машины', searches:'Поиски', history:'История', budgets:'Расчёты', data:'Данные'};
    const tab = Object.hasOwn(tabs, params.get('tab')) ? params.get('tab') : 'cars';
    const selected = garageIds();
    let content = title('YOUR PRIVATE DRIVER’S WORKBENCH','YOUR','GARAGE.','Всё, что ты выбрал.<br>Все мысли, к которым стоит вернуться.');
    content += `<div class="garage-overview"><div><strong>${String(selected.length).padStart(2,'0')}</strong><span>машин в гараже</span></div><div><strong>${String(w.searches.length).padStart(2,'0')}</strong><span>сохранённых поисков</span></div><div><strong>${String(w.visits.length).padStart(2,'0')}</strong><span>недавних просмотров</span></div><p>Без аккаунта. На этом устройстве.<br>Для переноса используй вкладку «Данные».</p></div><nav class="workspace-tabs" aria-label="Разделы гаража">${Object.entries(tabs).map(([value,label])=>`<a href="#/garage?tab=${value}" class="${value===tab?'active':''}" ${value===tab?'aria-current="page"':''}>${label}</a>`).join('')}</nav>`;
    if (tab === 'cars') {
      content += `<div class="workspace-heading"><p>Закреплённые и избранные машины.</p><label>Мой статус <select id="garage-status-filter"><option value="all">Все статусы</option>${Object.entries(statusLabels).map(([value,label])=>`<option value="${value}" ${garageFilter===value?'selected':''}>${label}</option>`).join('')}</select></label></div><div id="garage-cars"></div><div class="workspace-bottom"><a class="text-link" href="#/catalog">ДОБАВИТЬ ЛЕГЕНДУ <span>＋</span></a><a class="text-link" href="#/finder">ПОДОБРАТЬ ПО ОТВЕТАМ <span>↗</span></a></div>`;
    } else if (tab === 'searches') {
      content += w.searches.length ? `<div class="saved-items">${w.searches.map(s=>{const params=new URLSearchParams(s.hash.split('?')[1]||'');const f=filtersFromHash(params);const count=T.filterInventory(cars,f,N.state().favorites).length;return `<article class="saved-item"><span class="saved-index">↗</span><div><h2>${esc(s.name)}</h2><p>${count} совпадений в текущей демо-коллекции · ${date(s.created)}</p></div><a class="secondary-button" href="${esc(s.hash)}">Открыть поиск</a><button class="remove-item" type="button" data-delete-search="${esc(s.id)}" aria-label="Удалить поиск ${esc(s.name)}">×</button></article>`;}).join('')}</div>` : NEmpty('Найди один раз.<br>Вернись когда захочешь.','Настрой фильтры в каталоге и нажми «Сохранить поиск».');
    } else if (tab === 'history') {
      content += w.visits.length ? `<div class="workspace-heading"><p>Последние восемь разных машин.</p><button type="button" class="tool-text-button" data-clear-history>Очистить историю</button></div><div class="history-grid">${w.visits.map(v=>{const c=byId(v.id);return `<article class="history-card"><a href="#/car/${c.id}"><img src="${photo(c)}" alt="${esc(c.brand+' '+c.model)}" loading="lazy"><div><span class="micro">${date(v.time)}</span><h2>${c.brand} ${c.model}</h2><p>${c.code} / ${c.version}</p></div><span>↗</span></a></article>`;}).join('')}</div>` : NEmpty('Твоя история<br>ещё впереди.','Открывай страницы автомобилей — они появятся здесь.');
    } else if (tab === 'budgets') {
      content += w.budgets.length ? `<div class="saved-items">${w.budgets.map(b=>{const total=T.budgetTotals(b.data);const c=byId(b.car);return `<article class="saved-item"><span class="saved-index">€</span><div><h2>${esc(b.name)}</h2><p>${c?c.brand+' '+c.model:'Свой расчёт'} · план на первый год: ${euro(total.firstYear)}<br>${date(b.created)}</p></div><a class="secondary-button" href="#/budget?scenario=${esc(b.id)}">Открыть расчёт</a><button class="remove-item" type="button" data-delete-budget="${esc(b.id)}" aria-label="Удалить расчёт ${esc(b.name)}">×</button></article>`;}).join('')}</div><a class="text-link" href="#/budget">НОВЫЙ РАСЧЁТ <span>＋</span></a>` : NEmpty('Чувства — это хорошо.<br>Цифры тоже пригодятся.','Построй свой бюджет покупки и владения, затем сохрани сценарий.','ПОСЧИТАТЬ РАСХОДЫ','#/budget');
    } else {
      content += `<div class="backup-grid"><article class="workspace-panel"><span class="micro">01 / TAKE IT WITH YOU</span><h2>Экспорт гаража</h2><p>Заметки, оценки, статусы, осмотры, история, поиски, расчёты и избранное — в одном JSON-файле.</p><button class="primary-button dark-button" type="button" data-export-garage>СКАЧАТЬ БЭКАП <span>↓</span></button><small>Черновики заявок с контактами в бэкап не включаются.</small></article><article class="workspace-panel"><span class="micro">02 / BRING IT BACK</span><h2>Импорт из файла</h2><p>Добавь данные из ранее скачанного бэкапа. Существующие заметки и записи не перезаписываются.</p><button class="secondary-button" type="button" data-import-garage>ВЫБРАТЬ JSON-ФАЙЛ <span>↑</span></button><input id="garage-import-file" type="file" accept="application/json,.json" class="sr-only"><small>Только бэкап NOCTURNE, до 1 МБ. Данные не уходят на сервер.</small><p class="import-status" id="import-status" role="status"></p></article></div><div class="local-data-note"><h2>Твоё устройство — твой гараж.</h2><p>Сайт не синхронизирует гараж между устройствами. Очистка данных браузера удалит локальные записи, поэтому скачай бэкап перед переносом. Не публикуй файл, если в заметках есть личные сведения.</p></div>`;
    }
    $('#garage-view').innerHTML = content;
    if (tab === 'cars') renderGarageCards();
  }
  function NEmpty(heading, description, label='В КОЛЛЕКЦИЮ', href='#/catalog') {
    return `<div class="empty-state"><span class="empty-icon">↗</span><h2>${heading}</h2><p>${description}</p><a class="primary-button" href="${href}">${label} <span>↗</span></a></div>`;
  }
  function renderGarageCards() {
    const host=$('#garage-cars'); if (!host) return;
    const list=garageIds().filter(id=>garageFilter==='all'||meta(id).status===garageFilter);
    host.innerHTML=list.length?list.map(id=>{const c=byId(id),p=progress(id);return `<article class="garage-card"><a class="garage-photo" href="#/car/${id}"><img src="${photo(c)}" alt="${esc(c.brand+' '+c.model)}" loading="lazy"><span>${c.code} / ${c.year}</span></a><div class="garage-content"><div class="garage-card-heading"><div><span class="micro">${c.brand}</span><h2><a href="#/car/${id}">${c.model}</a></h2><p>${c.version} · ${euro(c.price)} / демо</p></div><button type="button" class="remove-item" data-garage-remove="${id}" aria-label="Убрать из гаража ${esc(c.model)}">×</button></div>${noteEditor(c,true)}<div class="garage-card-actions"><a href="#/inspection?car=${id}">Осмотр <span>${p.done} / ${p.total}</span></a><a href="#/budget?car=${id}">Бюджет ↗</a><button type="button" data-compare="${id}" aria-pressed="${N.state().compare.includes(id)}">Сравнить</button></div></div></article>`;}).join(''):NEmpty(garageIds().length?'В этом статусе<br>машин пока нет.':'Твой гараж<br>начинается с мечты.',garageIds().length?'Выбери другой статус или поменяй отметку машины.':'Добавляй машины кнопкой «В мой гараж» или сохраняй в избранное.');
  }
  function filtersFromHash(params) {
    return {brands:(params.get('brand')||'').split(',').filter(Boolean),budget:params.has('budget')?T.numeric(params.get('budget'),220000,220000):220000,drive:params.get('drive')||'all',status:params.get('status')||'all',decade:params.get('decade')||'all',body:params.get('body')||'all',mileage:params.has('mileage')?T.numeric(params.get('mileage'),200000,200000):200000,power:T.numeric(params.get('power')),q:params.get('q')||'',sort:params.get('sort')||'curated',favorites:params.get('favorites')==='1'};
  }
  function renderFinder() {
    const host=$('#finder-view');
    let content=title('FIVE QUESTIONS. YOUR KIND OF JAPAN.','YOUR PERFECT','MATCH.','Не знаешь, с чего начать?<br>Давай найдём твоё сочетание.');
    if (quizStep<T.questions.length) {
      const q=T.questions[quizStep];
      content+=`<div class="finder-shell"><div class="finder-progress"><span>ВОПРОС ${quizStep+1} / ${T.questions.length}</span><span>${Math.round(quizStep/T.questions.length*100)}%</span><div><i style="width:${quizStep/T.questions.length*100}%"></i></div></div><div class="finder-question"><span class="micro">0${quizStep+1} / YOUR PREFERENCE</span><h2>${q.title}</h2><p>${q.hint}</p><fieldset class="finder-options"><legend class="sr-only">${q.title}</legend>${q.options.map(([value,label,hint])=>`<label class="finder-option"><input type="radio" name="finder-answer" value="${value}" ${w.answers[q.key]===value?'checked':''}><span><strong>${label}</strong><small>${hint}</small></span><i aria-hidden="true">↗</i></label>`).join('')}</fieldset><div class="finder-actions"><button type="button" class="tool-text-button" data-finder-back ${quizStep===0?'disabled':''}>← Назад</button><button type="button" class="primary-button dark-button" data-finder-next ${w.answers[q.key]?'':'disabled'}>${quizStep===T.questions.length-1?'ПОКАЗАТЬ МОЙ ПОДБОР':'ДАЛЬШЕ'} <span>↗</span></button></div></div></div>`;
    } else {
      const ranked=T.rankCars(cars,w.answers).slice(0,3);
      content+=`<div class="finder-result-heading"><div><span class="micro">YOUR MATCHES / ПОДБОР ПО ОТВЕТАМ</span><h2>${ranked.length?'Вот с чего стоит начать.':'В этом бюджете совпадений нет.'}</h2><p>Процент показывает совпадение с ответами, а не качество или состояние машины.</p></div><button type="button" class="secondary-button" data-finder-restart>Изменить ответы ↻</button></div>`;
      content+=ranked.length?`<div class="car-grid finder-results">${ranked.map((r,i)=>{const c=byId(r.id);return `<div class="finder-result"><div class="match-score"><span>0${i+1} / ТВОЁ СОВПАДЕНИЕ</span><strong>${r.score}%</strong></div>${N.card(c)}<ul class="match-reasons">${r.reasons.map(reason=>`<li>${reason}</li>`).join('')}</ul><button type="button" class="secondary-button" data-pin="${c.id}">＋ В мой гараж</button></div>`;}).join('')}</div><div class="finder-completion"><p>Подбор сохранён на этом устройстве. Вернись к нему через эту страницу.</p><a class="text-link" href="#/garage">В МОЙ ГАРАЖ <span>↗</span></a></div>`:NEmpty('Поменяем рамку?','Попробуй увеличить бюджет или открой всю коллекцию.');
    }
    host.innerHTML=content; syncPins();
  }
  const budgetFields = [
    ['price','Цена автомобиля, €','Демо-цена модели или твоя сумма.'],
    ['transport','Доставка, €','Твоя предварительная оценка.'],
    ['inspection','Проверка и оформление, €','Твоя сумма; тарифы не подставляются.'],
    ['reserve','Резерв, €','Сумма к планированию, не обязательный расход.'],
    ['distance','Пробег за год, км','Сколько планируешь ездить.'],
    ['consumption','Расход, л / 100 км','Твоё допущение для расчёта.'],
    ['fuel','Цена топлива, € / л','Введи свою актуальную цену.'],
    ['insurance','Страхование за год, €','Твоя сумма.'],
    ['maintenance','Обслуживание за год, €','Твой плановый бюджет.'],
    ['other','Прочие расходы за год, €','Парковка, хранение и другое.']
  ];
  function openBudget(params) {
    const scenario=w.budgets.find(b=>b.id===params.get('scenario'));
    budgetCar=scenario?.car|| (byId(params.get('car'))?params.get('car'):cars[0].id);
    const shared=budgetFields.some(([k])=>params.has(k));
    budgetInput=scenario?T.normalizeBudget(scenario.data):shared?T.normalizeBudget(Object.fromEntries(budgetFields.map(([k])=>[k,params.get(k)]))):T.normalizeBudget({price:byId(budgetCar)?.price||0});
    renderBudget();
  }
  function renderBudget() {
    $('#budget-view').innerHTML=title('PUT THE FEELING INTO PERSPECTIVE.','PLAN THE','NEXT CHAPTER.','Твои вводные.<br>Понятная арифметика.')+`<div class="budget-layout"><div class="budget-editor"><div class="workspace-panel"><label for="budget-car">От какой машины отталкиваемся?</label><select id="budget-car">${cars.map(c=>`<option value="${c.id}" ${c.id===budgetCar?'selected':''}>${c.brand} ${c.model} ${c.code}</option>`).join('')}</select><p class="tool-hint">Цена коллекции — демонстрационная. Можно заменить её своей.</p></div><div class="budget-fields"><div class="tool-section-heading"><span>01 / ПОКУПКА И РЕЗЕРВ</span></div>${budgetFields.map(([id,label,hint],i)=>`${i===4?'<div class="tool-section-heading"><span>02 / ГОДОВЫЕ РАСХОДЫ</span></div>':''}<label class="budget-field"><span>${label}</span><input type="number" inputmode="decimal" min="0" max="${id==='consumption'?100:id==='fuel'?1000:id==='distance'?1000000:100000000}" step="${['fuel','consumption'].includes(id)?'.1':'1'}" value="${budgetInput[id]}" data-budget-field="${id}" aria-label="${label}"><small>${hint}</small></label>`).join('')}</div></div><aside class="budget-summary" id="budget-summary"></aside></div><section class="budget-assumptions"><h2>Чем точнее вводные, тем полезнее результат.</h2><p>Топливо за год = пробег ÷ 100 × расход × цена литра. План первого года включает покупку, разовые суммы, резерв и один год эксплуатации. План трёх лет использует те же ежегодные вводные трижды. Резерв — отложенная сумма, а не подтверждённый расход. Кредит, налоги по конкретной стране, инфляция, амортизация и будущая продажа не рассчитываются.</p><p>Расчёт не содержит предложений продавца, страховщика или банка. Все вводные сохраняются только по твоей команде.</p></section>`;
    updateBudgetSummary();
  }
  function updateBudgetSummary() {
    const t=T.budgetTotals(budgetInput),c=byId(budgetCar),sum=t.firstYear;
    const segments=[['Автомобиль',t.price,'#d5fa38'],['Разовые суммы и резерв',t.upfrontExtras,'#8eaa65'],['Эксплуатация за год',t.annualRunning,'#4c6656']];
    $('#budget-summary').innerHTML=`<div class="budget-car-title"><img src="${photo(c)}" alt="${esc(c.brand+' '+c.model)}"><div><span class="micro">${c.code} / YOUR SCENARIO</span><h2>${c.brand} ${c.model}</h2></div></div><span class="micro">ПЛАН НА ПЕРВЫЙ ГОД · ВКЛЮЧАЯ РЕЗЕРВ</span><strong class="budget-main-total" id="budget-first-year">${euro(t.firstYear)}</strong><div class="budget-meter" role="img" aria-label="Покупка ${euro(t.price)}, разовые суммы и резерв ${euro(t.upfrontExtras)}, год эксплуатации ${euro(t.annualRunning)}">${segments.map(([,v,color])=>`<span style="width:${sum?v/sum*100:0}%;background:${color}"></span>`).join('')}</div><div class="budget-legend">${segments.map(([label,v,color])=>`<div><i style="background:${color}"></i><span>${label}</span><strong>${euro(v)}</strong></div>`).join('')}</div><dl class="budget-totals"><div><dt>Покупка + разовые суммы + резерв</dt><dd id="budget-purchase-total">${euro(t.purchaseTotal)}</dd></div><div><dt>Топливо за год</dt><dd id="budget-fuel-total">${euro(t.annualFuel)}</dd></div><div><dt>Эксплуатация за год</dt><dd id="budget-running-total">${euro(t.annualRunning)}</dd></div><div><dt>Средний месяц эксплуатации</dt><dd>${euro(t.monthlyRunning)}</dd></div><div><dt>План на три года</dt><dd>${euro(t.threeYears)}</dd></div></dl><button class="primary-button" type="button" data-save-budget>СОХРАНИТЬ СЦЕНАРИЙ <span>＋</span></button><div class="budget-share-actions"><button type="button" data-budget-export>Скачать расчёт ↓</button><button type="button" data-budget-share>Поделиться ↗</button></div><a class="budget-inspection-link" href="#/inspection?car=${c.id}">Перейти к чек-листу ${c.code} ↗</a>`;
  }
  function budgetText() {
    const t=T.budgetTotals(budgetInput),c=byId(budgetCar);
    return `NOCTURNE MOTORS — ЛИЧНЫЙ СЦЕНАРИЙ\n${c.brand} ${c.model} ${c.code}\n\n${budgetFields.map(([id,label])=>label+': '+number(budgetInput[id])).join('\n')}\n\nПокупка и резерв: ${euro(t.purchaseTotal)}\nТопливо за год: ${euro(t.annualFuel)}\nЭксплуатация за год: ${euro(t.annualRunning)}\nСредний месяц эксплуатации: ${euro(t.monthlyRunning)}\nПлан первого года: ${euro(t.firstYear)}\nПлан трёх лет: ${euro(t.threeYears)}\n\nЭто арифметика по введённым допущениям, не предложение продавца. Цены коллекции демонстрационные. Резерв включён как сумма к планированию. Кредит, налоги конкретной страны, инфляция и стоимость будущей продажи не учитываются.\n`;
  }
  function renderInspection(params) {
    const c=byId(params.get('car'))||cars[0],p=progress(c.id),values=w.checks[c.id]||{},items=T.inspectionItems(c);
    $('#inspection-view').innerHTML=title('LOOK CLOSER. WRITE IT DOWN.','CHECK THE','DETAILS.','Личный чек-лист.<br>Открытые вопросы — в одном месте.')+`<div class="inspection-header"><a class="inspection-car" href="#/car/${c.id}"><img src="${photo(c)}" alt="${esc(c.brand+' '+c.model)}"><div><span class="micro">${c.code} / ${c.version}</span><h2>${c.brand} ${c.model}</h2><span>Открыть автомобиль ↗</span></div></a><label>Другая машина<select id="inspection-car">${cars.map(x=>`<option value="${x.id}" ${x.id===c.id?'selected':''}>${x.brand} ${x.model} ${x.code}</option>`).join('')}</select></label></div><div class="inspection-progress"><div><span>ЗАПОЛНЕНО <strong id="inspection-count">${p.done} / ${p.total}</strong></span><span>ВОПРОСОВ <strong id="inspection-questions">${p.questions}</strong></span></div><div class="inspection-meter"><i id="inspection-progress-bar" style="width:${p.done/p.total*100}%"></i></div><p>Это твои отметки, а не заключение диагностики. Для покупки нужен осмотр конкретного экземпляра специалистом.</p></div><div class="inspection-list">${items.map((item,i)=>`<article class="inspection-row ${values[item.id]==='question'?'has-question':''}"><span>${String(i+1).padStart(2,'0')}</span><div><span class="micro">${item.section}</span><h3>${esc(item.label)}</h3></div><select data-check-car="${c.id}" data-check-item="${item.id}" aria-label="Осмотр: ${esc(item.label)}"><option value="todo" ${!values[item.id]||values[item.id]==='todo'?'selected':''}>Не проверено</option><option value="ok" ${values[item.id]==='ok'?'selected':''}>Отмечено: норма</option><option value="question" ${values[item.id]==='question'?'selected':''}>Есть вопрос</option></select></article>`).join('')}</div><section class="inspection-notes"><div><span class="micro">YOUR OBSERVATIONS</span><h2>Зафиксируй важное.</h2><p>Заметка общая с карточкой в твоём гараже.</p></div>${noteEditor(c)}</section><div class="inspection-actions"><button class="primary-button dark-button" type="button" data-inspection-export="${c.id}">СКАЧАТЬ МОИ ОТМЕТКИ <span>↓</span></button><button class="secondary-button" type="button" data-pin="${c.id}">＋ В мой гараж</button><a class="text-link" href="#/contact?purpose=inspection&car=${c.id}">ПОДГОТОВИТЬ ЗАПРОС <span>↗</span></a></div>`;
    syncPins();
  }
  function inspectionText(id) {
    const c=byId(id),p=progress(id),values=w.checks[id]||{},labels={todo:'Не проверено',ok:'Моя отметка: норма',question:'Есть вопрос'};
    return `NOCTURNE MOTORS — ЛИЧНЫЕ ОТМЕТКИ ОСМОТРА\n${c.brand} ${c.model} ${c.code}\nЗаполнено ${p.done}/${p.total}. Вопросов: ${p.questions}.\n\n${T.inspectionItems(c).map(i=>`[${labels[values[i.id]||'todo']}] ${i.section}: ${i.label}`).join('\n\n')}\n\nМои заметки:\n${meta(id).text||'Нет заметок'}\n\nЭто личный чек-лист, а не заключение специалиста и не подтверждение состояния автомобиля.\n`;
  }
  function installDialogs() {
    document.body.insertAdjacentHTML('beforeend',`<dialog class="work-dialog command-dialog" id="command-dialog" aria-labelledby="command-title"><div class="work-dialog-top"><h2 id="command-title">Найди свою следующую страницу.</h2><button type="button" data-close-work="command-dialog" aria-label="Закрыть быстрый поиск">×</button></div><label class="command-input"><span>↗</span><input id="command-query" type="search" placeholder="Супра, RB26, гараж, бюджет..." autocomplete="off" role="combobox" aria-expanded="true" aria-controls="command-results" aria-autocomplete="list" aria-label="Быстрый поиск автомобилей и разделов"><kbd>ESC</kbd></label><div id="command-results" role="listbox" aria-label="Результаты быстрого поиска"></div><div class="command-footnote"><span>↑ ↓ выбрать · Enter открыть</span><span>Ctrl / ⌘ + K</span></div></dialog><dialog class="work-dialog" id="save-dialog" aria-labelledby="save-dialog-title"><div class="work-dialog-top"><h2 id="save-dialog-title">Сохранить</h2><button type="button" data-close-work="save-dialog" aria-label="Закрыть сохранение">×</button></div><form id="save-work-form"><label for="save-work-name">Название</label><input id="save-work-name" name="name" maxlength="60" required placeholder="Как назовём?"><p id="save-work-hint"></p><button class="primary-button dark-button" type="submit">СОХРАНИТЬ <span>＋</span></button></form></dialog><dialog class="work-dialog quick-dialog" id="quick-dialog" aria-labelledby="quick-title"><div class="work-dialog-top"><span class="micro">QUICK LOOK / ФОТО МОДЕЛИ</span><button type="button" data-close-work="quick-dialog" aria-label="Закрыть быстрый просмотр">×</button></div><div id="quick-content"></div></dialog><dialog class="work-dialog" id="share-dialog" aria-labelledby="share-title"><div class="work-dialog-top"><h2 id="share-title">Ссылка готова.</h2><button type="button" data-close-work="share-dialog" aria-label="Закрыть ссылку">×</button></div><div class="share-dialog-content"><p>Скопируй ссылку из поля. Она содержит выбранные параметры.</p><input id="share-url" type="text" readonly aria-label="Ссылка для копирования"></div></dialog><div id="print-report" class="print-report"></div>`);
    $$('.work-dialog').forEach(d=>d.addEventListener('close',()=>{document.body.classList.toggle('dialog-open',!!$('.work-dialog[open]'));if(modalFocus?.isConnected)modalFocus.focus({preventScroll:true});}));
    $('#command-query').addEventListener('input',renderCommands);
    $('#command-query').addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();if(commandItems.length){commandIndex=(commandIndex+(e.key==='ArrowDown'?1:-1)+commandItems.length)%commandItems.length;updateCommandSelection();}}if(e.key==='Enter'&&commandItems[commandIndex]){e.preventDefault();openCommand(commandIndex);}});
    $('#save-work-form').addEventListener('submit',e=>{
      e.preventDefault();const name=$('#save-work-name').value.trim();$('#save-work-name').setCustomValidity(name?'':'Введи название.');if(!e.currentTarget.reportValidity()||!saveContext)return;
      if(saveContext.kind==='search'){
        const existing=w.searches.find(s=>s.hash===saveContext.hash);
        if(existing)existing.name=name;
        else{if(w.searches.length>=12){N.toast('Уже 12 поисков. Удали ненужный на вкладке гаража.');return;}w.searches.unshift({id:uid('search'),name,hash:saveContext.hash,created:new Date().toISOString()});}
      }else{
        if(w.budgets.length>=8){N.toast('Уже восемь сценариев. Удали ненужный в гараже.');return;}
        w.budgets.unshift({id:uid('budget'),name,car:saveContext.car,data:saveContext.data,created:new Date().toISOString()});
      }
      save();$('#save-dialog').close();N.toast(saveContext.kind==='search'?'Поиск сохранён в гараже':'Расчёт сохранён в гараже');
    });
    $('#save-work-name').addEventListener('input',()=>$('#save-work-name').setCustomValidity(''));
  }
  function showDialog(id) {
    if($('dialog[open]')&&$('dialog[open]').id!==id)return;
    const dialog=$('#'+id);modalFocus=document.activeElement;document.body.classList.add('dialog-open');dialog.showModal();
  }
  function openSave(context) {
    saveContext=context;$('#save-dialog-title').textContent=context.kind==='search'?'Сохраним этот поиск.':'Сохраним твой сценарий.';
    $('#save-work-name').value=context.kind==='search'?searchName():byId(context.car).model+' — мой бюджет';
    $('#save-work-name').setCustomValidity('');$('#save-work-hint').textContent=context.kind==='search'?'Фильтры и сортировка будут доступны в гараже → «Поиски».':'Все введённые суммы сохранятся в гараже → «Расчёты».';
    showDialog('save-dialog');$('#save-work-name').focus({preventScroll:true});$('#save-work-name').select();
  }
  function searchName() {
    const f=N.filters(),parts=[f.brands.join(' + '),f.q,f.drive!=='all'?f.drive:'',f.budget<220000?'до '+euro(f.budget):''].filter(Boolean);
    return (parts.join(' · ')||'Моя подборка легенд').slice(0,60);
  }
  async function copyLink(url) {
    try{if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(url);N.toast('Ссылка скопирована');}
    catch(_){$('#share-url').value=url;showDialog('share-dialog');$('#share-url').focus();$('#share-url').select();}
  }
  function currentBase(){return location.origin+location.pathname;}
  function renderCommands() {
    const query=$('#command-query').value.trim(),normalized=T.matchesQuery;
    const pages=[['Мой гараж','Заметки, статусы и история','#/garage','GARAGE'],['Drift Atlas / дрифт','Трассы мира и твой маршрут','#/drift','DRIFT'],['Подобрать легенду','Пять вопросов и твои совпадения','#/finder','FINDER'],['Бюджет владения','План покупки и эксплуатации','#/budget','BUDGET'],['Личный чек-лист','Мои отметки осмотра','#/inspection','CHECK'],['Коллекция','Все восемь автомобилей','#/catalog','COLLECTION'],['Сравнение','Поставить параметры рядом','#/compare','COMPARE'],['Избранное','Машины, к которым хочется вернуться','#/favorites','SAVED'],['Подготовить заявку','Локальный черновик пожеланий','#/contact','REQUEST']];
    const q=query.toLocaleLowerCase('ru-RU');
    const pageItems=pages.filter(p=>!q||p.join(' ').toLocaleLowerCase('ru-RU').includes(q)).map(p=>({label:p[0],hint:p[1],href:p[2],tag:p[3]}));
    const carItems=cars.filter(c=>normalized(c,query)).map(c=>({label:c.brand+' '+c.model,hint:c.code+' · '+c.engine+' · '+euro(c.price)+' / демо',href:'#/car/'+c.id,image:photo(c),tag:c.code}));
    commandItems=q?[...carItems,...pageItems]:[...pageItems.slice(0,5),...carItems.slice(0,3)];commandIndex=0;
    $('#command-results').innerHTML=commandItems.length?commandItems.map((item,i)=>`<button id="command-option-${i}" type="button" role="option" class="command-option ${i===0?'selected':''}" aria-selected="${i===0}" data-command-index="${i}">${item.image?`<img src="${item.image}" alt="">`:`<span class="command-tag">${item.tag}</span>`}<span><strong>${esc(item.label)}</strong><small>${esc(item.hint)}</small></span><b>↗</b></button>`).join(''):'<div class="command-empty">Совпадений нет. Попробуй марку, модель, двигатель или название раздела.</div>';
    updateCommandSelection();
  }
  function updateCommandSelection() {
    $$('.command-option').forEach((el,i)=>{el.classList.toggle('selected',i===commandIndex);el.setAttribute('aria-selected',String(i===commandIndex));});
    const selected=$('#command-option-'+commandIndex);if(selected){$('#command-query').setAttribute('aria-activedescendant',selected.id);selected.scrollIntoView({block:'nearest'});}else $('#command-query').removeAttribute('aria-activedescendant');
  }
  function openCommand(i) {const target=commandItems[i];if(!target)return;$('#command-dialog').close();location.hash=target.href;}
  function openQuick(id) {
    const c=byId(id);if(!c)return;
    $('#quick-content').innerHTML=`<img class="quick-image" src="${photo(c)}" alt="${esc(c.brand+' '+c.model)}"><div class="quick-details"><span class="micro">${c.brand.toUpperCase()} / ${c.code} / ${c.year}</span><h2 id="quick-title">${c.model}</h2><p>${c.version} · ${c.character}</p><div class="quick-stats"><span>${number(c.mileage)} км · демо</span><span>${c.power} PS</span><span>${c.drive}</span><span>${c.transmission}</span></div><strong class="quick-price">${euro(c.price)}<small>ДЕМОНСТРАЦИОННАЯ ЦЕНА</small></strong><div class="quick-actions"><a class="primary-button dark-button" href="#/car/${c.id}">СТРАНИЦА АВТОМОБИЛЯ <span>↗</span></a><button class="secondary-button" type="button" data-pin="${c.id}">＋ В мой гараж</button></div><p class="tool-hint">Фото иллюстрирует модель, а не конкретный экземпляр в продаже.</p></div>`;
    showDialog('quick-dialog');syncPins();
  }
  function decorateDetail() {
    const c=byId(N.current().car);if(!c)return;
    const main=$('#detail-view .detail-main');
    if(main&&!main.querySelector('.personal-detail'))main.insertAdjacentHTML('beforeend',`<section class="personal-detail"><div><span class="micro">YOUR PRIVATE NOTES</span><h2>Моя карточка ${c.code}.</h2><p>Сохрани мысли, пока они свежие.</p></div>${noteEditor(c)}<div class="personal-links"><button type="button" class="secondary-button" data-pin="${c.id}">＋ В мой гараж</button><a href="#/inspection?car=${c.id}">Личный чек-лист ↗</a><a href="#/budget?car=${c.id}">Посчитать бюджет ↗</a></div></section>`);
    const side=$('#detail-view .detail-purchase');
    if(side&&!side.querySelector('.detail-tools'))side.insertAdjacentHTML('beforeend',`<div class="detail-tools"><a href="#/inspection?car=${c.id}">Мои отметки осмотра <span>↗</span></a><a href="#/budget?car=${c.id}">Мой бюджет владения <span>↗</span></a></div>`);
  }
  function applyCatalogView() {
    const grid=$('#catalog-grid');if(grid)grid.classList.toggle('is-list',w.catalogView==='list');
    $$('[data-catalog-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.catalogView===w.catalogView)));
  }
  function enhanceCompare() {
    const host=$('#compare-view');if(!host||route()!=='compare')return;
    const selected=N.state().compare;
    if(!host.querySelector('.comparison-toolbox')){
      const params=new URLSearchParams(location.hash.split('?')[1]||'');if(params.has('diff'))compareDifferences=params.get('diff')==='1';
      const toolbar=document.createElement('div');toolbar.className='comparison-toolbox';
      toolbar.innerHTML=`<label class="compare-diff"><input id="compare-differences" type="checkbox" ${compareDifferences?'checked':''} ${selected.length<2?'disabled':''}> Только различия</label><select id="compare-add-car" aria-label="Добавить автомобиль к сравнению" ${selected.length>=3?'disabled':''}><option value="">${selected.length>=3?'Выбрано 3 / 3':'Добавить автомобиль...'}</option>${cars.filter(c=>!selected.includes(c.id)).map(c=>`<option value="${c.id}">${c.brand} ${c.model}</option>`).join('')}</select><div><button type="button" data-compare-share ${selected.length?'':'disabled'}>Ссылка ↗</button><button type="button" data-compare-csv ${selected.length?'':'disabled'}>CSV ↓</button><button type="button" data-compare-print ${selected.length?'':'disabled'}>Печать / PDF</button></div>`;
      host.querySelector('.page-title').insertAdjacentElement('afterend',toolbar);
      host.querySelectorAll('.compare-car').forEach((el,i)=>el.insertAdjacentHTML('beforeend',`<div class="compare-reorder"><button type="button" data-compare-move="${selected[i]}" data-direction="-1" ${i===0?'disabled':''} aria-label="Переместить ${esc(byId(selected[i]).model)} влево">←</button><span>ПОРЯДОК</span><button type="button" data-compare-move="${selected[i]}" data-direction="1" ${i===selected.length-1?'disabled':''} aria-label="Переместить ${esc(byId(selected[i]).model)} вправо">→</button></div>`));
    }
    applyCompareDifferences();canonicalCompare();
  }
  function applyCompareDifferences() {
    $$('#compare-view .compare-table tbody tr').forEach(tr=>{const values=Array.from(tr.querySelectorAll('td')).map(td=>td.textContent.trim());tr.hidden=compareDifferences&&values.length>1&&values.every(v=>v===values[0]);});
  }
  function canonicalCompare() {
    if(route()!=='compare')return;const selected=N.state().compare,p=new URLSearchParams();if(selected.length)p.set('cars',selected.join(','));if(compareDifferences)p.set('diff','1');history.replaceState(null,'',location.pathname+location.search+'#/compare'+(p.size?'?'+p:' ' ).trim());
  }
  function comparisonRows() {
    const selected=N.state().compare.map(byId);return [['Параметр',...selected.map(c=>c.brand+' '+c.model+' '+c.code)],...$$('#compare-view .compare-table tbody tr').filter(tr=>!tr.hidden).map(tr=>Array.from(tr.children).map(td=>td.textContent.trim()))];
  }
  function printComparison() {
    const rows=comparisonRows();if(rows[0].length<2)return;
    $('#print-report').innerHTML=`<header><strong>NOCTURNE MOTORS</strong><span>Личное сравнение · ${date(new Date().toISOString())}</span></header><h1>Параметры рядом.</h1><p>Цены, пробег и наличие — демонстрационные. Характеристики справочные.</p><table><thead><tr>${rows[0].map(v=>`<th>${esc(v)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(row=>`<tr>${row.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table><footer>Сравнение подготовлено в NOCTURNE MOTORS. Проверка конкретного автомобиля выполняется отдельно.</footer>`;
    window.print();
  }
  function updateRecent() {
    const wanted=w.visits.slice(0,3).map(v=>v.id), signature=wanted.join(',');
    if(signature===lastRecent)return;lastRecent=signature;
    let host=$('#recently-viewed');
    if(!wanted.length){if(host)host.remove();return;}
    if(!host){host=document.createElement('section');host.id='recently-viewed';host.className='recent-section section-pad';$('#home-view .home-cta').insertAdjacentElement('beforebegin',host);}
    host.innerHTML=`<div class="section-label"><span>YOUR RECENT CHAPTERS</span><a href="#/garage?tab=history">ВСЯ ИСТОРИЯ ↗</a></div><div class="section-heading"><h2>BACK ON<br><span class="outline">YOUR RADAR.</span></h2><p>Машины, на которых<br>ты задержался.</p></div><div class="car-grid">${wanted.map(id=>N.card(byId(id))).join('')}</div>`;
  }
  function onUI() {applyCatalogView();if(route()==='car')decorateDetail();if(route()==='compare')enhanceCompare();syncPins();}
  function onRoute(e) {
    const current=e.detail;
    $$('.work-dialog[open]').forEach(d=>d.close());
    if(current.route==='car'&&byId(current.car)){
      w.visits=[{id:current.car,time:new Date().toISOString()},...w.visits.filter(v=>v.id!==current.car)].slice(0,8);save();
    }
    if(current.route==='compare'){
      const params=new URLSearchParams(location.hash.split('?')[1]||'');if(params.has('diff'))compareDifferences=params.get('diff')==='1';
      const box=$('#compare-differences');if(box)box.checked=compareDifferences;applyCompareDifferences();
    }
    updateRecent();onUI();
  }
  async function importGarage(file) {
    const status=$('#import-status');
    try {
      if(!file)return;if(file.size>1000000)throw Error('Файл больше 1 МБ.');
      const parsed=JSON.parse(await file.text());
      if(parsed.type!=='nocturne-garage'||parsed.version!==1||!parsed.workspace||typeof parsed.workspace!=='object'||Array.isArray(parsed.workspace))throw Error('Это не бэкап NOCTURNE версии 1.');
      const incoming=T.cleanWorkspace(parsed.workspace,ids);
      const merge=(current,added,limit)=>{const map=new Map();for(const item of [...current,...added]){const previous=map.get(item.id);if(!previous||Date.parse(item.time)>Date.parse(previous.time))map.set(item.id,item);}return [...map.values()].sort((a,b)=>Date.parse(b.time)-Date.parse(a.time)).slice(0,limit);};
      // Existing notes and saved records win when a backup contains the same key.
      const firstWins=(current,added,limit)=>{const map=new Map(current.map(x=>[x.id,x]));for(const item of added)if(!map.has(item.id))map.set(item.id,item);return [...map.values()].slice(0,limit);};
      w.pinned=[...new Set([...w.pinned,...incoming.pinned])];w.notes={...incoming.notes,...w.notes};w.checks={...incoming.checks,...w.checks};w.searches=firstWins(w.searches,incoming.searches,12);w.budgets=firstWins(w.budgets,incoming.budgets,8);w.visits=merge(w.visits,incoming.visits,8);if(!Object.keys(w.answers).length)w.answers=incoming.answers;
      const existing=N.state();N.setFavorites([...new Set([...existing.favorites,...(Array.isArray(parsed.favorites)?parsed.favorites:[]).filter(id=>byId(id))])]);
      if(!existing.compare.length&&Array.isArray(parsed.compare))N.setCompare(parsed.compare.filter(id=>byId(id)).slice(0,3));
      save();renderGarage(new URLSearchParams('tab=data'));$('#import-status').textContent='Готово. Новые данные добавлены, существующие записи сохранены.';syncPins();N.toast('Гараж дополнен из бэкапа');
    }catch(error){if(status)status.textContent='Не удалось импортировать: '+(error instanceof SyntaxError?'некорректный JSON.':error.message);N.toast('Бэкап не импортирован. Текущие данные сохранены.');}
  }
  function saveNote(id,value) {
    if(!byId(id))return;const m=ensureMeta(id);m.text=T.text(value);m.updated=new Date().toISOString();save();
    $$(`[data-note-state="${id}"]`).forEach(el=>el.textContent=(persist?'Сохранено · ':'До закрытия вкладки · ')+date(m.updated));
    $$(`[data-note="${id}"]`).forEach(el=>{if(el!==document.activeElement)el.value=m.text;});
  }
  function updateRating(id,value) {
    if(!byId(id))return;const m=ensureMeta(id);m.rating=value===m.rating?0:value;m.updated=new Date().toISOString();save();
    $$(`[data-rate="${id}"]`).forEach(b=>{const n=Number(b.dataset.value);b.classList.toggle('rated',n<=m.rating);b.setAttribute('aria-pressed',String(n===m.rating));});
  }

  document.addEventListener('input',e=>{
    const target=e.target;
    if(target.matches('[data-note]')){clearTimeout(noteTimer);const id=target.dataset.note,value=target.value;$$(`[data-note-state="${id}"]`).forEach(el=>el.textContent='Сохраняю...');noteTimer=setTimeout(()=>saveNote(id,value),300);}
    if(target.matches('[data-budget-field]')){budgetInput[target.dataset.budgetField]=T.normalizeBudget({[target.dataset.budgetField]:target.value})[target.dataset.budgetField];updateBudgetSummary();}
  });
  document.addEventListener('focusout',e=>{if(e.target.matches('[data-note]')){clearTimeout(noteTimer);saveNote(e.target.dataset.note,e.target.value);}});
  document.addEventListener('change',e=>{
    const target=e.target;
    if(target.matches('[data-note-status]')){const m=ensureMeta(target.dataset.noteStatus);m.status=T.statuses.includes(target.value)?target.value:'research';m.updated=new Date().toISOString();save();if(route()==='garage')renderGarageCards();}
    if(target.id==='garage-status-filter'){garageFilter=target.value;renderGarageCards();}
    if(target.name==='finder-answer'){w.answers[T.questions[quizStep].key]=target.value;save();const next=$('[data-finder-next]');if(next)next.disabled=false;}
    if(target.id==='budget-car'){budgetCar=target.value;budgetInput.price=byId(budgetCar).price;const price=$('[data-budget-field="price"]');if(price)price.value=budgetInput.price;updateBudgetSummary();}
    if(target.id==='inspection-car')location.hash='#/inspection?car='+target.value;
    if(target.matches('[data-check-item]')){const id=target.dataset.checkCar,item=target.dataset.checkItem;if(!w.checks[id])w.checks[id]={};w.checks[id][item]=target.value;save();target.closest('.inspection-row').classList.toggle('has-question',target.value==='question');const p=progress(id);$('#inspection-count').textContent=p.done+' / '+p.total;$('#inspection-questions').textContent=p.questions;$('#inspection-progress-bar').style.width=p.done/p.total*100+'%';}
    if(target.id==='compare-differences'){compareDifferences=target.checked;save();applyCompareDifferences();canonicalCompare();}
    if(target.id==='compare-add-car'&&byId(target.value))N.setCompare([...N.state().compare,target.value]);
    if(target.id==='garage-import-file')importGarage(target.files?.[0]);
  });
  document.addEventListener('click',async e=>{
    const target=e.target;
    const command=target.closest('[data-command]');if(command){if($('#menu-toggle').getAttribute('aria-expanded')==='true'){$('#menu-toggle').click();$('#menu-toggle').focus({preventScroll:true});}$('#command-query').value='';showDialog('command-dialog');renderCommands();$('#command-query').focus({preventScroll:true});return;}
    const option=target.closest('[data-command-index]');if(option){openCommand(Number(option.dataset.commandIndex));return;}
    const close=target.closest('[data-close-work]');if(close){$('#'+close.dataset.closeWork)?.close();return;}
    const quick=target.closest('[data-quick]');if(quick){openQuick(quick.dataset.quick);return;}
    const pinned=target.closest('[data-pin]');if(pinned){pin(pinned.dataset.pin);return;}
    const remove=target.closest('[data-garage-remove]');if(remove){const id=remove.dataset.garageRemove;w.pinned=w.pinned.filter(x=>x!==id);save();N.setFavorites(N.state().favorites.filter(x=>x!==id));renderGarageCards();syncPins();N.toast('Убрано из гаража. Заметки и отметки сохранены.');return;}
    const rate=target.closest('[data-rate]');if(rate){updateRating(rate.dataset.rate,Number(rate.dataset.value));return;}
    const view=target.closest('[data-catalog-view]');if(view){w.catalogView=view.dataset.catalogView==='list'?'list':'grid';save();applyCatalogView();return;}
    if(target.closest('[data-save-search]')){openSave({kind:'search',hash:location.hash.startsWith('#/catalog')?location.hash:'#/catalog'});return;}
    if(target.closest('[data-share-search]')){await copyLink(currentBase()+location.hash);return;}
    if(target.closest('[data-finder-next]')){if(!w.answers[T.questions[quizStep].key])return;quizStep=Math.min(T.questions.length,quizStep+1);renderFinder();$('#finder-view .finder-shell,#finder-view .finder-result-heading')?.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'start'});return;}
    if(target.closest('[data-finder-back]')){quizStep=Math.max(0,quizStep-1);renderFinder();return;}
    if(target.closest('[data-finder-restart]')){quizStep=0;renderFinder();return;}
    if(target.closest('[data-save-budget]')){openSave({kind:'budget',car:budgetCar,data:T.normalizeBudget(budgetInput)});return;}
    if(target.closest('[data-budget-export]')){download('NOCTURNE-budget-'+budgetCar+'.txt','\uFEFF'+budgetText());return;}
    if(target.closest('[data-budget-share]')){const p=new URLSearchParams({car:budgetCar,...T.normalizeBudget(budgetInput)});await copyLink(currentBase()+'#/budget?'+p);return;}
    const checkExport=target.closest('[data-inspection-export]');if(checkExport){download('NOCTURNE-inspection-'+checkExport.dataset.inspectionExport+'.txt','\uFEFF'+inspectionText(checkExport.dataset.inspectionExport));return;}
    const move=target.closest('[data-compare-move]');if(move){const selected=N.state().compare,id=move.dataset.compareMove,i=selected.indexOf(id),j=i+Number(move.dataset.direction);if(i>=0&&j>=0&&j<selected.length){[selected[i],selected[j]]=[selected[j],selected[i]];N.setCompare(selected);}return;}
    if(target.closest('[data-compare-share]')){await copyLink(currentBase()+location.hash);return;}
    if(target.closest('[data-compare-csv]')){download('NOCTURNE-comparison.csv',T.csv(comparisonRows()),'text/csv;charset=utf-8');return;}
    if(target.closest('[data-compare-print]')){printComparison();return;}
    const removeSearch=target.closest('[data-delete-search]');if(removeSearch){w.searches=w.searches.filter(s=>s.id!==removeSearch.dataset.deleteSearch);save();renderGarage(new URLSearchParams('tab=searches'));return;}
    const removeBudget=target.closest('[data-delete-budget]');if(removeBudget){w.budgets=w.budgets.filter(b=>b.id!==removeBudget.dataset.deleteBudget);save();renderGarage(new URLSearchParams('tab=budgets'));return;}
    if(target.closest('[data-clear-history]')){w.visits=[];save();lastRecent='force';updateRecent();renderGarage(new URLSearchParams('tab=history'));return;}
    if(target.closest('[data-export-garage]')){const core=N.state();download('NOCTURNE-garage-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify({type:'nocturne-garage',version:1,exported:new Date().toISOString(),workspace:w,favorites:core.favorites,compare:core.compare},null,2),'application/json;charset=utf-8');return;}
    if(target.closest('[data-import-garage]')){$('#garage-import-file').click();return;}
  });
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.code==='KeyK'&&!e.altKey){if($('dialog[open]')&& !$('#command-dialog').open)return;e.preventDefault();if($('#command-dialog').open)$('#command-dialog').close();else{$('#command-query').value='';showDialog('command-dialog');renderCommands();$('#command-query').focus({preventScroll:true});}}
  });
  addEventListener('nocturne:ui',onUI);addEventListener('nocturne:route',onRoute);
  addEventListener('storage',e=>{if(e.key!==key)return;try{const incoming=JSON.parse(e.newValue||'{}');w=T.cleanWorkspace(incoming,ids);compareDifferences=!!incoming.compareDifferences;onUI();if(route()==='garage'&&!document.activeElement.matches('[data-note]'))renderGarage(new URLSearchParams(location.hash.split('?')[1]||''));}catch(_){}});
  installDialogs();
  N.registerRoute('garage',renderGarage,'Мой гараж');
  N.registerRoute('finder',renderFinder,'Подобрать японскую легенду');
  N.registerRoute('budget',openBudget,'Бюджет покупки и владения');
  N.registerRoute('inspection',renderInspection,'Личный чек-лист осмотра');
  N.refresh();onUI();updateRecent();
})();
