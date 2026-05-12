import {
  AlertCircle,
  BarChart3,
  Building2,
  CalendarDays,
  CheckSquare,
  CircleCheck,
  ClipboardList,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  FolderOpen,
  Handshake,
  Inbox,
  JapaneseYen,
  LogIn,
  LogOut,
  Megaphone,
  MessageSquare,
  Plus,
  Receipt,
  Save,
  Search,
  Settings,
  Shield,
  Trash2,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, firebaseConfig } from "./firebase";

type ModuleId =
  | "dashboard"
  | "employees"
  | "attendance"
  | "leave"
  | "shifts"
  | "announcements"
  | "documents"
  | "tasks"
  | "expenses"
  | "customers"
  | "finance"
  | "reports"
  | "chat"
  | "admin";

type Employee = {
  id: string;
  name: string;
  department: string;
  role: string;
  email: string;
  phone: string;
  status: "在籍" | "休職" | "退職";
};

type Attendance = {
  id: string;
  employee: string;
  date: string;
  start: string;
  end: string;
  note: string;
};

type RequestItem = {
  id: string;
  type: string;
  title: string;
  requester: string;
  amount?: number;
  date: string;
  status: "申請中" | "承認" | "差戻し";
};

type Shift = {
  id: string;
  employee: string;
  date: string;
  time: string;
  location: string;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  department: string;
  pinned: boolean;
};

type DocumentItem = {
  id: string;
  title: string;
  category: string;
  owner: string;
  visibility: string;
  driveUrl: string;
};

type Task = {
  id: string;
  title: string;
  assignee: string;
  due: string;
  status: "未着手" | "進行中" | "完了";
  priority: "高" | "中" | "低";
};

type Customer = {
  id: string;
  name: string;
  contact: string;
  email: string;
  status: string;
  lastContact: string;
};

type Project = {
  id: string;
  customer: string;
  name: string;
  owner: string;
  value: number;
  status: "提案" | "進行中" | "納品済" | "保留";
};

type Invoice = {
  id: string;
  customer: string;
  project: string;
  amount: number;
  due: string;
  paid: boolean;
};

type Report = {
  id: string;
  employee: string;
  type: "日報" | "週報";
  date: string;
  summary: string;
};

type Chat = {
  id: string;
  author: string;
  channel: string;
  message: string;
  time: string;
};

type Role = {
  id: string;
  name: string;
  permissions: string;
  members: number;
};

type DataStore = {
  employees: Employee[];
  attendance: Attendance[];
  leaveRequests: RequestItem[];
  shifts: Shift[];
  announcements: Announcement[];
  documents: DocumentItem[];
  tasks: Task[];
  expenses: RequestItem[];
  customers: Customer[];
  projects: Project[];
  invoices: Invoice[];
  reports: Report[];
  chats: Chat[];
  roles: Role[];
};

const today = "2026-05-13";

