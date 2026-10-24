const categories = [
  { name: 'Дім і комуналка', color: '#261b07', keys: ['оренд', 'аренд', 'квартир', 'комун', 'світло', 'свет', 'вода', 'газ', 'інтернет', 'интернет', 'мобіль', 'мобиль'] },
  { name: 'Продукти', color: '#e89b01', keys: ['сільпо', 'сильпо', 'атб', 'продукт', 'маркет', 'супермаркет', 'хліб', 'хлеб', 'овоч', 'молок', 'мясо', 'м’ясо', 'їжа'] },
  { name: 'Транспорт', color: '#f0624f', keys: ['таксі', 'такси', 'метро', 'автобус', 'маршрут', 'пальн', 'бенз', 'палив', 'uber', 'bolt', 'проїзд', 'проезд', 'квиток', 'билет'] },
  { name: 'Кафе й ресторани', color: '#f9a600', keys: ['кава', 'кофе', 'кав’яр', 'кофейн', 'ресторан', 'кафе', 'піц', 'пиц', 'бургер', 'суші', 'суши', 'доставка'] },
  { name: 'Покупки', color: '#d5befa', keys: ['одяг', 'одеж', 'взут', 'технік', 'техник', 'покуп', 'подар', 'маркетплейс', 'розетка', 'rozetka'] },
  { name: 'Дозвілля й підписки', color: '#8f897e', keys: ['netflix', 'spotify', 'підпис', 'подпис', 'кіно', 'кино', 'театр', 'гра', 'игра', 'спортзал', 'фітнес', 'фитнес', 'концерт'] },
  { name: "Здоров'я й догляд", color: '#aca89f', keys: ['аптек', 'лікар', 'врач', 'аналіз', 'анализ', 'стомат', 'космет', 'перукар', 'барбер', 'здоров', 'догляд'] },
  { name: 'Інше', color: '#d5d2cd', keys: [] }
];
const weekdays = { 'понеділок': 1, 'понедельник': 1, 'вівторок': 2, 'вторник': 2, 'середа': 3, 'среда': 3, 'четвер': 4, 'четверг': 4, "п’ятниця": 5, 'пятница': 5, 'субота': 6, 'суббота': 6, 'неділя': 0, 'воскресенье': 0 };
const monthNames = ['січень','лютий','березень','квітень','травень','червень','липень','серпень','вересень','жовтень','листопад','грудень'];
const monthShort = ['січ','лют','бер','кві','тра','чер','лип','сер','вер','жов','лис','гру'];
const storage = { user: 'oblik_user_entries_v1', hidden: 'oblik_demo_hidden_v1', deletedDemo: 'oblik_deleted_demo_entries_v1', settings: 'oblik_settings_v1', theme: 'oblik_theme_v1', demoOverrides: 'oblik_demo_category_overrides_v1' };
let selectedMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let cumulative = true;
let supabaseClient = null;
let authUser = null;
let authMode = 'login';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const pad = (n) => String(n).padStart(2, '0');
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (key) => { const [y,m,d] = key.split('-').map(Number); return new Date(y, m - 1, d); };
const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const money = (value) => new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 }).format(Math.round(value));
const parseMoney = (value) => Math.round(Number(String(value).replace(/\s/g, '').replace(',', '.')));
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[char]));

