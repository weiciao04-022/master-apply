import type {
  ApplicationRecord,
  AssetKind,
  AssetStatus,
  DateKind,
  InfoField,
  ProgramStatus,
  RecResponse,
  RecSubmission,
  Requirement,
  TaskCategory,
  TaskType,
} from './types';

export const PROGRAM_STATUS: Record<ProgramStatus, string> = {
  exploring: '探索中',
  considering: '考慮',
  applying: '確定申請',
  paused: '暫不申請',
};

export const DATE_KIND: Record<DateKind, string> = {
  official: '官方截止日',
  self: '自行設定期限',
  estimate: '暫估日期',
};

export const TASK_TYPE: Record<TaskType, string> = {
  mine: '我需要執行',
  waiting: '等待他人',
  verify: '待查證',
};

export const TASK_CATEGORY: Record<TaskCategory, string> = {
  english: '英文／TOEFL',
  research: '選校研究',
  portfolio: '作品',
  documents: '文件',
  submission: '送件',
  other: '其他',
};

export const PRIORITY: Record<1 | 2 | 3, string> = { 1: '高', 2: '中', 3: '低' };

export const ASSET_KIND: Record<AssetKind, string> = {
  cv: '履歷',
  sop: '讀書計畫',
  personal: '個人陳述',
  transcript: '成績單',
  language: '語言成績',
  newsWork: '新聞作品',
  techWork: '技術作品',
  writingSample: '寫作樣本',
  other: '其他',
};

export const REQ_KIND: Record<Requirement['kind'], string> = {
  ...ASSET_KIND,
  recommendation: '推薦信',
  fee: '申請費',
};

export const ASSET_STATUS: Record<AssetStatus, string> = {
  notStarted: '尚未整理',
  drafting: '撰寫中',
  revising: '修改中',
  ready: '可使用',
};

export const REC_RESPONSE: Record<RecResponse, string> = {
  notAsked: '尚未邀請',
  invited: '已邀請，待答覆',
  agreed: '已答應',
  declined: '婉拒',
};

export const REC_SUBMISSION: Record<RecSubmission, string> = {
  notRequested: '尚未寄出請求',
  requested: '已寄請求，待推薦人提交',
  submitted: '推薦人已提交',
};

export const SUBMISSION: Record<ApplicationRecord['submission'], string> = {
  notStarted: '尚未開始',
  inProgress: '準備中',
  submitted: '已送件',
};

export const FEE: Record<ApplicationRecord['fee'], string> = {
  unknown: '金額待查',
  unpaid: '未付款',
  paid: '已付款',
  waived: '已減免',
};

export const INTERVIEW: Record<ApplicationRecord['interview'], string> = {
  none: '無／未通知',
  invited: '收到邀請',
  scheduled: '已排定',
  done: '已完成',
};

export const RESULT: Record<ApplicationRecord['result'], string> = {
  pending: '等待結果',
  admitted: '錄取',
  waitlisted: '備取',
  rejected: '未錄取',
  withdrawn: '撤回',
};

export const INFO_FIELD_LABEL: Record<InfoField | 'officialUrl', string> = {
  degree: '學位',
  focus: '課程方向',
  duration: '修業時間',
  languageReq: '語言要求',
  materialsReq: '申請材料',
  portfolioReq: '作品要求',
  tuition: '學費',
  living: '生活費',
  scholarship: '獎學金',
  officialUrl: '官方連結',
};

export const WEEKDAYS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

/** 新增學程時可一鍵加入的常見材料（僅為範本，需依官方要求確認） */
export const REQUIREMENT_TEMPLATE: { name: string; kind: Requirement['kind'] }[] = [
  { name: '履歷', kind: 'cv' },
  { name: '讀書計畫／Statement of Purpose', kind: 'sop' },
  { name: '推薦信', kind: 'recommendation' },
  { name: '成績單', kind: 'transcript' },
  { name: '語言成績', kind: 'language' },
  { name: '作品集／寫作樣本', kind: 'newsWork' },
  { name: '申請費', kind: 'fee' },
];