const seedData: DataStore = {
  employees: [
    { id: "emp-1", name: "佐藤 美咲", department: "営業", role: "営業マネージャー", email: "misaki@example.com", phone: "090-1000-0001", status: "在籍" },
    { id: "emp-2", name: "田中 健", department: "開発", role: "エンジニア", email: "ken@example.com", phone: "090-1000-0002", status: "在籍" },
    { id: "emp-3", name: "鈴木 葵", department: "管理", role: "経理", email: "aoi@example.com", phone: "090-1000-0003", status: "在籍" },
  ],
  attendance: [
    { id: "att-1", employee: "佐藤 美咲", date: today, start: "09:00", end: "18:00", note: "通常勤務" },
    { id: "att-2", employee: "田中 健", date: today, start: "10:00", end: "19:00", note: "リモート" },
  ],
  leaveRequests: [
    { id: "leave-1", type: "有給", title: "通院のため午後休", requester: "田中 健", date: "2026-05-17", status: "申請中" },
  ],
  shifts: [
    { id: "shift-1", employee: "佐藤 美咲", date: "2026-05-14", time: "09:00-18:00", location: "本社" },
    { id: "shift-2", employee: "田中 健", date: "2026-05-14", time: "10:00-19:00", location: "リモート" },
  ],
  announcements: [
    { id: "ann-1", title: "5月全社会議", body: "金曜16時からオンラインで実施します。", department: "全社", pinned: true },
    { id: "ann-2", title: "経費締め日", body: "今月の経費申請は25日までに提出してください。", department: "管理", pinned: false },
  ],
  documents: [
    { id: "doc-1", title: "就業規則", category: "規程", owner: "管理", visibility: "全社", driveUrl: "G:\\マイドライブ\\Company App Files\\Manuals" },
  ],
  tasks: [
    { id: "task-1", title: "見積テンプレート更新", assignee: "鈴木 葵", due: "2026-05-16", status: "進行中", priority: "高" },
    { id: "task-2", title: "新入社員アカウント作成", assignee: "田中 健", due: "2026-05-15", status: "未着手", priority: "中" },
  ],
  expenses: [
    { id: "exp-1", type: "交通費", title: "顧客訪問交通費", requester: "佐藤 美咲", amount: 2480, date: "2026-05-12", status: "申請中" },
  ],
  customers: [
    { id: "cus-1", name: "青葉商事", contact: "高橋様", email: "aoba@example.com", status: "商談中", lastContact: "2026-05-11" },
    { id: "cus-2", name: "北斗物流", contact: "山本様", email: "hokuto@example.com", status: "契約中", lastContact: "2026-05-10" },
  ],
  projects: [
    { id: "prj-1", customer: "青葉商事", name: "受発注システム", owner: "佐藤 美咲", value: 1200000, status: "提案" },
    { id: "prj-2", customer: "北斗物流", name: "社内ポータル", owner: "田中 健", value: 850000, status: "進行中" },
  ],
  invoices: [
    { id: "inv-1", customer: "北斗物流", project: "社内ポータル", amount: 425000, due: "2026-05-31", paid: false },
    { id: "inv-2", customer: "青葉商事", project: "受発注システム", amount: 220000, due: "2026-05-20", paid: true },
  ],
  reports: [
    { id: "rep-1", employee: "佐藤 美咲", type: "日報", date: today, summary: "青葉商事へ提案資料を送付。次回打ち合わせ日程を調整中。" },
  ],
  chats: [
    { id: "chat-1", author: "鈴木 葵", channel: "経費", message: "交通費の領収書リンクも書類管理へ登録してください。", time: "09:30" },
  ],
  roles: [
    { id: "role-1", name: "管理者", permissions: "全機能、権限管理、データ出力", members: 1 },
    { id: "role-2", name: "一般社員", permissions: "申請、日報、タスク、掲示板閲覧", members: 12 },
    { id: "role-3", name: "経理", permissions: "経費、請求、入金、売上管理", members: 2 },
  ],
};

const modules: Array<{ id: ModuleId; label: string; icon: ReactNode }> = [
  { id: "dashboard", label: "ダッシュボード", icon: <BarChart3 size={18} /> },
  { id: "employees", label: "社員管理", icon: <Users size={18} /> },
  { id: "attendance", label: "勤怠", icon: <Clock size={18} /> },
  { id: "leave", label: "休暇申請", icon: <CalendarDays size={18} /> },
  { id: "shifts", label: "シフト", icon: <ClipboardList size={18} /> },
  { id: "announcements", label: "お知らせ", icon: <Megaphone size={18} /> },
  { id: "documents", label: "書類管理", icon: <FolderOpen size={18} /> },
  { id: "tasks", label: "タスク", icon: <CheckSquare size={18} /> },
  { id: "expenses", label: "経費・承認", icon: <Receipt size={18} /> },
  { id: "customers", label: "顧客・案件", icon: <Handshake size={18} /> },
  { id: "finance", label: "売上・請求", icon: <WalletCards size={18} /> },
  { id: "reports", label: "日報・週報", icon: <FileText size={18} /> },
  { id: "chat", label: "コメント", icon: <MessageSquare size={18} /> },
  { id: "admin", label: "管理者", icon: <Shield size={18} /> },
];

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function yen(value: number) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(value);
}

function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return undefined;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
  }, []);

  return { user, authReady };
}