function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function uid() { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function userStorageKey() { return authUser ? `${storage.user}_${authUser.id}` : storage.user; }
function getUserEntries() { return read(userStorageKey(), []); }
function setUserEntries(entries) { write(userStorageKey(), entries); }
function settingsStorageKey() { return authUser ? `${storage.settings}_${authUser.id}` : storage.settings; }
function daysInMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
function currentDayFor(d) { return d.getFullYear() === new Date().getFullYear() && d.getMonth() === new Date().getMonth() ? new Date().getDate() : daysInMonth(d); }
function formatDate(key, short = false) { const d = fromKey(key); return short ? `${pad(d.getDate())}.${pad(d.getMonth()+1)}` : `${pad(d.getDate())} ${monthShort[d.getMonth()]}`; }
function normalize(value) { return value.toLowerCase().replace(/[’']/g, '').replace(/\s+/g, ' ').trim(); }

function categoryFor(name) {
  const text = normalize(name);
  const match = categories.findIndex((category) => category.keys.some((key) => text.includes(normalize(key))));
  return match >= 0 ? match : categories.length - 1;
}

function resolveDate(text, base = new Date()) {
  const lower = normalize(text);
  if (lower.includes('позавчора') || lower.includes('позавчера')) { const d = new Date(base); d.setDate(d.getDate() - 2); return dateKey(d); }
  if (lower.includes('вчора') || lower.includes('вчера')) { const d = new Date(base); d.setDate(d.getDate() - 1); return dateKey(d); }
  if (lower.includes('сьогодні') || lower.includes('сегодня')) return dateKey(base);
  const weekday = Object.keys(weekdays).find((day) => lower.includes(day));
  if (weekday) {
    const d = new Date(base); const target = weekdays[weekday]; const diff = (d.getDay() - target + 7) % 7 || 7; d.setDate(d.getDate() - diff); return dateKey(d);
  }
  const numeric = lower.match(/(?:^|\s)(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?(?:\s|$)/);
  if (numeric) { const year = numeric[3] ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]) : base.getFullYear(); return dateKey(new Date(year, Number(numeric[2])-1, Number(numeric[1]))); }
  return dateKey(base);
}

function parseEntries(raw) {
  const source = raw.trim(); if (!source) return [];
  const global = source.match(/^\s*(сьогодні|сегодня|вчора|вчера|позавчора|позавчера|у?\s*(?:понеділок|понедельник|вівторок|вторник|середа|среда|четвер|четверг|п’ятниця|пятница|субота|суббота|неділя|воскресенье))\s*:/i);
  const inheritedDate = global ? resolveDate(global[1]) : null;
  const body = global ? source.slice(global[0].length) : source;
  return body.split(/[,;\n]+/).map((part) => part.trim()).filter(Boolean).map((part) => {
    const amountMatch = part.match(/(\d{1,3}(?:[\s\u00a0]\d{3})+|\d+(?:[.,]\d{1,2})?)\s*(?:грн|₴)?/i);
    if (!amountMatch) return null;
    const amount = parseMoney(amountMatch[1]); if (!amount) return null;
    const localDate = resolveDate(part);
    const date = inheritedDate || (/(вчора|вчера|позавчора|позавчера|сьогодні|сегодня|понеділ|понедель|вівтор|вторник|серед|сред|четвер|п’ят|пятниц|субот|суббот|неді|воскрес|\d{1,2}[./-]\d{1,2})/i.test(part) ? localDate : dateKey(new Date()));
    let name = part.replace(amountMatch[0], '').replace(/\b(сьогодні|сегодня|вчора|вчера|позавчора|позавчера|у|в|на|дня|день|понеділок|понедельник|вівторок|вторник|середа|среда|четвер|четверг|п’ятниця|пятница|субота|суббота|неділя|воскресенье)\b/gi, ' ').replace(/\s{2,}/g, ' ').replace(/^[-–—:]+|[-–—:]+$/g, '').trim();
    if (!name) name = 'Витрата';
    return { id: uid(), name, amount, date, category: categoryFor(name), source: 'user' };
  }).filter(Boolean);
}

function demoEntries() {
  const now = new Date(); const result = []; const push = (monthOffset, day, name, amount, category = null) => {
    const d = new Date(now.getFullYear(), now.getMonth() - monthOffset, Math.min(day, daysInMonth(new Date(now.getFullYear(), now.getMonth() - monthOffset, 1))));
    result.push({ id: `demo-${monthOffset}-${day}-${name}`, name, amount, date: dateKey(d), category: category ?? categoryFor(name), source: 'demo' });
  };
  for (let offset = 5; offset >= 0; offset--) {
    push(offset, 2, 'Оренда', 12500); push(offset, 8, 'Netflix', 299); push(offset, 15, 'Інтернет', 320); push(offset, 21, 'Комунальні', 1480);
    push(offset, 4, 'Сільпо', 980 + (5 - offset) * 80); push(offset, 11, 'АТБ', 760 + offset * 35); push(offset, 18, 'Продукти', 1220); push(offset, 26, 'Сільпо', 640);
    push(offset, 3, 'Кава', 85); push(offset, 5, 'Кава', 85); push(offset, 7, 'Кава', 95); push(offset, 10, 'Кава', 85); push(offset, 12, 'Кава', 95); push(offset, 14, 'Кава', 85); push(offset, 17, 'Кава', 85); push(offset, 20, 'Кава', 95); push(offset, 22, 'Кава', 85); push(offset, 24, 'Кава', 95); push(offset, 27, 'Кава', 85); push(offset, 29, 'Кава', 95);
    push(offset, 6, 'Таксі додому', 240); push(offset, 13, 'Метро', 80); push(offset, 19, 'Таксі', 310); push(offset, 25, 'Метро', 80);
    push(offset, 9, 'Аптека', 420); push(offset, 16, 'Догляд', 650); push(offset, 23, 'Кіно', 360);
  }
  return result;
}

function allEntries() {
  const overrides = read(storage.demoOverrides, {});
  const deleted = read(storage.deletedDemo, {});
  const demo = read(storage.hidden, false) ? [] : demoEntries().filter((entry) => !deleted[entry.id]).map((entry) => ({ ...entry, category: overrides[entry.id] ?? entry.category }));
  return [...demo, ...getUserEntries()];
}
function entriesForMonth(month = selectedMonth) { const key = monthKey(month); return allEntries().filter((entry) => entry.date.startsWith(key)); }
function defaultBudgets() { return { 'Дім і комуналка': 16000, 'Продукти': 9000, 'Транспорт': 3500, 'Кафе й ресторани': 3500, 'Покупки': 4500, 'Дозвілля й підписки': 1800, "Здоров'я й догляд": 2500, 'Інше': 2500 }; }
function budgets() { return read(settingsStorageKey(), defaultBudgets()); }
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400); }
function total(entries) { return entries.reduce((sum, entry) => sum + entry.amount, 0); }

function render() {
  const entries = entriesForMonth(); const activeDay = currentDayFor(selectedMonth); const monthDays = daysInMonth(selectedMonth); const totalToDate = total(entries.filter((entry) => fromKey(entry.date).getDate() <= activeDay));
  $('#monthLabel').textContent = `${monthNames[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`;
  $('#summaryPeriod').textContent = selectedMonth.getMonth() === new Date().getMonth() && selectedMonth.getFullYear() === new Date().getFullYear() ? 'з 1 по сьогодні' : `за ${monthDays} днів`;
  $('#totalSpent').innerHTML = `${money(totalToDate)} <small>₴</small>`;
  renderSummary(entries, totalToDate, activeDay);
  renderMetrics(entries, totalToDate, activeDay, monthDays);
  renderCategories(entries);
  renderInsights(entries, totalToDate, activeDay, monthDays);
  renderDaily(entries, activeDay);
  renderHeatmap(entries, monthDays);
  renderSixMonths();
  renderBudgets(entries, activeDay, monthDays);
  renderJournal(entries);
  const demoVisible = !read(storage.hidden, false);
  $('#demoBadge').style.display = demoVisible ? 'inline-block' : 'none';
  $('#removeDemoBtn').style.display = demoVisible ? 'inline-block' : 'none';
}

function renderSummary(entries, currentTotal, activeDay) {
  const previous = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1); const prevEntries = entriesForMonth(previous); const comparableDay = Math.min(activeDay, daysInMonth(previous)); const prevTotal = total(prevEntries.filter((entry) => fromKey(entry.date).getDate() <= comparableDay));
  const diff = prevTotal ? ((currentTotal - prevTotal) / prevTotal) * 100 : (currentTotal ? 100 : 0); const sums = categorySums(entries); const top = Object.entries(sums).sort((a,b) => b[1]-a[1])[0];
  const direction = diff >= 0 ? 'більше' : 'менше'; const amount = Math.abs(Math.round(diff));
  $('#summarySentence').innerHTML = currentTotal ? `Цього місяця на <strong>${amount}% ${direction}</strong>, ніж за ті ж дні минулого. Найбільше забирає <strong>${escapeHtml(top?.[0] || '—')}</strong>.` : 'Дані з’являться після першого запису.';
}

