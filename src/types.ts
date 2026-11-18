/** YYYY-MM-DD，一律以使用者當地日期計算 */
export type ISODate = string;

// ───────── 學程 ─────────
export type ProgramStatus = 'exploring' | 'considering' | 'applying' | 'paused';

/** 金額：amount 為 null 代表「未知」，不可當成 0 */
export interface Money {
  amount: number | null;
  currency: string; // 原幣別，例如 USD
  period: string; // 例如「整個學程」「每學年」
  note: string;
}

/** 可對應官方來源的欄位 */
export const INFO_FIELDS = [
  'degree',
  'focus',
  'duration',
  'languageReq',
  'materialsReq',
  'portfolioReq',
  'tuition',
  'living',
  'scholarship',
] as const;
export type InfoField = (typeof INFO_FIELDS)[number];

export interface Program {
  id: string;
  school: string;
  programName: string;
  country: string;
  field: string;
  degree: string;
  focus: string;
  duration: string;
  languageReq: string;
  materialsReq: string;
  portfolioReq: string;
  tuition: Money;
  living: Money;
  scholarship: string;
  officialUrl: string;
  fitReasons: string;
  questions: string;
  status: ProgramStatus;
  /** 這筆學程資料針對哪個入學梯次，例如 2028 Fall */
  intakeLabel: string;
  createdAt: string;
  updatedAt: string;
}

/** 招生資訊來源：每筆附適用入學年度與查核日期 */
export interface Source {
  id: string;
  programId: string;
  title: string;
  url: string;
  isOfficial: boolean;
  /** 這份資料適用的入學梯次，例如 2027 Fall（往年）或 2028 Fall */
  intakeLabel: string;
  checkedAt: ISODate;
  fields: InfoField[];
  note: string;
}

/** 官方資訊更新：保留舊值，等使用者決定是否套用 */
export interface Revision {
  id: string;
  programId: string;
  field: InfoField | 'officialUrl';
  oldValue: string;
  newValue: string;
  sourceId: string | null;
  createdAt: string;
  status: 'pending' | 'applied' | 'dismissed';
  decidedAt?: string;
}

// ───────── 時程 ─────────
export type DateKind = 'official' | 'self' | 'estimate';

export interface Milestone {
  id: string;
  title: string;
  date: ISODate;
  kind: DateKind;
  programId: string | null;
  sourceId: string | null;
  note: string;
}

export interface Phase {
  id: string;
  name: string;
  order: number;
  start: ISODate;
  end: ISODate;
}

// ───────── 任務 ─────────
/** mine：我需要執行；waiting：等待他人；verify：待查證（例如等官方公布） */
export type TaskType = 'mine' | 'waiting' | 'verify';
/** 任務的回答方式：決定任務卡上出現什麼輸入框 */
export type AnswerType = 'check' | 'text' | 'list' | 'link' | 'date';

export type TaskCategory = 'english' | 'research' | 'portfolio' | 'documents' | 'submission' | 'other';

export interface Task {
  id: string;
  title: string;
  doneCriteria: string;
  minutes: number;
  category: TaskCategory;
  type: TaskType;
  status: 'todo' | 'done';
  /** 1 高、2 中、3 低 */
  priority: 1 | 2 | 3;
  phaseId: string | null;
  dueDate: ISODate | null;
  scheduledDate: ISODate | null;
  /** 使用者手動指定日期時為 true，排程器不會主動挪動未來的固定日期 */
  pinned: boolean;
  dependsOn: string[];
  assetIds: string[];
  programIds: string[];
  parentId: string | null;
  completedAt: string | null;
  deferCount: number;
  /** 回答內容：文字、清單（一行一項）、網址或日期 */
  notes: string;
  answerType: AnswerType;
  answeredAt: string | null;
  createdAt: string;
}

// ───────── 文件與作品 ─────────
export type AssetKind =
  | 'cv'
  | 'sop'
  | 'personal'
  | 'transcript'
  | 'language'
  | 'newsWork'
  | 'techWork'
  | 'writingSample'
  | 'other';
export type AssetStatus = 'notStarted' | 'drafting' | 'revising' | 'ready';

export interface AssetVersion {
  version: string;
  date: ISODate;
  link: string;
  note: string;
}

export interface Asset {
  id: string;
  kind: AssetKind;
  title: string;
  status: AssetStatus;
  versions: AssetVersion[];
  todo: string;
  notes: string;
  updatedAt: ISODate;
}

/** 某學程需要的一項材料，對應到共用素材庫 */
export interface Requirement {
  id: string;
  programId: string;
  name: string;
  kind: AssetKind | 'recommendation' | 'fee' | 'other';
  required: boolean;
  assetId: string | null;
  uploaded: boolean;
  submitted: boolean;
  note: string;
}

export type RecResponse = 'notAsked' | 'invited' | 'agreed' | 'declined';
export type RecSubmission = 'notRequested' | 'requested' | 'submitted';

export interface Recommender {
  id: string;
  name: string;
  relation: string;
  contact: string;
  response: RecResponse;
  invitedAt: ISODate | null;
  repliedAt: ISODate | null;
  /** programId → 送出狀態（由推薦人自行提交，網站只記錄） */
  submissions: Record<string, RecSubmission>;
  notes: string;
}

export interface ApplicationRecord {
  id: string;
  programId: string;
  submission: 'notStarted' | 'inProgress' | 'submitted';
  submittedAt: ISODate | null;
  fee: 'unknown' | 'unpaid' | 'paid' | 'waived';
  interview: 'none' | 'invited' | 'scheduled' | 'done';
  interviewDate: ISODate | null;
  result: 'pending' | 'admitted' | 'waitlisted' | 'rejected' | 'withdrawn';
  notes: string;
}

export interface WeeklyReview {
  id: string; // = weekStart
  weekStart: ISODate;
  focusTaskIds: string[];
  note: string;
}

// ───────── 設定 ─────────
export interface BusyPeriod {
  id: string;
  label: string;
  start: ISODate;
  end: ISODate;
  /** 這段期間仍可排入的任務類別；空陣列＝完全不排 */
  allowCategories: TaskCategory[];
}

export interface FxRate {
  id: string;
  currency: string;
  /** 1 單位外幣 = rateToHome 單位本國貨幣 */
  rateToHome: number;
  date: ISODate;
  source: string;
}

export interface Profile {
  name: string;
  background: string;
  goals: string;
  notes: string;
}

export interface Settings {
  intakeYear: number;
  intakeTerm: string;
  restWeekdays: number[]; // 0=週日 … 6=週六
  weeklyMinutes: number;
  maxTasksPerDay: number;
  busyPeriods: BusyPeriod[];
  homeCurrency: string;
  fxRates: FxRate[];
  profile: Profile;
  lastPlannedOn: ISODate | null;
  lastReplanCount: number;
}

export interface AppData {
  schemaVersion: number;
  settings: Settings;
  programs: Program[];
  sources: Source[];
  revisions: Revision[];
  milestones: Milestone[];
  phases: Phase[];
  tasks: Task[];
  assets: Asset[];
  requirements: Requirement[];
  recommenders: Recommender[];
  applications: ApplicationRecord[];
  reviews: WeeklyReview[];
}

export type CollectionKey = Exclude<keyof AppData, 'schemaVersion' | 'settings'>;
export const COLLECTIONS: CollectionKey[] = [
  'programs',
  'sources',
  'revisions',
  'milestones',
  'phases',
  'tasks',
  'assets',
  'requirements',
  'recommenders',
  'applications',
  'reviews',
];