function useCompanyData(user: User | null) {
  const [data, setData] = useState<DataStore>(() => {
    const saved = localStorage.getItem("company-hub-data");
    return saved ? JSON.parse(saved) : seedData;
  });
  const [syncState, setSyncState] = useState("ログイン待ち");
  const [isCloudReady, setIsCloudReady] = useState(false);

  useEffect(() => {
    if (!db || !user) {
      setSyncState(user ? "Firestore未設定" : "ログイン待ち");
      setIsCloudReady(false);
      return undefined;
    }

    const ref = doc(db, "companyData", "main");
    setSyncState("クラウド接続中");

    return onSnapshot(
      ref,
      async (snapshot) => {
        if (snapshot.exists()) {
          const cloudData = snapshot.data().data as DataStore;
          setData(cloudData);
          localStorage.setItem("company-hub-data", JSON.stringify(cloudData));
          setIsCloudReady(true);
          setSyncState("Firestore同期中");
          return;
        }

        await setDoc(ref, {
          data: seedData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          updatedBy: user.email,
        });
      },
      (error) => {
        setIsCloudReady(false);
        setSyncState(error.message.includes("permission") ? "Firestore権限エラー" : "Firestore接続エラー");
      },
    );
  }, [user]);

  const save = async (next: DataStore) => {
    setData(next);
    localStorage.setItem("company-hub-data", JSON.stringify(next));

    if (!db || !user) {
      setSyncState("ローカル保存");
      return;
    }

    try {
      await setDoc(
        doc(db, "companyData", "main"),
        {
          data: next,
          updatedAt: serverTimestamp(),
          updatedBy: user.email,
        },
        { merge: true },
      );
      setIsCloudReady(true);
      setSyncState("Firestore同期中");
    } catch (error) {
      setIsCloudReady(false);
      setSyncState(error instanceof Error ? error.message : "Firestore保存エラー");
    }
  };

  return [data, save, syncState, isCloudReady] as const;
}