function categorySums(entries) { return categories.reduce((acc, category) => { acc[category.name] = total(entries.filter((entry) => entry.category === categories.indexOf(category))); return acc; }, {}); }
function isRecurring(entry) { return /оренд|аренд|комун|підпис|подпис|netflix|spotify|інтернет|интернет|мобіль|мобиль/i.test(entry.name); }
function renderMetrics(entries, currentTotal, activeDay, monthDays) {
  const dailyAvg = activeDay ? currentTotal / activeDay : 0; const recurring = total(entries.filter(isRecurring)); const variable = total(entries.filter((entry) => !isRecurring(entry))); const forecast = recurring + (activeDay ? (variable / activeDay) * monthDays : 0); const budgetTotal = Object.values(budgets()).reduce((a,b) => a + Number(b), 0); const remaining = budgetTotal - currentTotal; const daysLeft = Math.max(monthDays - activeDay, 1); const dailyBudget = Math.max(remaining, 0) / daysLeft;
  const dailyValues = Array.from({ length: activeDay }, (_, i) => total(entries.filter((entry) => fromKey(entry.date).getDate() === i + 1))); const max = Math.max(...dailyValues, 1);
  const spark = dailyValues.slice(-12).map((value) => `<i style="height:${Math.max(10, value/max*100)}%"></i>`).join('');
  $('#metricGrid').innerHTML = `
    <article class="paper-card metric-card"><div class="metric-label">СЕРЕДНЄ НА ДЕНЬ</div><div class="metric-value">${money(dailyAvg)} <small>₴</small></div><div class="metric-foot"><span>за ${activeDay} ${activeDay === 1 ? 'день' : 'днів'}</span><span class="sparkline">${spark}</span></div></article>
    <article class="paper-card metric-card accent"><div class="metric-label">ПРОГНОЗ НА КІНЕЦЬ</div><div class="metric-value">${money(forecast)} <small>₴</small></div><div class="metric-foot"><span>${forecast > budgetTotal ? 'вище бюджету' : 'у межах плану'}</span><span>${Math.round((forecast / Math.max(budgetTotal,1))*100)}%</span></div></article>
    <article class="paper-card metric-card"><div class="metric-label">ЗАЛИШОК БЮДЖЕТУ</div><div class="metric-value">${money(remaining)} <small>₴</small></div><div class="metric-foot"><span>${money(dailyBudget)} ₴ / день</span><span>до кінця</span></div></article>
    <article class="paper-card metric-card"><div class="metric-label">ОПЕРАЦІЇ</div><div class="metric-value">${entries.length}</div><div class="metric-foot"><span>у цьому місяці</span><span>↗</span></div></article>`;
}

