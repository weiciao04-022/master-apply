import type { AppData, Asset, Milestone, Phase, Program, Settings, Task } from './types';

export const SCHEMA_VERSION = 1;

const EMPTY_MONEY = { amount: null, currency: 'USD', period: '', note: '待查' };

function program(id: string, school: string, now: string): Program {
  return {
    id,
    school,
    programName: '學程待確認',
    country: '美國',
    field: '新聞',
    degree: '',
    focus: '',
    duration: '',
    languageReq: '',
    materialsReq: '',
    portfolioReq: '',
    tuition: { ...EMPTY_MONEY },
    living: { ...EMPTY_MONEY },
    scholarship: '',
    officialUrl: '',
    fitReasons: '',
    questions: '有哪些碩士學程？哪一個最接近資料新聞、國際報導與互動敘事？',
    status: 'considering',
    intakeLabel: '2028 Fall',
    createdAt: now,
    updatedAt: now,
  };
}

function task(partial: Partial<Task> & Pick<Task, 'id' | 'title'>, now: string): Task {
  return {
    doneCriteria: '',
    minutes: 20,
    category: 'other',
    type: 'mine',
    status: 'todo',
    priority: 2,
    phaseId: null,
    dueDate: null,
    scheduledDate: null,
    pinned: false,
    dependsOn: [],
    assetIds: [],
    programIds: [],
    parentId: null,
    completedAt: null,
    deferCount: 0,
    notes: '',
    createdAt: now,
    ...partial,
  };
}

function asset(id: string, kind: Asset['kind'], title: string, today: string, todo = ''): Asset {
  return { id, kind, title, status: 'notStarted', versions: [], todo, notes: '', updatedAt: today };
}