export function App() {
  const [active, setActive] = useState<ModuleId>("dashboard");
  const [query, setQuery] = useState("");
  const { user, authReady } = useAuthUser();
  const [data, saveData, syncState, isCloudReady] = useCompanyData(user);

  const stats = useMemo(() => {
    const openApprovals = [...data.leaveRequests, ...data.expenses].filter((item) => item.status === "申請中").length;
    const unpaid = data.invoices.filter((invoice) => !invoice.paid).reduce((sum, invoice) => sum + invoice.amount, 0);
    const pipeline = data.projects.reduce((sum, project) => sum + project.value, 0);
    const openTasks = data.tasks.filter((task) => task.status !== "完了").length;
    return { openApprovals, unpaid, pipeline, openTasks };
  }, [data]);

  const update = <K extends keyof DataStore>(key: K, rows: DataStore[K]) => void saveData({ ...data, [key]: rows });

  const approve = (key: "leaveRequests" | "expenses", id: string, status: RequestItem["status"]) => {
    update(
      key,
      data[key].map((item) => (item.id === id ? { ...item, status } : item)) as DataStore[typeof key],
    );
  };

  if (!authReady) {
    return <div className="centerScreen">読み込み中...</div>;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">C</div>
          <div>
            <strong>Company Hub</strong>
            <span>company-b9fe9</span>
          </div>
        </div>
        <nav>
          {modules.map((module) => (
            <button key={module.id} className={active === module.id ? "navItem active" : "navItem"} onClick={() => setActive(module.id)}>
              {module.icon}
              <span>{module.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{modules.find((module) => module.id === active)?.label}</h1>
            <p>社員、申請、顧客、売上、書類をひとつの業務画面で管理します。</p>
          </div>
          <div className="topbarActions">
            <div className={isCloudReady ? "syncPill online" : "syncPill"}>
              <CircleCheck size={16} />
              <span>{syncState}</span>
            </div>
            <div className="searchBox">
              <Search size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="全体検索" />
            </div>
            <button className="userButton" onClick={() => auth && signOut(auth)}>
              <LogOut size={17} />
              {user.email}
            </button>
          </div>
        </header>

        {active === "dashboard" && <Dashboard data={data} stats={stats} />}
        {active === "employees" && <Employees data={data} update={update} query={query} />}
        {active === "attendance" && <AttendanceView data={data} update={update} />}
        {active === "leave" && <RequestsView title="休暇申請" rows={data.leaveRequests} onApprove={(id, status) => approve("leaveRequests", id, status)} onAdd={(item) => update("leaveRequests", [item, ...data.leaveRequests])} />}
        {active === "shifts" && <Shifts data={data} update={update} />}
        {active === "announcements" && <Announcements data={data} update={update} />}
        {active === "documents" && <Documents data={data} update={update} />}
        {active === "tasks" && <Tasks data={data} update={update} />}
        {active === "expenses" && <RequestsView title="経費申請・承認" rows={data.expenses} onApprove={(id, status) => approve("expenses", id, status)} onAdd={(item) => update("expenses", [item, ...data.expenses])} expense />}
        {active === "customers" && <Customers data={data} update={update} />}
        {active === "finance" && <Finance data={data} update={update} />}
        {active === "reports" && <Reports data={data} update={update} />}
        {active === "chat" && <ChatView data={data} update={update} />}
        {active === "admin" && <Admin data={data} update={update} />}
      </main>
    </div>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

function SectionTitle({ icon, title, action }: { icon: ReactNode; title: string; action?: ReactNode }) {
  return (
    <div className="sectionTitle">
      <div>
        {icon}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Status({ value }: { value: string }) {
  return <span className={`status status-${value}`}>{value}</span>;
}

function Dashboard({ data, stats }: { data: DataStore; stats: { openApprovals: number; unpaid: number; pipeline: number; openTasks: number } }) {
  return (
    <div className="pageStack">
      <div className="statGrid">
        <Card><Metric icon={<Users />} label="社員" value={`${data.employees.length}名`} /></Card>
        <Card><Metric icon={<Inbox />} label="承認待ち" value={`${stats.openApprovals}件`} /></Card>
        <Card><Metric icon={<JapaneseYen />} label="未入金" value={yen(stats.unpaid)} /></Card>
        <Card><Metric icon={<BarChart3 />} label="案件総額" value={yen(stats.pipeline)} /></Card>
      </div>
      <div className="twoColumn">
        <Card>
          <SectionTitle icon={<CheckSquare size={19} />} title="今日見るべきタスク" />
          <div className="list">
            {data.tasks.filter((task) => task.status !== "完了").map((task) => (
              <div className="listRow" key={task.id}>
                <div><strong>{task.title}</strong><span>{task.assignee} / 期限 {task.due}</span></div>
                <Status value={task.priority} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle icon={<Megaphone size={19} />} title="固定お知らせ" />
          <div className="list">
            {data.announcements.filter((item) => item.pinned).map((item) => (
              <div className="listRow" key={item.id}>
                <div><strong>{item.title}</strong><span>{item.body}</span></div>
                <Status value={item.department} />
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <SectionTitle icon={<Settings size={19} />} title="連携状態" />
        <div className="integrationGrid">
          <div><CircleCheck size={20} /><strong>Firebase</strong><span>{firebaseConfig.projectId || "未設定"}</span></div>
          <div><CircleCheck size={20} /><strong>GitHub Pages</strong><span>/company/ 配信用に設定済み</span></div>
          <div><CircleCheck size={20} /><strong>Google Drive</strong><span>G:\マイドライブ\Company App Files</span></div>
          <div><AlertCircle size={20} /><strong>保存方式</strong><span>現在は無料優先のローカル保存</span></div>
        </div>
      </Card>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="metric"><span>{icon}</span><small>{label}</small><strong>{value}</strong></div>;
}

function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!auth) {
      setError("Firebase Authが初期化されていません。");
      return;
    }

    try {
      setBusy(true);
      setError("");
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "ログインに失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="authShell">
      <section className="authPanel">
        <div className="brand authBrand">
          <div className="brandMark">C</div>
          <div>
            <strong>Company Hub</strong>
            <span>company-b9fe9</span>
          </div>
        </div>
        <h1>{mode === "login" ? "ログイン" : "アカウント作成"}</h1>
        <p>社内データをFirebase AuthとFirestoreで共有します。</p>

        <form className="formStack" onSubmit={submit}>
          <Field label="メールアドレス">
            <input type="text" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </Field>
          <Field label="パスワード">
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
          </Field>
          {error && <div className="errorBox">{error}</div>}
          <button className="primary" disabled={busy}>
            <LogIn size={17} />
            {busy ? "処理中" : mode === "login" ? "ログイン" : "作成してログイン"}
          </button>
        </form>

        <button className="textButton" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "新しくアカウントを作成" : "既存アカウントでログイン"}
        </button>
      </section>
    </div>
  );
}

function Employees({ data, update, query }: { data: DataStore; update: <K extends keyof DataStore>(key: K, rows: DataStore[K]) => void; query: string }) {
  const [draft, setDraft] = useState({ name: "", department: "営業", role: "", email: "", phone: "", status: "在籍" as Employee["status"] });
  const rows = data.employees.filter((employee) => JSON.stringify(employee).toLowerCase().includes(query.toLowerCase()));
  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name) return;
    update("employees", [{ id: uid("emp"), ...draft }, ...data.employees]);
    setDraft({ name: "", department: "営業", role: "", email: "", phone: "", status: "在籍" });
  };
  return (
    <div className="pageStack">
      <Card>
        <SectionTitle icon={<UserPlus size={19} />} title="社員を追加" />
        <form className="formGrid" onSubmit={add}>
          <Field label="名前"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
          <Field label="部署"><input value={draft.department} onChange={(e) => setDraft({ ...draft, department: e.target.value })} /></Field>
          <Field label="役職"><input value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} /></Field>
          <Field label="メール"><input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
          <Field label="電話"><input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
          <button className="primary"><Plus size={17} />追加</button>
        </form>
      </Card>
      <DataTable
        headers={["名前", "部署", "役職", "メール", "電話", "状態", ""]}
        rows={rows.map((employee) => [
          employee.name,
          employee.department,
          employee.role,
          employee.email,
          employee.phone,
          <Status value={employee.status} />,
          <button className="iconBtn" onClick={() => update("employees", data.employees.filter((row) => row.id !== employee.id))}><Trash2 size={16} /></button>,
        ])}
      />
    </div>
  );
}

function AttendanceView({ data, update }: { data: DataStore; update: <K extends keyof DataStore>(key: K, rows: DataStore[K]) => void }) {
  const [draft, setDraft] = useState({ employee: data.employees[0]?.name || "", date: today, start: "09:00", end: "18:00", note: "" });
  return (
    <SimpleModule
      title="勤怠記録"
      icon={<Clock size={19} />}
      onSubmit={() => {
        update("attendance", [{ id: uid("att"), ...draft }, ...data.attendance]);
        setDraft({ ...draft, note: "" });
      }}
      form={<>
        <Field label="社員"><select value={draft.employee} onChange={(e) => setDraft({ ...draft, employee: e.target.value })}>{data.employees.map((e) => <option key={e.id}>{e.name}</option>)}</select></Field>
        <Field label="日付"><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field>
        <Field label="開始"><input type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} /></Field>
        <Field label="終了"><input type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} /></Field>
        <Field label="メモ"><input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></Field>
      </>}
      table={<DataTable headers={["社員", "日付", "開始", "終了", "メモ"]} rows={data.attendance.map((r) => [r.employee, r.date, r.start, r.end, r.note])} />}
    />
  );
}

function RequestsView({ title, rows, onApprove, onAdd, expense = false }: { title: string; rows: RequestItem[]; onApprove: (id: string, status: RequestItem["status"]) => void; onAdd: (item: RequestItem) => void; expense?: boolean }) {
  const [draft, setDraft] = useState({ type: expense ? "交通費" : "有給", title: "", requester: "", amount: 0, date: today });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.title || !draft.requester) return;
    onAdd({ id: uid(expense ? "exp" : "leave"), ...draft, status: "申請中" });
    setDraft({ ...draft, title: "", requester: "", amount: 0 });
  };
  return (
    <div className="pageStack">
      <Card>
        <SectionTitle icon={<Inbox size={19} />} title={`${title}を追加`} />
        <form className="formGrid" onSubmit={submit}>
          <Field label="種別"><input value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} /></Field>
          <Field label="内容"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
          <Field label="申請者"><input value={draft.requester} onChange={(e) => setDraft({ ...draft, requester: e.target.value })} /></Field>
          {expense && <Field label="金額"><input type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} /></Field>}
          <Field label="日付"><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field>
          <button className="primary"><Plus size={17} />申請</button>
        </form>
      </Card>
      <DataTable headers={["種別", "内容", "申請者", expense ? "金額" : "日付", "状態", "承認"]} rows={rows.map((row) => [
        row.type,
        row.title,
        row.requester,
        expense ? yen(row.amount || 0) : row.date,
        <Status value={row.status} />,
        <div className="actions"><button onClick={() => onApprove(row.id, "承認")}>承認</button><button onClick={() => onApprove(row.id, "差戻し")}>差戻し</button></div>,
      ])} />
    </div>
  );
}

function Shifts({ data, update }: { data: DataStore; update: <K extends keyof DataStore>(key: K, rows: DataStore[K]) => void }) {
  const [draft, setDraft] = useState({ employee: "", date: today, time: "09:00-18:00", location: "本社" });
  return <SimpleModule title="シフト登録" icon={<CalendarDays size={19} />} onSubmit={() => update("shifts", [{ id: uid("shift"), ...draft }, ...data.shifts])} form={<><Field label="社員"><input value={draft.employee} onChange={(e) => setDraft({ ...draft, employee: e.target.value })} /></Field><Field label="日付"><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field><Field label="時間"><input value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} /></Field><Field label="場所"><input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} /></Field></>} table={<DataTable headers={["社員", "日付", "時間", "場所"]} rows={data.shifts.map((r) => [r.employee, r.date, r.time, r.location])} />} />;
}

function Announcements({ data, update }: { data: DataStore; update: <K extends keyof DataStore>(key: K, rows: DataStore[K]) => void }) {
  const [draft, setDraft] = useState({ title: "", body: "", department: "全社", pinned: false });
  return <SimpleModule title="お知らせ投稿" icon={<Megaphone size={19} />} onSubmit={() => update("announcements", [{ id: uid("ann"), ...draft }, ...data.announcements])} form={<><Field label="タイトル"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field><Field label="本文"><input value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} /></Field><Field label="部署"><input value={draft.department} onChange={(e) => setDraft({ ...draft, department: e.target.value })} /></Field><label className="check"><input type="checkbox" checked={draft.pinned} onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })} />固定</label></>} table={<DataTable headers={["タイトル", "本文", "部署", "固定"]} rows={data.announcements.map((r) => [r.title, r.body, r.department, r.pinned ? "固定" : "通常"])} />} />;
}

