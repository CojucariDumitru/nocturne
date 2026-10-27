(function (root) {
  'use strict';

  const aliases = {
    'skyline-r34': 'скайлайн скай гтр р34 r34 godzilla',
    'supra-a80': 'супра тойота а80 a80 mk4',
    'rx7-fd': 'мазда рх7 ротор rx7 fd',
    'nsx-na1': 'хонда нсх нсикс na1',
    'silvia-s15': 'ниссан сильвия силвия с15 s15',
    'evolution-vi': 'эво эволюшн мицубиси лансер evo6',
    'impreza-22b': 'субару импреза 22б 22b',
    'trueno-ae86': 'тойота хачироку труено труэно ае86 ae86 панда'
  };
  const statuses = ['research', 'priority', 'viewing', 'later'];
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const text = (value, length = 2000) => typeof value === 'string' ? value.replace(/\u0000/g, '').slice(0, length) : '';
  const numeric = (value, fallback = 0, max = 100000000) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : fallback;
  };
  const normalizeText = value => String(value || '').toLocaleLowerCase('ru-RU').normalize('NFKC').replace(/[‐‑–—]/g, '-').replace(/ё/g, 'е').trim();

  function matchesQuery(car, query) {
    const words = normalizeText(query).split(/\s+/).filter(Boolean);
    const haystack = normalizeText([car.brand, car.model, car.code, car.engine, car.version, car.description, aliases[car.id] || ''].join(' '));
    return words.every(word => haystack.includes(word));
  }

  function filterInventory(cars, filters = {}, favorites = []) {
    let result = cars.filter(car =>
      (!filters.brands?.length || filters.brands.includes(car.brand)) &&
      car.price <= (filters.budget ?? 220000) &&
      (!filters.drive || filters.drive === 'all' || car.drive === filters.drive) &&
      (!filters.status || filters.status === 'all' || car.status === filters.status) &&
      (!filters.decade || filters.decade === 'all' || Math.floor(car.year / 10) * 10 === Number(filters.decade)) &&
      (!filters.body || filters.body === 'all' || car.body === filters.body) &&
      car.mileage <= (filters.mileage ?? 200000) && car.power >= (filters.power ?? 0) &&
      (!filters.favorites || favorites.includes(car.id)) && matchesQuery(car, filters.q)
    );
    const sorts = {
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      'year-desc': (a, b) => b.year - a.year,
      'power-desc': (a, b) => b.power - a.power,
      'mileage-asc': (a, b) => a.mileage - b.mileage
    };
    if (sorts[filters.sort]) result.sort(sorts[filters.sort]);
    return result;
  }

  const budgetDefaults = Object.freeze({ price: 0, transport: 0, inspection: 0, reserve: 0, distance: 0, consumption: 0, fuel: 0, insurance: 0, maintenance: 0, other: 0 });
  function normalizeBudget(input = {}) {
    return Object.fromEntries(Object.keys(budgetDefaults).map(key => [key, numeric(input[key], 0, key === 'consumption' ? 100 : key === 'fuel' ? 1000 : key === 'distance' ? 1000000 : 100000000)]));
  }
  function budgetTotals(input) {
    const b = normalizeBudget(input);
    const fuel = b.distance / 100 * b.consumption * b.fuel;
    const annual = fuel + b.insurance + b.maintenance + b.other;
    const extras = b.transport + b.inspection + b.reserve;
    return { ...b, annualFuel: fuel, annualRunning: annual, monthlyRunning: annual / 12, upfrontExtras: extras, purchaseTotal: b.price + extras, firstYear: b.price + extras + annual, threeYears: b.price + extras + annual * 3 };
  }

  const questions = [
    { key: 'budget', title: 'С какого бюджета начнём?', hint: 'Используем демонстрационные цены коллекции.', options: [['50000', 'До € 50 000', 'Чёткая рамка. Сильный характер.'], ['100000', 'До € 100 000', 'Больше пространства для выбора.'], ['150000', 'До € 150 000', 'Целюсь в свою давнюю мечту.'], ['220000', 'Вся коллекция', 'Хочу увидеть все совпадения.']] },
    { key: 'drive', title: 'Какой привод ближе?', hint: 'Выбираем ощущение, с которого хочется начать.', options: [['RWD', 'Задний', 'Классическая спортивная компоновка.'], ['AWD', 'Полный', 'Тяга на обе оси.'], ['any', 'Открыт к обоим', 'Пусть решит сама машина.']] },
    { key: 'engine', title: 'У каждого сердца свой ритм.', hint: 'Какой двигатель тебе интереснее?', options: [['six', 'Рядная шестёрка', 'RB26 или 2JZ.'], ['rotary', 'Ротор', 'Особенный характер RX-7.'], ['boxer', 'Оппозитный', 'Характер Subaru.'], ['natural', 'Атмосферный', 'VTEC или 4A-GEU.'], ['any', 'Хочу удивиться', 'Оставим все варианты.']] },
    { key: 'era', title: 'Из какой эпохи твой постер?', hint: 'Можно выбрать время — или не ограничивать себя.', options: [['1980', 'Восьмидесятые', 'Аналоговое начало истории.'], ['1990', 'Девяностые', 'Эпоха большинства наших икон.'], ['2000', 'Начало двухтысячных', 'Последние главы классических серий.'], ['any', 'Вне времени', 'Год для меня не главное.']] },
    { key: 'character', title: 'И последнее: что должно зацепить?', hint: 'Это редакционный подбор по ответам, а не оценка состояния машин.', options: [['rally', 'Раллийная энергия', 'В первую очередь Evo и Impreza.'], ['supercar', 'Суперкарная эстетика', 'Среднемоторная NSX.'], ['analog', 'Аналоговый характер', 'Trueno, Silvia и RX-7.'], ['icon', 'Тот самый культовый силуэт', 'Skyline и Supra.'], ['any', 'Хочу своё совпадение', 'Без дополнительного предпочтения.']] }
  ];
  function sanitizeAnswers(input = {}) {
    return Object.fromEntries(questions.flatMap(q => q.options.some(o => o[0] === input[q.key]) ? [[q.key, input[q.key]]] : []));
  }
  function rankCars(cars, input) {
    const a = sanitizeAnswers(input);
    const budget = Number(a.budget || 220000);
    const groups = { rally: ['evolution-vi', 'impreza-22b'], supercar: ['nsx-na1'], analog: ['trueno-ae86', 'silvia-s15', 'rx7-fd'], icon: ['skyline-r34', 'supra-a80'] };
    return cars.filter(c => c.price <= budget).map(car => {
      let score = 30;
      const reasons = ['В пределах выбранного бюджета'];
      const drive = !a.drive || a.drive === 'any' || car.drive === a.drive;
      if (drive) { score += 20; if (a.drive && a.drive !== 'any') reasons.push('Нужный привод: ' + car.drive); }
      const engine = !a.engine || a.engine === 'any' || ({six: ['RB26DETT', '2JZ-GTE'], rotary: ['13B-REW'], boxer: ['EJ22'], natural: ['C30A', '4A-GEU']}[a.engine] || []).includes(car.engine);
      if (engine) { score += 25; if (a.engine && a.engine !== 'any') reasons.push('Интересный тебе тип двигателя'); }
      const era = !a.era || a.era === 'any' || Math.floor(car.year / 10) * 10 === Number(a.era);
      if (era) { score += 15; if (a.era && a.era !== 'any') reasons.push('Совпадает эпоха'); }
      const character = !a.character || a.character === 'any' || groups[a.character]?.includes(car.id);
      if (character) { score += 10; if (a.character && a.character !== 'any') reasons.push('Близкий тебе характер'); }
      return { id: car.id, score, reasons };
    }).sort((a, b) => b.score - a.score || cars.findIndex(c => c.id === a.id) - cars.findIndex(c => c.id === b.id));
  }

  function inspectionItems(car) {
    return [
      ['identity', 'Документы', 'Сверить идентификатор кузова и данные в документах'],
      ['history', 'Документы', 'Собрать записи обслуживания и сведения о доработках'],
      ['body', 'Кузов', 'Осмотреть кузов, зазоры и следы ремонта со специалистом'],
      ['corrosion', 'Кузов', 'Проверить днище, арки и скрытые полости на коррозию'],
      ['engine', 'Агрегаты', 'Провести диагностику двигателя у профильного специалиста'],
      ['cooling', 'Агрегаты', 'Проверить охлаждение, течи и состояние жидкостей'],
      ['transmission', 'Трансмиссия', 'Оценить работу коробки и дифференциала'],
      ['suspension', 'Шасси', 'Проверить подвеску, тормоза и шины'],
      ['electrics', 'Салон', 'Проверить приборы, электрику и климатическую систему'],
      ['road', 'Осмотр', 'Согласовать безопасную проверку со специалистом'],
      ['special', 'Особенности ' + car.code, car.watch],
      ['questions', 'Решение', 'Записать открытые вопросы и условия следующего шага']
    ].map(([id, section, label]) => ({ id, section, label }));
  }

  function csv(rows) {
    return '\uFEFF' + rows.map(row => row.map(value => {
      let s = String(value ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    }).join(';')).join('\r\n');
  }

  function cleanWorkspace(input, ids) {
    const raw = record(input) ? input : {};
    const allowed = new Set(ids);
    const cleanIds = value => Array.isArray(value) ? [...new Set(value.filter(id => allowed.has(id)))].slice(0, 30) : [];
    const notes = {};
    if (record(raw.notes)) for (const [id, note] of Object.entries(raw.notes)) if (allowed.has(id) && record(note)) notes[id] = { text: text(note.text), status: statuses.includes(note.status) ? note.status : 'research', rating: Math.round(numeric(note.rating, 0, 5)), updated: text(note.updated, 50) };
    const checks = {};
    const itemIds = new Set(['identity','history','body','corrosion','engine','cooling','transmission','suspension','electrics','road','special','questions']);
    if (record(raw.checks)) for (const [id, values] of Object.entries(raw.checks)) if (allowed.has(id) && record(values)) checks[id] = Object.fromEntries(Object.entries(values).filter(([key, value]) => itemIds.has(key) && ['todo','ok','question'].includes(value)));
    const searches = Array.isArray(raw.searches) ? raw.searches.filter(s => record(s) && typeof s.hash === 'string' && /^#\/catalog(?:\?|$)/.test(s.hash)).slice(0, 12).map(s => ({ id: text(s.id, 60).replace(/[^a-zA-Z0-9_-]/g,''), name: text(s.name, 60), hash: text(s.hash, 1500), created: text(s.created, 50) })).filter(s => s.id && s.name) : [];
    const visits = Array.isArray(raw.visits) ? raw.visits.filter(v => record(v) && allowed.has(v.id)).slice(0, 8).map(v => ({ id: v.id, time: text(v.time, 50) })) : [];
    const budgets = Array.isArray(raw.budgets) ? raw.budgets.filter(b => record(b) && record(b.data)).slice(0, 8).map(b => ({ id: text(b.id, 60).replace(/[^a-zA-Z0-9_-]/g,''), name: text(b.name, 60), car: allowed.has(b.car) ? b.car : '', data: normalizeBudget(b.data), created: text(b.created, 50) })).filter(b => b.id && b.name) : [];
    return { pinned: cleanIds(raw.pinned), visits, notes, checks, searches, budgets, answers: sanitizeAnswers(raw.answers), catalogView: raw.catalogView === 'list' ? 'list' : 'grid' };
  }

  const api = Object.freeze({ aliases, statuses, numeric, text, matchesQuery, filterInventory, budgetDefaults, normalizeBudget, budgetTotals, questions, sanitizeAnswers, rankCars, inspectionItems, csv, cleanWorkspace });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.NocturneTools = api;
})(typeof window !== 'undefined' ? window : null);