function renderCategories(entries) {
  const sums = categorySums(entries); const grand = total(entries); const prev = categorySums(entriesForMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth()-1, 1)));
  $('#categoryMeta').textContent = `${money(grand)} ₴ · ${entries.length} записів`;
  $('#categoryStrip').innerHTML = categories.map((category) => `<span style="width:${grand ? sums[category.name]/grand*100 : 0}%;background:${category.color}" title="${category.name}: ${money(sums[category.name])} ₴"></span>`).join('');
  $('#categoryTable').innerHTML = categories.filter((category) => sums[category.name] > 0 || entries.length === 0).map((category) => { const change = prev[category.name] ? ((sums[category.name]-prev[category.name])/prev[category.name])*100 : (sums[category.name] ? 100 : 0); return `<div class="category-row"><div class="category-name"><i class="color-dot" style="background:${category.color}"></i>${category.name}</div><div class="category-amount">${money(sums[category.name])} ₴</div><div class="category-percent">${grand ? Math.round(sums[category.name]/grand*100) : 0}%</div><div class="category-change ${change > 0 ? 'up' : change < 0 ? 'down' : ''}">${change ? `${change > 0 ? '+' : ''}${Math.round(change)}%` : '—'}</div></div>`; }).join('');
}

function renderInsights(entries, currentTotal, activeDay, monthDays) {
  const sums = categorySums(entries); const prev = categorySums(entriesForMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth()-1, 1))); const growth = categories.map((c) => ({ name: c.name, value: (sums[c.name] || 0) - (prev[c.name] || 0) })).sort((a,b) => b.value-a.value)[0];
  const grouped = {}; entries.forEach((entry) => { const key = normalize(entry.name).replace(/\d+/g,'').trim(); if (key) (grouped[key] ||= []).push(entry); }); const habit = Object.entries(grouped).sort((a,b) => b[1].length-a[1].length)[0]; const habitAvg = habit ? total(habit[1])/habit[1].length : 0; const annual = habit ? Math.round(habit[1].length / Math.max(activeDay,1) * 365 * habitAvg) : 0;
  const b = budgets(); const budgetTotal = Object.values(b).reduce((a,v) => a+Number(v), 0); const recurring = total(entries.filter(isRecurring)); const forecast = recurring + (activeDay ? total(entries.filter((entry) => !isRecurring(entry))) / activeDay * monthDays : 0); const biggest = [...entries].sort((a,b) => b.amount-a.amount)[0]; const weekend = entries.filter((entry) => [0,6].includes(fromKey(entry.date).getDay())); const weekendShare = currentTotal ? Math.round(total(weekend)/currentTotal*100) : 0;
  const cards = [
    ['ЗРОСТАННЯ', growth?.value > 0 ? `${growth.name} +${money(growth.value)} ₴` : 'Ритм стабільний', growth?.value > 0 ? 'Ця категорія додала найбільше проти попереднього місяця.' : 'Порівняння з минулим місяцем без різких змін.'],
    ['МАЛА ЗВИЧКА', habit ? `${habit[0]} · ${habit[1].length} разів` : 'Ще замало даних', habit ? `У такому темпі це близько ${money(annual)} ₴ на рік.` : 'Додай ще кілька записів, і з’являться патерни.'],
    ['ПРОГНОЗ', `${money(forecast)} ₴ / ${money(budgetTotal)} ₴`, forecast > budgetTotal ? `Можливе перевищення плану на ${money(forecast-budgetTotal)} ₴.` : `Є запас ${money(budgetTotal-forecast)} ₴ до бюджету.`],
    ['НАЙБІЛЬШЕ', biggest ? `${biggest.name} · ${money(biggest.amount)} ₴` : 'Поки порожньо', biggest ? `${formatDate(biggest.date)} · вихідні складають ${weekendShare}% витрат.` : 'Почни з одного повідомлення.']
  ];
  $('#insightsGrid').innerHTML = cards.map(([label,title,copy]) => `<article class="insight-card"><div class="insight-label">${label}</div><div class="insight-title">${escapeHtml(title)}</div><div class="insight-copy">${escapeHtml(copy)}</div></article>`).join('');
}