function Documents({ data, update }: { data: DataStore; update: <K extends keyof DataStore>(key: K, rows: DataStore[K]) => void }) {
  const [draft, setDraft] = useState({ title: "", category: "マニュアル", owner: "管理", visibility: "全社", driveUrl: "G:\\マイドライブ\\Company App Files\\" });
  return <SimpleModule title="Driveリンク登録" icon={<FolderOpen size={19} />} onSubmit={() => update("documents", [{ id: uid("doc"), ...draft }, ...data.documents])} form={<><Field label="タイトル"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field><Field label="カテゴリ"><input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></Field><Field label="管理部署"><input value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} /></Field><Field label="公開範囲"><input value={draft.visibility} onChange={(e) => setDraft({ ...draft, visibility: e.target.value })} /></Field><Field label="Driveリンク/パス"><input value={draft.driveUrl} onChange={(e) => setDraft({ ...draft, driveUrl: e.target.value })} /></Field></>} table={<DataTable headers={["タイトル", "カテゴリ", "管理", "範囲", "リンク"]} rows={data.documents.map((r) => [r.title, r.category, r.owner, r.visibility, <a href={r.driveUrl.startsWith("http") ? r.driveUrl : undefined} target="_blank"><ExternalLink size={15} />{r.driveUrl}</a>])} />} />;
}