export function createSeed(today: string): AppData {
  const now = new Date().toISOString();

  const settings: Settings = {
    intakeYear: 2028,
    intakeTerm: 'Fall',
    restWeekdays: [4, 0],
    weeklyMinutes: 150,
    maxTasksPerDay: 3,
    busyPeriods: [
      {
        id: 'busy_focus',
        label: '課業、英文閱讀與寒假 TOEFL 規劃',
        start: today < '2026-12-24' ? today : '2026-11-18',
        end: '2026-12-24',
        allowCategories: ['english'],
      },
    ],
    homeCurrency: 'TWD',
    fxRates: [],
    profile: {
      name: '黃暐喬',
      background: '政治大學新聞系，雙主修數位內容。《大學報》生活版採訪主任；有採訪、寫稿、編輯、查核與電視新聞採訪及編輯部工讀經驗。',
      goals: '申請 2028 Fall 海外研究所。主要目標：Columbia Journalism School、Northwestern Medill；也比較新聞、資料新聞、國際關係、公共政策相關學程。希望發展國際報導、資料新聞與互動敘事。',
      notes: '正在準備 TOEFL。申請作品沿用現有新聞與技術作品。',
    },
    lastPlannedOn: null,
    lastReplanCount: 0,
  };

  const phases: Phase[] = [
    { id: 'ph_explore', name: '探索選校', order: 1, start: '2026-12-25', end: '2027-06-30' },
    { id: 'ph_skills', name: '能力與作品準備', order: 2, start: '2026-11-18', end: '2027-08-31' },
    { id: 'ph_docs', name: '文件製作', order: 3, start: '2027-07-01', end: '2027-11-30' },
    { id: 'ph_submit', name: '送件', order: 4, start: '2027-11-01', end: '2028-01-31' },
    { id: 'ph_interview', name: '面試', order: 5, start: '2028-01-01', end: '2028-03-31' },
    { id: 'ph_result', name: '結果與入學', order: 6, start: '2028-02-15', end: '2028-08-31' },
  ];

  const milestones: Milestone[] = [
    { id: 'ms_focus_end', title: '課業與英文專注期結束', date: '2026-12-24', kind: 'self', programId: null, sourceId: null, note: '這之前不排申請行政工作' },
    { id: 'ms_shortlist', title: '初步選校名單', date: '2027-06-30', kind: 'estimate', programId: null, sourceId: null, note: '暫估，可自行調整' },
    { id: 'ms_docs_start', title: '開始寫讀書計畫初稿', date: '2027-07-01', kind: 'estimate', programId: null, sourceId: null, note: '暫估' },
    { id: 'ms_submit_window', title: '送件期開始（暫估）', date: '2027-11-01', kind: 'estimate', programId: null, sourceId: null, note: '各校官方截止日尚未公布，公布後請新增為「官方截止日」' },
  ];

  const programs = [
    program('pg_columbia', 'Columbia Journalism School', now),
    program('pg_medill', 'Northwestern University Medill', now),
  ];

  const assets: Asset[] = [
    asset('as_cv', 'cv', '英文履歷', today, '整理成申請用英文版'),
    asset('as_sop', 'sop', '讀書計畫／Statement of Purpose', today),
    asset('as_transcript', 'transcript', '政大成績單（中英文）', today),
    asset('as_toefl', 'language', 'TOEFL 成績', today, '尚未應考'),
    asset('as_dementia', 'newsWork', '年輕型失智症融媒體專題與互動網站', today, '補上作品連結，選出最能代表的段落'),
    asset('as_hunting', 'newsWork', '原住民自製獵槍管理新制專題', today, '專題進行中'),
  ];

  const T = (p: Partial<Task> & Pick<Task, 'id' | 'title'>) => task(p, now);
  const tasks: Task[] = [
    T({ id: 'tk_toefl_weeks', title: '列出寒假可讀 TOEFL 的週次', category: 'english', minutes: 20, phaseId: 'ph_skills', dueDate: '2026-12-24', priority: 1,
      doneCriteria: '在備註寫下寒假哪幾週可以讀、每週大約幾小時' }),
    T({ id: 'tk_toefl_dates', title: '查 TOEFL 寒假後的考試日期與考場', category: 'english', minutes: 30, phaseId: 'ph_skills', dueDate: '2026-12-24', priority: 2,
      doneCriteria: '記下 2–3 個可行日期與報名截止日，附 ETS 官方連結與查詢日期', dependsOn: ['tk_toefl_weeks'] }),
    T({ id: 'tk_reading_slot', title: '決定每週英文閱讀的固定時段', category: 'english', minutes: 15, phaseId: 'ph_skills', dueDate: '2026-12-24', priority: 3,
      doneCriteria: '選定每週 1–2 個時段，寫在備註' }),
    T({ id: 'tk_columbia_list', title: '到 Columbia J-School 官網列出碩士學程', category: 'research', minutes: 30, phaseId: 'ph_explore', dueDate: '2027-01-31', programIds: ['pg_columbia'],
      doneCriteria: '每個候選學程在「選校」新增一筆，附官方連結與查核日期；未公布的 2028 Fall 規定標示尚未公布' }),
    T({ id: 'tk_medill_list', title: '到 Medill 官網列出碩士學程', category: 'research', minutes: 30, phaseId: 'ph_explore', dueDate: '2027-01-31', programIds: ['pg_medill'],
      doneCriteria: '每個候選學程在「選校」新增一筆，附官方連結與查核日期' }),
    T({ id: 'tk_compare', title: '比較兩校候選學程的課程方向', category: 'research', minutes: 30, phaseId: 'ph_explore', dueDate: '2027-02-28', priority: 2,
      dependsOn: ['tk_columbia_list', 'tk_medill_list'], doneCriteria: '每個學程寫下 1–2 句「適合原因」與待問的疑問' }),
    T({ id: 'tk_pick_news', title: '從現有新聞作品挑 3 篇候選代表作', category: 'portfolio', minutes: 30, phaseId: 'ph_skills', dueDate: '2027-03-31',
      assetIds: ['as_dementia', 'as_hunting'], doneCriteria: '在文件中心新增或更新 3 筆作品，附連結' }),
    T({ id: 'tk_pick_tech', title: '挑一件技術作品並寫一句說明', category: 'portfolio', minutes: 20, phaseId: 'ph_skills', dueDate: '2027-03-31',
      doneCriteria: '文件中心有一筆技術作品，附連結與一句話說明它解決什麼問題' }),
    T({ id: 'tk_cv_link', title: '把現有履歷連結存進文件中心', category: 'documents', minutes: 15, phaseId: 'ph_docs', dueDate: '2027-04-30', assetIds: ['as_cv'], priority: 3,
      doneCriteria: '「英文履歷」至少有一個版本與外部連結' }),
    T({ id: 'tk_wait_columbia', title: 'Columbia 公布 2028 Fall 申請規定', type: 'verify', category: 'research', minutes: 15, phaseId: 'ph_explore', programIds: ['pg_columbia'],
      doneCriteria: '公布後新增官方來源，更新截止日與材料' }),
    T({ id: 'tk_wait_medill', title: 'Medill 公布 2028 Fall 申請規定', type: 'verify', category: 'research', minutes: 15, phaseId: 'ph_explore', programIds: ['pg_medill'],
      doneCriteria: '公布後新增官方來源，更新截止日與材料' }),
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    settings,
    programs,
    sources: [],
    revisions: [],
    milestones,
    phases,
    tasks,
    assets,
    requirements: [],
    recommenders: [],
    applications: programs.map((p) => ({
      id: 'app_' + p.id,
      programId: p.id,
      submission: 'notStarted',
      submittedAt: null,
      fee: 'unknown',
      interview: 'none',
      interviewDate: null,
      result: 'pending',
      notes: '',
    })),
    reviews: [],
  };
}