function renderDaily(entries, activeDay) {
  const values = Array.from({length: activeDay}, (_, i) => total(entries.filter((entry) => fromKey(entry.date).getDate() === i+1))); const avg = values.length ? total(values)/values.length : 0; const maxRaw = Math.max(...values, 1); const sorted = [...values].sort((a,b) => a-b); const median = sorted[Math.floor(sorted.length/2)] || 1; const clipped = maxRaw > median * 2.2; const scale = clipped ? Math.max(median*2.2, 1) : maxRaw; let running = 0;
  const bars = values.map((value, index) => { running += value; const shown = cumulative ? running : value; const maxShown = cumulative ? total(values) : scale; const high = !cumulative && clipped && value > median*2.2; return `<div class="day-bar-wrap"><div class="day-bar ${high ? 'high' : ''}" style="height:${Math.max(value ? 2 : 0, shown/maxShown*100)}%"><span class="bar-amount">${money(value)} ₴</span></div>${(index === 0 || (index+1)%5 === 0 || index === values.length-1) ? `<span class="bar-label">${index+1}</span>` : ''}</div>`; }).join(''); const linePos = cumulative ? 0 : 100 - Math.min(100, avg/scale*100);
  $('#dailyChart').innerHTML = `<div class="avg-line" style="top:${linePos}%"></div>${bars || '<span class="empty-state">Немає даних</span>'}`;
}

function renderHeatmap(entries, monthDays) {
  const values = Array.from({length: monthDays}, (_, i) => total(entries.filter((entry) => fromKey(entry.date).getDate() === i+1))); const max = Math.max(...values, 1); const first = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).getDay(); const offset = (first + 6) % 7; let html = Array.from({length: offset}, () => '<i class="heat-cell"></i>').join(''); html += values.map((value, i) => { const level = value ? Math.min(4, Math.ceil(value/max*4)) : 0; return `<i class="heat-cell h${level}" data-day="${i+1}" title="${i+1} ${monthNames[selectedMonth.getMonth()]}: ${money(value)} ₴"></i>`; }).join(''); $('#heatmap').innerHTML = html;
}