function Tasks({ data, update }: { data: DataStore; update: <K extends keyof DataStore>(key: K, rows: DataStore[K]) => void }) {
  const [draft, setDraft] = useState({ title: "", assignee: "", due: today, status: "未着手" as Task["status"], priority: "中" as Task["priority"] });
  return <SimpleModule title="タスク追加" icon={<CheckSquare size={19} />} onSubmit={() => update("tasks", [{ id: uid("task"), ...draft }, ...data.tasks])} form={<><Field label="タスク"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field><Field label="担当"><input value={draft.assignee} onChange={(e) => setDraft({ ...draft, assignee: e.target.value })} /></Field><Field label="期限"><input type="date" value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} /></Field><Field label="優先度"><select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as Task["priority"] })}><option>高</option><option>中</option><option>低</option></select></Field></>} table={<DataTable headers={["タスク", "担当", "期限", "状態", "優先度"]} rows={data.tasks.map((r) => [r.title, r.assignee, r.due, <button onClick={() => update("tasks", data.tasks.map((task) => task.id === r.id ? { ...task, status: task.status === "完了" ? "未着手" : "完了" } : task))}><Status value={r.status} /></button>, <Status value={r.priority} />])} />} />;
}

function Customers({ data, update }: { data: DataStore; update: <K extends keyof DataStore>(key: K, rows: DataStore[K]) => void }) {
  const [customer, setCustomer] = useState({ name: "", contact: "", email: "", status: "商談中", lastContact: today });
  const [project, setProject] = useState({ customer: "", name: "", owner: "", value: 0, status: "提案" as Project["status"] });
  return (
    <div className="pageStack">
      <div className="twoColumn">
        <Card><SectionTitle icon={<Building2 size={19} />} title="顧客追加" /><form className="formStack" onSubmit={(e) => { e.preventDefault(); update("customers", [{ id: uid("cus"), ...customer }, ...data.customers]); }}><Field label="会社名"><input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} /></Field><Field label="担当者"><input value={customer.contact} onChange={(e) => setCustomer({ ...customer, contact: e.target.value })} /></Field><Field label="メール"><input value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} /></Field><button className="primary"><Plus size={17} />追加</button></form></Card>
        <Card><SectionTitle icon={<Handshake size={19} />} title="案件追加" /><form className="formStack" onSubmit={(e) => { e.preventDefault(); update("projects", [{ id: uid("prj"), ...project }, ...data.projects]); }}><Field label="顧客"><input value={project.customer} onChange={(e) => setProject({ ...project, customer: e.target.value })} /></Field><Field label="案件名"><input value={project.name} onChange={(e) => setProject({ ...project, name: e.target.value })} /></Field><Field label="金額"><input type="number" value={project.value} onChange={(e) => setProject({ ...project, value: Number(e.target.value) })} /></Field><button className="primary"><Plus size={17} />追加</button></form></Card>
      </div>
      <DataTable headers={["顧客", "担当者", "メール", "状態", "最終接触"]} rows={data.customers.map((r) => [r.name, r.contact, r.email, r.status, r.lastContact])} />
      <DataTable headers={["案件", "顧客", "担当", "金額", "状態"]} rows={data.projects.map((r) => [r.name, r.customer, r.owner, yen(r.value), <Status value={r.status} />])} />
    </div>
  );
}

