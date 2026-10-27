const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const T = require('../tools-core.js');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(require.resolve('../cars.js'),'utf8'), context);
const cars = JSON.parse(JSON.stringify(context.window.NOCTURNE_CARS));

test('Russian aliases and multiple search terms find the intended model', () => {
  assert.deepEqual(T.filterInventory(cars,{q:'супра'}).map(c=>c.id),['supra-a80']);
  assert.deepEqual(T.filterInventory(cars,{q:'nissan rb26'}).map(c=>c.id),['skyline-r34']);
  assert.deepEqual(T.filterInventory(cars,{q:'хачироку'}).map(c=>c.id),['trueno-ae86']);
});
test('combined catalogue constraints narrow results without changing inventory order', () => {
  const before=cars.map(c=>c.id);
  const list=T.filterInventory(cars,{budget:100000,drive:'AWD',power:280,mileage:100000,body:'Седан'});
  assert.deepEqual(list.map(c=>c.id),['evolution-vi']);
  const sorted=T.filterInventory(cars,{sort:'price-asc'});
  assert.equal(sorted[0].id,'trueno-ae86');
  assert.deepEqual(cars.map(c=>c.id),before);
  assert.equal(T.filterInventory(cars,{budget:30000}).length,0);
});
test('personal matching respects a hard budget and explains the best fit', () => {
  const results=T.rankCars(cars,{budget:'100000',drive:'RWD',engine:'rotary',era:'1990',character:'analog'});
  assert.equal(results[0].id,'rx7-fd');assert.equal(results[0].score,100);
  assert.ok(results.every(r=>cars.find(c=>c.id===r.id).price<=100000));
  assert.equal(results[0].reasons.length,5);
  assert.ok(results.every(r=>r.score>=0&&r.score<=100));
});
test('ownership arithmetic includes one-time amounts once and annual amounts per year', () => {
  const totals=T.budgetTotals({price:50000,transport:1000,inspection:500,reserve:1500,distance:10000,consumption:10,fuel:2,insurance:600,maintenance:1000,other:400});
  assert.equal(totals.annualFuel,2000);assert.equal(totals.annualRunning,4000);
  assert.equal(totals.upfrontExtras,3000);assert.equal(totals.purchaseTotal,53000);
  assert.equal(totals.firstYear,57000);assert.equal(totals.threeYears,65000);
  assert.equal(totals.monthlyRunning,4000/12);
});
test('invalid or extreme numeric input stays finite and non-negative', () => {
  const totals=T.budgetTotals({price:-5,distance:Infinity,consumption:'not a number',fuel:2});
  assert.equal(totals.firstYear,0);assert.equal(totals.annualFuel,0);
  assert.equal(T.normalizeBudget({consumption:999}).consumption,100);
  assert.ok(Object.values(T.budgetTotals({price:1e99,distance:1e99,consumption:1e99,fuel:1e99})).every(v=>Number.isFinite(v)&&v>=0));
});
test('backup sanitization rejects unknown cars, invalid fields and executable search URLs', () => {
  const raw={pinned:['skyline-r34','unknown','skyline-r34'],notes:{'skyline-r34':{text:'a'.repeat(3000),rating:99,status:'invalid'},unknown:{text:'bad'}},checks:{'skyline-r34':{identity:'ok',engine:'injected',extra:'ok'}},searches:[{id:'x',name:'bad',hash:'javascript:alert(1)'},{id:'y',name:'Nissan',hash:'#/catalog?brand=Nissan'}]};
  const cleaned=T.cleanWorkspace(raw,cars.map(c=>c.id));
  assert.deepEqual(cleaned.pinned,['skyline-r34']);assert.equal(Object.keys(cleaned.notes).length,1);
  assert.equal(cleaned.notes['skyline-r34'].text.length,2000);assert.equal(cleaned.notes['skyline-r34'].rating,5);assert.equal(cleaned.notes['skyline-r34'].status,'research');
  assert.deepEqual(cleaned.checks['skyline-r34'],{identity:'ok'});assert.equal(cleaned.searches.length,1);
});
test('CSV export quotes delimiters and prevents leading formula execution', () => {
  const output=T.csv([['Модель','Цена'],['a;"b"', '=SUM(A1:A2)']]);
  assert.ok(output.startsWith('\uFEFF'));assert.ok(output.includes('"a;""b"""'));
  assert.ok(output.includes('"\'=SUM(A1:A2)"'));
});
test('every vehicle checklist has stable unique entries and its model-specific questions', () => {
  for(const car of cars){const items=T.inspectionItems(car);assert.equal(items.length,12);assert.equal(new Set(items.map(i=>i.id)).size,12);assert.equal(items.find(i=>i.id==='special').label,car.watch);}
});
