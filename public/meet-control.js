import { escapeHtml as h } from './client.js';
import { button, options, pager } from './control-views.js';
import { AWARD_LIMIT, FESTIVAL_NAME, canScore, checkInTime, classStandings, compareSchedule, finalFor, onProgram, scheduleSession, schoolRecord, topRows } from './meet-program.js';
import { DIVISIONS, GRADES, activeEvent, clamp, eventTitle, formatMark, formatTime } from './sport.js';

export function raceActions(state, event) {
  if (!event?.schedule) return '';
  const record = schoolRecord(event);
  const target = finalFor(state.events, event);
  const hasRanks = (canScore(event) || target) && topRows(event).length > 0;
  const start = event.schedule.start;
  const timing = start ? `${start.slice(5, 10).replace('-', '/')} ${start.slice(11)} · 检录 ${checkInTime(start)}` : (event.schedule.session || '比赛时间待定');
  return `<span class="meet-details">${h(timing)}${record === null ? '' : ` · 校纪录 ${event.kind === 'field' ? formatMark(record) : formatTime(record)}`}</span>
    ${target ? button('晋级到决赛', { action: 'qualify', glyph: 'right', small: true, disabled: !hasRanks || !!target.competitors.length }) : ''}
    <!-- 班级计分先不用：${canScore(event) ? button(event.schedule.scored ? '撤回计分' : '确认计分', { action: 'points-confirm', glyph: 'check', small: true, variant: event.schedule.scored ? '' : 'capture', disabled: !hasRanks }) : ''} -->`;
}

export function createMeetDesk({ getState, updateRegion }) {
  const schedule = document.querySelector('#school-schedule');
  const points = document.querySelector('#school-points');
  const query = document.querySelector('#schedule-search');
  let session = '';
  let grade = '';
  let pointGrade;
  let schedulePage = 0;
  let pointsPage = 0;

  const pageLimit = () => innerHeight <= 620 ? 3 : (innerWidth <= 580 ? 5 : 8);

  function renderSchedule(state) {
    const ordered = state.events.filter((event) => event.schedule && onProgram(event)).sort(compareSchedule);
    const sessions = [...new Set(ordered.map((event) => scheduleSession(event.schedule)))];
    if (!sessions.includes(session)) session = '';
    updateRegion('#schedule-session', options({ '': '全部时段', ...Object.fromEntries(sessions.map((label) => [label, label])) }, session));
    const needles = query.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const listed = ordered.filter((event) => (!grade || event.schedule.grade === grade) &&
      (!session || scheduleSession(event.schedule) === session) && needles.every((needle) =>
        `${eventTitle(event)} ${GRADES[event.schedule.grade]}${DIVISIONS[event.division]}${event.name}${event.stage}`.replace(/[\s·]/g, '').toLocaleLowerCase().includes(needle)));
    const next = ordered[ordered.findIndex(({ id }) => id === state.activeEventId) + 1];
    updateRegion('#schedule-next', next ? button('下一场', { action: 'schedule-live', key: next.id, glyph: 'right', small: true, accessible: '下一场 · ' + eventTitle(next) }) : '');

    const limit = pageLimit();
    const pages = Math.max(1, Math.ceil(listed.length / limit));
    schedulePage = clamp(schedulePage, 0, pages - 1);
    updateRegion('#schedule-list', listed.length ? listed.slice(schedulePage * limit, (schedulePage + 1) * limit).map((event) => {
      const { start } = event.schedule;
      const title = eventTitle(event);
      const current = event.id === state.activeEventId;
      return `<div class="schedule-row${current ? ' current' : ''}">
        <span class="schedule-time"><b>${h(start ? start.slice(11) : '待定')}</b><small>${h(start ? `${start.slice(5, 10).replace('-', '/')} · 检 ${checkInTime(start)}` : scheduleSession(event.schedule))}</small></span>
        <span class="schedule-name" title="${h(title)}"><b>${h(title)}</b><small>${h(current ? '当前赛事' : event.schedule.scored ? '已计分' : event.competitors.length ? `${event.competitors.length} 条名单` : '')}</small></span>
        <span class="meet-row-actions">${button('名单', { action: 'schedule-prep', key: event.id, accessible: '准备名单 · ' + title, small: true })}
        ${button(current ? '当前' : '切换', { action: 'schedule-live', key: event.id, accessible: '切换赛事 · ' + title, small: true, variant: current ? '' : 'capture', disabled: current })}</span>
      </div>`;
    }).join('') : '<p class="empty-table">没有符合条件的赛事。</p>');
    schedule.querySelector('#schedule-summary').textContent = `${listed.length} / ${ordered.length} 场`;
    updateRegion('#schedule-pager', pages > 1 ? pager('schedule-page', schedulePage, pages, '赛程') : '');
  }

  function renderPoints(state) {
    const event = activeEvent(state);
    const eventGrade = event?.schedule?.grade;
    const current = pointGrade ?? (eventGrade === 'g2' ? 'g2' : 'g1');
    points.querySelector('#points-grade').value = current;
    const rows = classStandings(state.events)[current];
    const limit = pageLimit();
    const pages = Math.max(1, Math.ceil(rows.length / limit));
    pointsPage = clamp(pointsPage, 0, pages - 1);
    updateRegion('#points-list', rows.length ? rows.slice(pointsPage * limit, (pointsPage + 1) * limit).map(({ rank, team, total, records, tied }) =>
      `<div class="points-row"><b>${rank}</b><span>${h(team)}${tied ? ' <small>待抽签</small>' : ''}</span><b>${total}</b><span>${records}</span></div>`).join('') :
      '<p class="empty-table">决赛确认计分后，班级积分会显示在这里。</p>');
    const visible = state.modules.teams?.visible && current === eventGrade;
    updateRegion('#points-tools', button('导出积分', { action: 'points-export', key: current, glyph: 'download', small: true, disabled: !rows.length }) +
      button(visible ? '班级积分下屏' : '班级积分上屏', { action: 'module-toggle', key: 'teams', glyph: 'screen', small: true, variant: 'capture', disabled: !visible && (!rows.length || current !== eventGrade) }));
    const confirmed = state.events.filter((race) => race.schedule?.grade === current && race.schedule.scored).length;
    points.querySelector('#points-summary').textContent = `${GRADES[current]} · ${confirmed} 场已计分 · ${rows.length && current !== eventGrade ? '切到该年级赛事后可上屏' : `录取前 ${AWARD_LIMIT} 名`}`;
    updateRegion('#points-pager', pages > 1 ? pager('points-page', pointsPage, pages, '班级积分') : '');
  }

  function render() {
    const state = getState();
    if (!state) return;
    renderSchedule(state);
    renderPoints(state);
  }

  function setPage(view, page) {
    if (view === 'schedule') schedulePage = page;
    else pointsPage = page;
    render();
  }

  query.addEventListener('input', () => setPage('schedule', 0));
  schedule.addEventListener('change', ({ target }) => {
    if (target.id === 'schedule-session') session = target.value;
    if (target.id === 'schedule-grade') grade = target.value;
    setPage('schedule', 0);
  });
  points.querySelector('#points-grade').addEventListener('change', ({ target }) => {
    pointGrade = target.value;
    setPage('points', 0);
  });
  window.addEventListener('resize', render);
  schedule.querySelector('h2').textContent = FESTIVAL_NAME;

  return { render, setPage };
}