function Finance({ data, update }: { data: DataStore; update: <K extends keyof DataStore>(key: K, rows: DataStore[K]) => void }) {
  const [draft, setDraft] = useState({ customer: "", project: "", amount: 0, due: today, paid: false });
  return <SimpleModule title="請求登録" icon={<JapaneseYen size={19} />} onSubmit={() => update("invoices", [{ id: uid("inv"), ...draft }, ...data.invoices])} form={<><Field label="顧客"><input value={draft.customer} onChange={(e) => setDraft({ ...draft, customer: e.target.value })} /></Field><Field label="案件"><input value={draft.project} onChange={(e) => setDraft({ ...draft, project: e.target.value })} /></Field><Field label="金額"><input type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} /></Field><Field label="支払期限"><input type="date" value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} /></Field><label className="check"><input type="checkbox" checked={draft.paid} onChange={(e) => setDraft({ ...draft, paid: e.target.checked })} />入金済み</label></>} table={<DataTable headers={["顧客", "案件", "金額", "期限", "入金"]} rows={data.invoices.map((r) => [r.customer, r.project, yen(r.amount), r.due, <button onClick={() => update("invoices", data.invoices.map((invoice) => invoice.id === r.id ? { ...invoice, paid: !invoice.paid } : invoice))}><Status value={r.paid ? "入金済" : "未入金"} /></button>])} />} />;
}