function renderSixMonths() {
  const months = Array.from({length: 6}, (_, i) => new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 5 + i, 1)); const totals = months.map((month) => { const entries = entriesForMonth(month); return { month, entries, total: total(entries) }; }); const max = Math.max(...totals.map((m) => m.total), 1);
  $('#sixMonthChart').innerHTML = totals.map(({month, entries, total: monthTotal}) => { const sums = categorySums(entries); return `<button class="month-bar-wrap" data-month="${monthKey(month)}"><span class="month-total">${money(monthTotal)} ₴</span><span class="month-stack" style="height:${Math.max(3, monthTotal/max*100)}%">${categories.map((category) => `<span style="height:${monthTotal ? sums[category.name]/monthTotal*100 : 0}%;background:${category.color}"></span>`).join('')}</span><span class="month-name">${monthShort[month.getMonth()]}</span></button>`; }).join('');
  $('#chartCategoryLegend').innerHTML = categories.slice(0, 7).map((category) => `<span><i style="background:${category.color}"></i>${category.name}</span>`).join('');
  $$('.month-bar-wrap').forEach((button) => button.addEventListener('click', () => { const [year, month] = button.dataset.month.split('-').map(Number); selectedMonth = new Date(year, month-1, 1); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
}

function renderBudgets(entries, activeDay, monthDays) {
  const current = budgets(); const sums = categorySums(entries); $('#budgetGrid').innerHTML = categories.map((category) => { const limit = Number(current[category.name] || 0); const used = sums[category.name] || 0; const percent = limit ? used/limit*100 : 0; const expected = limit * activeDay/monthDays; const over = used > limit; return `<article class="budget-card"><div class="budget-top"><div class="budget-name"><i class="color-dot" style="background:${category.color}"></i>${category.name}</div><label><span class="sr-only">Ліміт ${category.name}</span><input class="budget-input" type="number" min="0" step="100" value="${limit}" data-budget="${category.name}" aria-label="Ліміт ${category.name}" /> ₴</label></div><div class="budget-used"><span>${money(used)} ₴ витрачено</span><span>${Math.round(percent)}%</span></div><div class="progress"><i class="${over ? 'over' : ''}" style="width:${Math.min(100, percent)}%"></i></div><div class="budget-note ${over ? 'over' : ''}">${over ? `Перевищено на ${money(used-limit)} ₴` : `Сьогодні мав би бути ${money(expected)} ₴`}</div></article>`; }).join(''); $$('.budget-input').forEach((input) => input.addEventListener('change', async () => { const next = budgets(); next[input.dataset.budget] = Math.max(0, Number(input.value) || 0); write(settingsStorageKey(), next); await cloudSettingsUpsert(next); render(); showToast('Бюджет оновлено'); }));
}

function renderJournal(entries) {
  const query = normalize($('#searchInput')?.value || ''); const filter = $('#categoryFilter')?.value || 'all'; const filtered = entries.filter((entry) => (!query || normalize(entry.name).includes(query)) && (filter === 'all' || entry.category === Number(filter))).sort((a,b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  $('#journalCount').textContent = `${filtered.length} ${filtered.length === 1 ? 'операція' : 'операцій'}`; $('#journalList').innerHTML = filtered.length ? filtered.map((entry) => `<div class="journal-row"><span class="journal-date">${formatDate(entry.date)}</span><span class="journal-desc">${escapeHtml(entry.name)}</span><button class="category-chip" data-cycle="${entry.id}" title="Змінити категорію">${categories[entry.category].name}</button><span class="journal-amount">${money(entry.amount)} ₴</span><button class="delete-button" data-delete="${entry.id}" aria-label="Видалити ${escapeHtml(entry.name)}">×</button></div>`).join('') : '<div class="empty-state">У цьому місяці ще немає записів.</div>';
  $$('[data-cycle]').forEach((button) => button.addEventListener('click', async () => {
    const target = allEntries().find((entry) => entry.id === button.dataset.cycle);
    if (!target) return;
    const nextCategory = (target.category + 1) % categories.length;
    if (target.source === 'demo') {
      const overrides = read(storage.demoOverrides, {}); overrides[target.id] = nextCategory; write(storage.demoOverrides, overrides);
    } else {
      const user = getUserEntries(); const index = user.findIndex((entry) => entry.id === target.id); if (index >= 0) { user[index].category = nextCategory; setUserEntries(user); await cloudUpsert(user[index]); }
    }
    render();
  }));
  $$('[data-delete]').forEach((button) => button.addEventListener('click', async () => {
    const target = allEntries().find((entry) => entry.id === button.dataset.delete);
    if (!target) return;
    if (target.source === 'demo') {
      const deleted = read(storage.deletedDemo, {}); deleted[target.id] = true; write(storage.deletedDemo, deleted);
    } else {
      setUserEntries(getUserEntries().filter((entry) => entry.id !== target.id));
      await cloudDelete(target.id);
    }
    render(); showToast('Запис видалено');
  }));
}

function cloudEnabled() { return Boolean(supabaseClient && authUser); }
function expenseToRow(entry) { return { id: entry.id, user_id: authUser.id, name: entry.name, amount: entry.amount, expense_date: entry.date, category: entry.category }; }
function rowToExpense(row) { return { id: row.id, name: row.name, amount: Number(row.amount), date: row.expense_date, category: Number(row.category), source: 'user' }; }
async function cloudUpsert(entry) {
  if (!cloudEnabled()) return;
  const { error } = await supabaseClient.from('expenses').upsert(expenseToRow(entry), { onConflict: 'id' });
  if (error) showAuthMessage(`Не вдалося синхронізувати: ${error.message}`);
}
async function cloudDelete(id) {
  if (!cloudEnabled()) return;
  const { error } = await supabaseClient.from('expenses').delete().eq('id', id).eq('user_id', authUser.id);
  if (error) showAuthMessage(`Не вдалося видалити з хмари: ${error.message}`);
}
async function cloudSettingsUpsert(value) {
  if (!cloudEnabled()) return;
  const { error } = await supabaseClient.from('user_settings').upsert({ user_id: authUser.id, budgets: value }, { onConflict: 'user_id' });
  if (error) showAuthMessage(`Не вдалося синхронізувати бюджети: ${error.message}`);
}
function showAuthMessage(message) { const element = $('#authMessage'); if (element) element.textContent = message; }
function renderAuth() {
  const configured = Boolean(supabaseClient);
  $('#syncStatus').innerHTML = `<span></span> ${authUser ? 'синхронізовано' : 'локально'}`;
  $('#authToggle').textContent = authUser ? 'Мій акаунт' : 'Увійти';
  $('#authTitle').textContent = authUser ? (authUser.email || 'Мій акаунт') : (authMode === 'login' ? 'Увійти' : 'Реєстрація');
  $('#authHint').textContent = authUser ? 'Витрати синхронізуються з Supabase PostgreSQL.' : configured ? 'Увійди, щоб зберігати записи між пристроями.' : 'Додай Supabase URL та anon key у supabase-config.js.';
  $('#authForm').hidden = Boolean(authUser) || !configured;
  $('#authModeToggle').hidden = Boolean(authUser) || !configured;
  $('#authLogout').hidden = !authUser;
  $('#authSubmit').textContent = authMode === 'login' ? 'Увійти' : 'Зареєструватися';
}
async function syncFromCloud() {
  if (!cloudEnabled()) return;
  const local = getUserEntries();
  if (local.length) await supabaseClient.from('expenses').upsert(local.map(expenseToRow), { onConflict: 'id' });
  const { data, error } = await supabaseClient.from('expenses').select('id,name,amount,expense_date,category').order('expense_date', { ascending: false });
  if (error) { showAuthMessage(`Не вдалося завантажити записи: ${error.message}`); return; }
  setUserEntries((data || []).map(rowToExpense));
  const { data: settingsData, error: settingsError } = await supabaseClient.from('user_settings').select('budgets').eq('user_id', authUser.id).maybeSingle();
  if (settingsError) showAuthMessage(`Не вдалося завантажити бюджети: ${settingsError.message}`);
  else if (settingsData?.budgets) write(settingsStorageKey(), settingsData.budgets);
  else await cloudSettingsUpsert(budgets());
}
async function handleAuthState(user) {
  authUser = user;
  if (authUser) {
    const guestEntries = read(storage.user, []);
    const accountEntries = getUserEntries();
    if (guestEntries.length) {
      const merged = [...accountEntries, ...guestEntries.filter((guest) => !accountEntries.some((entry) => entry.id === guest.id))];
      setUserEntries(merged); write(storage.user, []);
    }
    const guestBudgets = read(storage.settings, null);
    if (guestBudgets && !read(settingsStorageKey(), null)) { write(settingsStorageKey(), guestBudgets); write(storage.settings, null); }
    await syncFromCloud();
  }
  renderAuth(); render();
}
async function initSupabase() {
  const config = window.OBLIK_SUPABASE || {};
  if (!config.url || !config.anonKey || !window.supabase?.createClient) { renderAuth(); return; }
  supabaseClient = window.supabase.createClient(config.url, config.anonKey);
  supabaseClient.auth.onAuthStateChange((_event, session) => { handleAuthState(session?.user || null); });
  const { data } = await supabaseClient.auth.getSession();
  await handleAuthState(data.session?.user || null);
}

function setup() {
  const savedTheme = localStorage.getItem(storage.theme); if (savedTheme === 'dark') document.body.classList.add('dark');
  $('#themeToggle').addEventListener('click', () => { document.body.classList.toggle('dark'); localStorage.setItem(storage.theme, document.body.classList.contains('dark') ? 'dark' : 'light'); });
  $('#authToggle').addEventListener('click', () => { $('#authPanel').hidden = !$('#authPanel').hidden; renderAuth(); });
  $('#authModeToggle').addEventListener('click', () => { authMode = authMode === 'login' ? 'register' : 'login'; renderAuth(); });
  $('#authLogout').addEventListener('click', async () => { if (supabaseClient) await supabaseClient.auth.signOut(); $('#authPanel').hidden = true; });
  $('#authForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!supabaseClient) { showAuthMessage('Спочатку заповни supabase-config.js.'); return; }
    const email = $('#authEmail').value.trim(); const password = $('#authPassword').value;
    $('#authSubmit').disabled = true; showAuthMessage('Зачекай…');
    const result = authMode === 'login' ? await supabaseClient.auth.signInWithPassword({ email, password }) : await supabaseClient.auth.signUp({ email, password });
    $('#authSubmit').disabled = false;
    if (result.error) showAuthMessage(result.error.message);
    else showAuthMessage(authMode === 'login' ? 'Вхід виконано.' : 'Реєстрацію виконано. Перевір email, якщо Supabase просить підтвердження.');
  });
  $('#removeDemoBtn').addEventListener('click', () => { write(storage.hidden, true); render(); showToast('Демо-приклади прибрано'); });
  $('#prevMonth').addEventListener('click', () => { selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth()-1, 1); render(); });
  $('#nextMonth').addEventListener('click', () => { selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth()+1, 1); render(); });
  $('#cumulativeToggle').addEventListener('click', () => { cumulative = !cumulative; $('#cumulativeToggle').classList.toggle('active', cumulative); renderDaily(entriesForMonth(), currentDayFor(selectedMonth)); });
  $$('.example-btn').forEach((button) => button.addEventListener('click', () => { $('#expenseInput').value = button.dataset.example; updateParsePreview(); $('#expenseInput').focus(); }));
  $('#expenseInput').addEventListener('input', updateParsePreview);
  $('#addExpenseBtn').addEventListener('click', async () => { const parsed = parseEntries($('#expenseInput').value); if (!parsed.length) { showToast('Не знайшов суму — спробуй «кава 85»'); return; } setUserEntries([...getUserEntries(), ...parsed]); for (const entry of parsed) await cloudUpsert(entry); $('#expenseInput').value = ''; updateParsePreview(); const latest = fromKey(parsed[0].date); selectedMonth = new Date(latest.getFullYear(), latest.getMonth(), 1); render(); showToast(`Додано: ${parsed.length} ${parsed.length === 1 ? 'запис' : 'записи'}`); });
  $('#searchInput').addEventListener('input', () => renderJournal(entriesForMonth())); $('#categoryFilter').addEventListener('change', () => renderJournal(entriesForMonth()));
  $('#categoryFilter').insertAdjacentHTML('beforeend', categories.map((category, i) => `<option value="${i}">${category.name}</option>`).join(''));
  render(); renderAuth(); initSupabase();
}

function updateParsePreview() { const preview = $('#parsePreview'); const parsed = parseEntries($('#expenseInput').value); preview.hidden = !parsed.length; preview.innerHTML = parsed.map((entry) => `<span class="parse-chip">${escapeHtml(entry.name)} · ${money(entry.amount)} ₴ · ${formatDate(entry.date)}</span>`).join(''); }
setup();