function Reports({ data, update }: { data: DataStore; update: <K extends keyof DataStore>(key: K, rows: DataStore[K]) => void }) {
  const [draft, setDraft] = useState({ employee: "", type: "日報" as Report["type"], date: today, summary: "" });
  return <SimpleModule title="日報・週報作成" icon={<FileText size={19} />} onSubmit={() => update("reports", [{ id: uid("rep"), ...draft }, ...data.reports])} form={<><Field label="社員"><input value={draft.employee} onChange={(e) => setDraft({ ...draft, employee: e.target.value })} /></Field><Field label="種類"><select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Report["type"] })}><option>日報</option><option>週報</option></select></Field><Field label="日付"><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field><Field label="内容"><textarea value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} /></Field></>} table={<DataTable headers={["社員", "種類", "日付", "内容"]} rows={data.reports.map((r) => [r.employee, r.type, r.date, r.summary])} />} />;
}

function ChatView({ data, update }: { data: DataStore; update: <K extends keyof DataStore>(key: K, rows: DataStore[K]) => void }) {
  const [draft, setDraft] = useState({ author: "", channel: "全社", message: "", time: "10:00" });
  return <SimpleModule title="コメント投稿" icon={<MessageSquare size={19} />} onSubmit={() => update("chats", [{ id: uid("chat"), ...draft }, ...data.chats])} form={<><Field label="投稿者"><input value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} /></Field><Field label="チャンネル"><input value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value })} /></Field><Field label="時刻"><input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} /></Field><Field label="内容"><input value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} /></Field></>} table={<DataTable headers={["時刻", "チャンネル", "投稿者", "内容"]} rows={data.chats.map((r) => [r.time, r.channel, r.author, r.message])} />} />;
}

function Admin({ data, update }: { data: DataStore; update: <K extends keyof DataStore>(key: K, rows: DataStore[K]) => void }) {
  const [draft, setDraft] = useState({ name: "", permissions: "", members: 0 });
  return (
    <div className="pageStack">
      <Card>
        <SectionTitle icon={<Shield size={19} />} title="権限ロール" action={<button onClick={() => localStorage.setItem("company-hub-backup", JSON.stringify(data))}><Save size={16} />バックアップ</button>} />
        <form className="formGrid" onSubmit={(e) => { e.preventDefault(); update("roles", [{ id: uid("role"), ...draft }, ...data.roles]); }}>
          <Field label="ロール名"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
          <Field label="権限"><input value={draft.permissions} onChange={(e) => setDraft({ ...draft, permissions: e.target.value })} /></Field>
          <Field label="人数"><input type="number" value={draft.members} onChange={(e) => setDraft({ ...draft, members: Number(e.target.value) })} /></Field>
          <button className="primary"><Plus size={17} />追加</button>
        </form>
      </Card>
      <DataTable headers={["ロール", "権限", "人数"]} rows={data.roles.map((r) => [r.name, r.permissions, `${r.members}名`])} />
    </div>
  );
}

function SimpleModule({ title, icon, form, table, onSubmit }: { title: string; icon: ReactNode; form: ReactNode; table: ReactNode; onSubmit: () => void }) {
  return (
    <div className="pageStack">
      <Card>
        <SectionTitle icon={icon} title={title} />
        <form className="formGrid" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
          {form}
          <button className="primary"><Plus size={17} />追加</button>
        </form>
      </Card>
      {table}
    </div>
  );
}

function DataTable({ headers, rows }: { headers: ReactNode[]; rows: ReactNode[][] }) {
  return (
    <Card>
      <div className="tableTools"><Filter size={17} /><span>{rows.length}件</span></div>
      <div className="tableWrap">
        <table>
          <thead><tr>{headers.map((header, index) => <th key={index}>{header}</th>)}</tr></thead>
          <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </Card>
  );
}
