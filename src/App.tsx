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
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
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
  authUid?: string;
  accountEmail?: string;
  name: string;
  department: string;
  role: string;
  accessRole: AccessRole;
  email: string;
  phone: string;
  status: "在籍" | "休職" | "退職";
};

type AccessRole = "admin" | "manager" | "accounting" | "employee";

type Attendance = {
  id: string;
  employeeId?: string;
  employee: string;
  date: string;
  start: string;
  end: string;
  note: string;
};

type RequestItem = {
  id: string;
  requesterId?: string;
  type: string;
  title: string;
  requester: string;
  amount?: number;
  date: string;
  status: "申請中" | "承認" | "差戻し";
};

type Shift = {
  id: string;
  employeeId?: string;
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
  linkUrl?: string;
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
  assigneeId?: string;
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

type FinancialAsset = {
  id: string;
  name: string;
  category: string;
  value: number;
  acquiredAt: string;
  note: string;
};

type Equipment = {
  id: string;
  name: string;
  assetTag: string;
  owner: string;
  location: string;
  condition: string;
  purchaseDate: string;
  value: number;
};

type Report = {
  id: string;
  employeeId?: string;
  employee: string;
  type: "日報" | "週報";
  date: string;
  summary: string;
};

type Chat = {
  id: string;
  authorId?: string;
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

const accessRoleLabels: Record<AccessRole, string> = {
  admin: "管理者",
  manager: "マネージャー",
  accounting: "経理",
  employee: "一般社員",
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
  financialAssets: FinancialAsset[];
  equipment: Equipment[];
  reports: Report[];
  chats: Chat[];
  roles: Role[];
};

const today = "2026-05-13";

const seedData: DataStore = {
  employees: [],
  attendance: [],
  leaveRequests: [],
  shifts: [],
  announcements: [],
  documents: [],
  tasks: [],
  expenses: [],
  customers: [],
  projects: [],
  invoices: [],
  financialAssets: [],
  equipment: [],
  reports: [],
  chats: [],
  roles: [],
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

function canAccessModule(role: AccessRole, moduleId: ModuleId) {
  if (role === "admin") return true;
  if (moduleId === "admin") return false;
  if (moduleId === "finance") return role === "accounting";
  if (moduleId === "customers") return role === "manager" || role === "accounting";
  return true;
}

function canApprove(role: AccessRole) {
  return role === "admin" || role === "manager" || role === "accounting";
}

function isPersonalRecord(recordEmployeeId: string | undefined, recordName: string, employee: Employee | undefined) {
  if (!employee) return false;
  return recordEmployeeId ? recordEmployeeId === employee.id : recordName === employee.name;
}

function scopedDataFor(role: AccessRole, employee: Employee | undefined, data: DataStore): DataStore {
  if (role === "admin" || role === "manager") return data;
  const canSeeMoney = role === "accounting";

  return {
    ...data,
    employees: data.employees,
    attendance: data.attendance.filter((row) => isPersonalRecord(row.employeeId, row.employee, employee)),
    leaveRequests: data.leaveRequests.filter((row) => isPersonalRecord(row.requesterId, row.requester, employee)),
    shifts: data.shifts.filter((row) => isPersonalRecord(row.employeeId, row.employee, employee)),
    tasks: data.tasks.filter((row) => !row.assigneeId || isPersonalRecord(row.assigneeId, row.assignee, employee)),
    expenses: canSeeMoney ? data.expenses : data.expenses.filter((row) => isPersonalRecord(row.requesterId, row.requester, employee)),
    customers: canSeeMoney ? data.customers : [],
    projects: canSeeMoney ? data.projects : [],
    invoices: canSeeMoney ? data.invoices : [],
    financialAssets: canSeeMoney ? data.financialAssets : [],
    equipment: canSeeMoney ? data.equipment : [],
    reports: data.reports,
  };
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
  const [data, setData] = useState<DataStore>(seedData);
  const [syncState, setSyncState] = useState("ログイン待ち");
  const [isCloudReady, setIsCloudReady] = useState(false);
  const [hasLoadedCloud, setHasLoadedCloud] = useState(false);

  useEffect(() => {
    if (!db || !user) {
      setSyncState(user ? "Firestore未設定" : "ログイン待ち");
      setIsCloudReady(false);
      setHasLoadedCloud(false);
      return undefined;
    }

    const ref = doc(db, "companyData", "main");
    setSyncState("クラウド接続中");
    setHasLoadedCloud(false);

    return onSnapshot(
      ref,
      async (snapshot) => {
        if (snapshot.exists()) {
          const cloudData = { ...seedData, ...(snapshot.data().data || {}) } as DataStore;
          setData(cloudData);
          localStorage.setItem("company-hub-data", JSON.stringify(cloudData));
          setIsCloudReady(true);
          setHasLoadedCloud(true);
          setSyncState("Firestore同期中");
          return;
        }

        await setDoc(ref, {
          data: seedData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          updatedBy: user.email,
        });
        setData(seedData);
        setIsCloudReady(true);
        setHasLoadedCloud(true);
        setSyncState("Firestore同期中");
      },
      (error) => {
        setIsCloudReady(false);
        setHasLoadedCloud(false);
        setSyncState(error.message.includes("permission") ? "Firestore権限エラー" : "Firestore接続エラー");
      },
    );
  }, [user]);

  const save = useCallback(async (next: DataStore) => {
    if (db && user && !hasLoadedCloud) {
      setSyncState("Firestore読み込み中");
      return;
    }

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
  }, [hasLoadedCloud, user]);

  return [data, save, syncState, isCloudReady, hasLoadedCloud] as const;
}

export function App() {
  const [active, setActive] = useState<ModuleId>("dashboard");
  const [query, setQuery] = useState("");
  const { user, authReady } = useAuthUser();
  const [data, saveData, syncState, isCloudReady, hasLoadedCloud] = useCompanyData(user);
  const currentEmployee = useMemo(
    () => data.employees.find((employee) => employee.authUid === user?.uid || employee.accountEmail === user?.email),
    [data.employees, user],
  );
  const currentRole: AccessRole = currentEmployee?.accessRole || "employee";
  const visibleModules = useMemo(() => modules.filter((module) => canAccessModule(currentRole, module.id)), [currentRole]);
  const scopedData = useMemo(() => scopedDataFor(currentRole, currentEmployee, data), [currentRole, currentEmployee, data]);

  const stats = useMemo(() => {
    const openApprovals = [...scopedData.leaveRequests, ...scopedData.expenses].filter((item) => item.status === "申請中").length;
    const unpaid = scopedData.invoices.filter((invoice) => !invoice.paid).reduce((sum, invoice) => sum + invoice.amount, 0);
    const pipeline = scopedData.projects.reduce((sum, project) => sum + project.value, 0);
    const openTasks = scopedData.tasks.filter((task) => task.status !== "完了").length;
    return { openApprovals, unpaid, pipeline, openTasks };
  }, [scopedData]);

  const update = <K extends keyof DataStore>(key: K, rows: DataStore[K]) => {
    if (!hasLoadedCloud) return;
    if (key === "employees" && currentRole !== "admin") return;
    if ((key === "invoices" || key === "financialAssets" || key === "equipment") && currentRole !== "admin" && currentRole !== "accounting") return;
    void saveData({ ...data, [key]: rows });
  };

  const approve = (key: "leaveRequests" | "expenses", id: string, status: RequestItem["status"]) => {
    if (!canApprove(currentRole)) return;
    update(
      key,
      data[key].map((item) => (item.id === id ? { ...item, status } : item)) as DataStore[typeof key],
    );
  };

  useEffect(() => {
    if (!hasLoadedCloud || !user || currentEmployee) return;
    const firstEmployee = data.employees.length === 0;
    const selfEmployee: Employee = {
      id: uid("emp"),
      authUid: user.uid,
      accountEmail: user.email || "",
      name: user.email?.split("@")[0] || "未設定ユーザー",
      department: firstEmployee ? "管理" : "未設定",
      role: firstEmployee ? "初期管理者" : "一般社員",
      accessRole: firstEmployee ? "admin" : "employee",
      email: user.email || "",
      phone: "",
      status: "在籍",
    };
    void saveData({ ...data, employees: [selfEmployee, ...data.employees] });
  }, [currentEmployee, data, hasLoadedCloud, saveData, user]);

  useEffect(() => {
    if (!hasLoadedCloud || !user || !currentEmployee || currentEmployee.authUid === user.uid) return;
    void saveData({
      ...data,
      employees: data.employees.map((employee) =>
        employee.id === currentEmployee.id ? { ...employee, authUid: user.uid, accountEmail: user.email || employee.accountEmail } : employee,
      ),
    });
  }, [currentEmployee, data, hasLoadedCloud, saveData, user]);

  useEffect(() => {
    if (!canAccessModule(currentRole, active)) {
      setActive("dashboard");
    }
  }, [active, currentRole]);

  if (!authReady) {
    return <div className="centerScreen">読み込み中...</div>;
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (!hasLoadedCloud) {
    return <div className="centerScreen">クラウドデータを読み込み中...</div>;
  }

  if (!currentEmployee) {
    return <div className="centerScreen">社員情報を準備しています...</div>;
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
          {visibleModules.map((module) => (
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
            <p>{currentEmployee ? `${currentEmployee.name} / ${accessRoleLabels[currentRole]}` : "社員情報を準備しています。"}</p>
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

        {active === "dashboard" && <Dashboard data={scopedData} companyData={data} stats={stats} />}
        {active === "employees" && <Employees data={data} update={update} query={query} canEdit={currentRole === "admin"} />}
        {active === "attendance" && <AttendanceView data={data} visibleRows={scopedData.attendance} update={update} currentEmployee={currentEmployee} canManage={currentRole === "admin" || currentRole === "manager"} />}
        {active === "leave" && <RequestsView title="休暇申請" rows={scopedData.leaveRequests} canApprove={canApprove(currentRole)} currentEmployee={currentEmployee} onApprove={(id, status) => approve("leaveRequests", id, status)} onAdd={(item) => update("leaveRequests", [item, ...data.leaveRequests])} />}
        {active === "shifts" && <Shifts data={data} visibleRows={scopedData.shifts} update={update} currentEmployee={currentEmployee} canManage={currentRole === "admin" || currentRole === "manager"} />}
        {active === "announcements" && <Announcements data={data} update={update} />}
        {active === "documents" && <Documents data={data} update={update} />}
        {active === "tasks" && <Tasks data={data} visibleRows={scopedData.tasks} update={update} currentEmployee={currentEmployee} canManage={currentRole === "admin" || currentRole === "manager"} />}
        {active === "expenses" && <RequestsView title="経費申請・承認" rows={scopedData.expenses} canApprove={canApprove(currentRole)} currentEmployee={currentEmployee} onApprove={(id, status) => approve("expenses", id, status)} onAdd={(item) => update("expenses", [item, ...data.expenses])} expense />}
        {active === "customers" && <Customers data={data} update={update} />}
        {active === "finance" && <Finance data={data} update={update} />}
        {active === "reports" && <Reports data={data} visibleRows={scopedData.reports} update={update} currentEmployee={currentEmployee} />}
        {active === "chat" && <ChatView data={data} update={update} currentEmployee={currentEmployee} />}
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

function Dashboard({ data, companyData, stats }: { data: DataStore; companyData: DataStore; stats: { openApprovals: number; unpaid: number; pipeline: number; openTasks: number } }) {
  return (
    <div className="pageStack">
      <div className="statGrid">
        <Card><Metric icon={<Users />} label="社員" value={`${companyData.employees.length}名`} /></Card>
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
                {item.linkUrl ? <a href={item.linkUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} />開く</a> : <Status value={item.department} />}
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

function Employees({ data, update, query, canEdit }: { data: DataStore; update: <K extends keyof DataStore>(key: K, rows: DataStore[K]) => void; query: string; canEdit: boolean }) {
  const [draft, setDraft] = useState({ name: "", department: "営業", role: "", accessRole: "employee" as AccessRole, email: "", phone: "", status: "在籍" as Employee["status"] });
  const rows = data.employees.filter((employee) => JSON.stringify(employee).toLowerCase().includes(query.toLowerCase()));
  const patchEmployee = (id: string, patch: Partial<Employee>) => {
    update("employees", data.employees.map((employee) => (employee.id === id ? { ...employee, ...patch } : employee)));
  };
  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name) return;
    update("employees", [{ id: uid("emp"), accountEmail: draft.email, ...draft }, ...data.employees]);
    setDraft({ name: "", department: "営業", role: "", accessRole: "employee", email: "", phone: "", status: "在籍" });
  };
  return (
    <div className="pageStack">
      {canEdit ? (
        <Card>
          <SectionTitle icon={<UserPlus size={19} />} title="社員を追加" />
          <form className="formGrid" onSubmit={add}>
            <Field label="名前"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field label="部署"><input value={draft.department} onChange={(e) => setDraft({ ...draft, department: e.target.value })} /></Field>
            <Field label="役職"><input value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} /></Field>
            <Field label="権限"><select value={draft.accessRole} onChange={(e) => setDraft({ ...draft, accessRole: e.target.value as AccessRole })}>{Object.entries(accessRoleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <Field label="メール"><input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
            <Field label="電話"><input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
            <button className="primary"><Plus size={17} />追加</button>
          </form>
        </Card>
      ) : (
        <Card>
          <SectionTitle icon={<Users size={19} />} title="社員一覧" />
          <p className="muted">社員情報は閲覧のみできます。追加・編集・削除は管理者だけが実行できます。</p>
        </Card>
      )}
      <DataTable
        headers={["名前", "部署", "役職", "権限", "メール", "電話", "状態", ""]}
        rows={rows.map((employee) => [
          canEdit ? <input className="tableInput" value={employee.name} onChange={(e) => patchEmployee(employee.id, { name: e.target.value })} /> : employee.name,
          canEdit ? <input className="tableInput" value={employee.department} onChange={(e) => patchEmployee(employee.id, { department: e.target.value })} /> : employee.department,
          canEdit ? <input className="tableInput" value={employee.role} onChange={(e) => patchEmployee(employee.id, { role: e.target.value })} /> : employee.role,
          canEdit ? <select className="tableInput" value={employee.accessRole} onChange={(e) => patchEmployee(employee.id, { accessRole: e.target.value as AccessRole })}>{Object.entries(accessRoleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select> : accessRoleLabels[employee.accessRole],
          canEdit ? <input className="tableInput" value={employee.email} onChange={(e) => patchEmployee(employee.id, { email: e.target.value, accountEmail: e.target.value })} /> : employee.email,
          canEdit ? <input className="tableInput" value={employee.phone} onChange={(e) => patchEmployee(employee.id, { phone: e.target.value })} /> : employee.phone,
          canEdit ? <select className="tableInput" value={employee.status} onChange={(e) => patchEmployee(employee.id, { status: e.target.value as Employee["status"] })}><option>在籍</option><option>休職</option><option>退職</option></select> : <Status value={employee.status} />,
          canEdit ? <button className="iconBtn" onClick={() => update("employees", data.employees.filter((row) => row.id !== employee.id))}><Trash2 size={16} /></button> : "",
        ])}
      />
    </div>
  );
}

function AttendanceView({ data, visibleRows, update, currentEmployee, canManage }: { data: DataStore; visibleRows: Attendance[]; update: <K extends keyof DataStore>(key: K, rows: DataStore[K]) => void; currentEmployee?: Employee; canManage: boolean }) {
  const defaultEmployee = currentEmployee || data.employees[0];
  const [draft, setDraft] = useState({ employeeId: defaultEmployee?.id || "", employee: defaultEmployee?.name || "", date: today, start: "09:00", end: "18:00", note: "" });
  return (
    <SimpleModule
      title="勤怠記録"
      icon={<Clock size={19} />}
      onSubmit={() => {
        const selected = data.employees.find((employee) => employee.id === draft.employeeId) || currentEmployee;
        if (!selected) return;
        update("attendance", [{ id: uid("att"), ...draft, employeeId: selected.id, employee: selected.name }, ...data.attendance]);
        setDraft({ ...draft, note: "" });
      }}
      form={<>
        <Field label="社員"><select disabled={!canManage} value={draft.employeeId} onChange={(e) => { const selected = data.employees.find((employee) => employee.id === e.target.value); setDraft({ ...draft, employeeId: e.target.value, employee: selected?.name || "" }); }}>{(canManage ? data.employees : currentEmployee ? [currentEmployee] : []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></Field>
        <Field label="日付"><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field>
        <Field label="開始"><input type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} /></Field>
        <Field label="終了"><input type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} /></Field>
        <Field label="メモ"><input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></Field>
      </>}
      table={<DataTable headers={["社員", "日付", "開始", "終了", "メモ"]} rows={visibleRows.map((r) => [r.employee, r.date, r.start, r.end, r.note])} />}
    />
  );
}

function RequestsView({ title, rows, onApprove, onAdd, currentEmployee, canApprove, expense = false }: { title: string; rows: RequestItem[]; onApprove: (id: string, status: RequestItem["status"]) => void; onAdd: (item: RequestItem) => void; currentEmployee?: Employee; canApprove: boolean; expense?: boolean }) {
  const [draft, setDraft] = useState({ type: expense ? "交通費" : "有給", title: "", amount: 0, date: today });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.title || !currentEmployee) return;
    onAdd({ id: uid(expense ? "exp" : "leave"), ...draft, requesterId: currentEmployee.id, requester: currentEmployee.name, status: "申請中" });
    setDraft({ ...draft, title: "", amount: 0 });
  };
  return (
    <div className="pageStack">
      <Card>
        <SectionTitle icon={<Inbox size={19} />} title={`${title}を追加`} />
        <form className="formGrid" onSubmit={submit}>
          <Field label="種別"><input value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} /></Field>
          <Field label="内容"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
          <Field label="申請者"><input value={currentEmployee?.name || ""} disabled /></Field>
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
        canApprove ? <div className="actions"><button onClick={() => onApprove(row.id, "承認")}>承認</button><button onClick={() => onApprove(row.id, "差戻し")}>差戻し</button></div> : "不可",
      ])} />
    </div>
  );
}

function Shifts({ data, visibleRows, update, currentEmployee, canManage }: { data: DataStore; visibleRows: Shift[]; update: <K extends keyof DataStore>(key: K, rows: DataStore[K]) => void; currentEmployee?: Employee; canManage: boolean }) {
  const defaultEmployee = currentEmployee || data.employees[0];
  const [draft, setDraft] = useState({ employeeId: defaultEmployee?.id || "", employee: defaultEmployee?.name || "", date: today, time: "09:00-18:00", location: "本社" });
  return <SimpleModule title="シフト登録" icon={<CalendarDays size={19} />} onSubmit={() => { const selected = data.employees.find((employee) => employee.id === draft.employeeId) || currentEmployee; if (!selected) return; update("shifts", [{ id: uid("shift"), ...draft, employeeId: selected.id, employee: selected.name }, ...data.shifts]); }} form={<><Field label="社員"><select disabled={!canManage} value={draft.employeeId} onChange={(e) => { const selected = data.employees.find((employee) => employee.id === e.target.value); setDraft({ ...draft, employeeId: e.target.value, employee: selected?.name || "" }); }}>{(canManage ? data.employees : currentEmployee ? [currentEmployee] : []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></Field><Field label="日付"><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field><Field label="時間"><input value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} /></Field><Field label="場所"><input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} /></Field></>} table={<DataTable headers={["社員", "日付", "時間", "場所"]} rows={visibleRows.map((r) => [r.employee, r.date, r.time, r.location])} />} />;
}

function Announcements({ data, update }: { data: DataStore; update: <K extends keyof DataStore>(key: K, rows: DataStore[K]) => void }) {
  const [draft, setDraft] = useState({ title: "", body: "", department: "全社", linkUrl: "", pinned: false });
  return <SimpleModule title="お知らせ投稿" icon={<Megaphone size={19} />} onSubmit={() => update("announcements", [{ id: uid("ann"), ...draft }, ...data.announcements])} form={<><Field label="タイトル"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field><Field label="本文"><input value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} /></Field><Field label="部署"><input value={draft.department} onChange={(e) => setDraft({ ...draft, department: e.target.value })} /></Field><Field label="リンク"><input type="url" placeholder="https://..." value={draft.linkUrl} onChange={(e) => setDraft({ ...draft, linkUrl: e.target.value })} /></Field><label className="check"><input type="checkbox" checked={draft.pinned} onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })} />固定</label></>} table={<DataTable headers={["タイトル", "本文", "部署", "リンク", "固定", ""]} rows={data.announcements.map((r) => [r.title, r.body, r.department, r.linkUrl ? <a href={r.linkUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} />開く</a> : "", r.pinned ? "固定" : "通常", <button className="iconBtn" onClick={() => update("announcements", data.announcements.filter((item) => item.id !== r.id))}><Trash2 size={16} /></button>])} />} />;
}

function Documents({ data, update }: { data: DataStore; update: <K extends keyof DataStore>(key: K, rows: DataStore[K]) => void }) {
  const [draft, setDraft] = useState({ title: "", category: "マニュアル", owner: "管理", visibility: "全社", driveUrl: "G:\\マイドライブ\\Company App Files\\" });
  return <SimpleModule title="Driveリンク登録" icon={<FolderOpen size={19} />} onSubmit={() => update("documents", [{ id: uid("doc"), ...draft }, ...data.documents])} form={<><Field label="タイトル"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field><Field label="カテゴリ"><input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></Field><Field label="管理部署"><input value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} /></Field><Field label="公開範囲"><input value={draft.visibility} onChange={(e) => setDraft({ ...draft, visibility: e.target.value })} /></Field><Field label="Driveリンク/パス"><input value={draft.driveUrl} onChange={(e) => setDraft({ ...draft, driveUrl: e.target.value })} /></Field></>} table={<DataTable headers={["タイトル", "カテゴリ", "管理", "範囲", "リンク"]} rows={data.documents.map((r) => [r.title, r.category, r.owner, r.visibility, <a href={r.driveUrl.startsWith("http") ? r.driveUrl : undefined} target="_blank"><ExternalLink size={15} />{r.driveUrl}</a>])} />} />;
}

function Tasks({ data, visibleRows, update, currentEmployee, canManage }: { data: DataStore; visibleRows: Task[]; update: <K extends keyof DataStore>(key: K, rows: DataStore[K]) => void; currentEmployee?: Employee; canManage: boolean }) {
  const defaultEmployee = currentEmployee || data.employees[0];
  const [draft, setDraft] = useState({ title: "", assigneeId: defaultEmployee?.id || "", assignee: defaultEmployee?.name || "", due: today, status: "未着手" as Task["status"], priority: "中" as Task["priority"] });
  return <SimpleModule title="タスク追加" icon={<CheckSquare size={19} />} onSubmit={() => { const selected = data.employees.find((employee) => employee.id === draft.assigneeId) || currentEmployee; if (!selected) return; update("tasks", [{ id: uid("task"), ...draft, assigneeId: selected.id, assignee: selected.name }, ...data.tasks]); }} form={<><Field label="タスク"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field><Field label="担当"><select disabled={!canManage} value={draft.assigneeId} onChange={(e) => { const selected = data.employees.find((employee) => employee.id === e.target.value); setDraft({ ...draft, assigneeId: e.target.value, assignee: selected?.name || "" }); }}>{(canManage ? data.employees : currentEmployee ? [currentEmployee] : []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></Field><Field label="期限"><input type="date" value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} /></Field><Field label="優先度"><select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as Task["priority"] })}><option>高</option><option>中</option><option>低</option></select></Field></>} table={<DataTable headers={["タスク", "担当", "期限", "状態", "優先度"]} rows={visibleRows.map((r) => [r.title, r.assignee, r.due, <button onClick={() => update("tasks", data.tasks.map((task) => task.id === r.id ? { ...task, status: task.status === "完了" ? "未着手" : "完了" } : task))}><Status value={r.status} /></button>, <Status value={r.priority} />])} />} />;
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
  const [assetDraft, setAssetDraft] = useState({ name: "", category: "現金・預金", value: 0, acquiredAt: today, note: "" });
  const [equipmentDraft, setEquipmentDraft] = useState({ name: "", assetTag: "", owner: "", location: "本社", condition: "使用中", purchaseDate: today, value: 0 });
  const paidTotal = data.invoices.filter((invoice) => invoice.paid).reduce((sum, invoice) => sum + invoice.amount, 0);
  const unpaidTotal = data.invoices.filter((invoice) => !invoice.paid).reduce((sum, invoice) => sum + invoice.amount, 0);
  const assetTotal = data.financialAssets.reduce((sum, asset) => sum + asset.value, 0);
  const equipmentTotal = data.equipment.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="pageStack">
      <div className="statGrid">
        <Card><Metric icon={<JapaneseYen />} label="入金済み" value={yen(paidTotal)} /></Card>
        <Card><Metric icon={<Inbox />} label="未入金" value={yen(unpaidTotal)} /></Card>
        <Card><Metric icon={<WalletCards />} label="会社資産" value={yen(assetTotal)} /></Card>
        <Card><Metric icon={<Building2 />} label="備品評価額" value={yen(equipmentTotal)} /></Card>
      </div>

      <SimpleModule
        title="請求登録"
        icon={<JapaneseYen size={19} />}
        onSubmit={() => update("invoices", [{ id: uid("inv"), ...draft }, ...data.invoices])}
        form={<>
          <Field label="顧客"><input value={draft.customer} onChange={(e) => setDraft({ ...draft, customer: e.target.value })} /></Field>
          <Field label="案件"><input value={draft.project} onChange={(e) => setDraft({ ...draft, project: e.target.value })} /></Field>
          <Field label="金額"><input type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} /></Field>
          <Field label="支払期限"><input type="date" value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} /></Field>
          <label className="check"><input type="checkbox" checked={draft.paid} onChange={(e) => setDraft({ ...draft, paid: e.target.checked })} />入金済み</label>
        </>}
        table={<DataTable headers={["顧客", "案件", "金額", "期限", "入金"]} rows={data.invoices.map((r) => [r.customer, r.project, yen(r.amount), r.due, <button onClick={() => update("invoices", data.invoices.map((invoice) => invoice.id === r.id ? { ...invoice, paid: !invoice.paid } : invoice))}><Status value={r.paid ? "入金済" : "未入金"} /></button>])} />}
      />

      <SimpleModule
        title="会社資産登録"
        icon={<WalletCards size={19} />}
        onSubmit={() => update("financialAssets", [{ id: uid("asset"), ...assetDraft }, ...data.financialAssets])}
        form={<>
          <Field label="資産名"><input value={assetDraft.name} onChange={(e) => setAssetDraft({ ...assetDraft, name: e.target.value })} /></Field>
          <Field label="分類"><select value={assetDraft.category} onChange={(e) => setAssetDraft({ ...assetDraft, category: e.target.value })}><option>現金・預金</option><option>売掛金</option><option>車両</option><option>工具・機材</option><option>その他</option></select></Field>
          <Field label="金額"><input type="number" value={assetDraft.value} onChange={(e) => setAssetDraft({ ...assetDraft, value: Number(e.target.value) })} /></Field>
          <Field label="取得日"><input type="date" value={assetDraft.acquiredAt} onChange={(e) => setAssetDraft({ ...assetDraft, acquiredAt: e.target.value })} /></Field>
          <Field label="メモ"><input value={assetDraft.note} onChange={(e) => setAssetDraft({ ...assetDraft, note: e.target.value })} /></Field>
        </>}
        table={<DataTable headers={["資産名", "分類", "金額", "取得日", "メモ"]} rows={data.financialAssets.map((r) => [r.name, r.category, yen(r.value), r.acquiredAt, r.note])} />}
      />

      <SimpleModule
        title="備品台帳"
        icon={<ClipboardList size={19} />}
        onSubmit={() => update("equipment", [{ id: uid("eqp"), ...equipmentDraft }, ...data.equipment])}
        form={<>
          <Field label="備品名"><input value={equipmentDraft.name} onChange={(e) => setEquipmentDraft({ ...equipmentDraft, name: e.target.value })} /></Field>
          <Field label="管理番号"><input value={equipmentDraft.assetTag} onChange={(e) => setEquipmentDraft({ ...equipmentDraft, assetTag: e.target.value })} /></Field>
          <Field label="利用者"><input value={equipmentDraft.owner} onChange={(e) => setEquipmentDraft({ ...equipmentDraft, owner: e.target.value })} /></Field>
          <Field label="場所"><input value={equipmentDraft.location} onChange={(e) => setEquipmentDraft({ ...equipmentDraft, location: e.target.value })} /></Field>
          <Field label="状態"><select value={equipmentDraft.condition} onChange={(e) => setEquipmentDraft({ ...equipmentDraft, condition: e.target.value })}><option>使用中</option><option>保管中</option><option>修理中</option><option>廃棄予定</option></select></Field>
          <Field label="購入日"><input type="date" value={equipmentDraft.purchaseDate} onChange={(e) => setEquipmentDraft({ ...equipmentDraft, purchaseDate: e.target.value })} /></Field>
          <Field label="金額"><input type="number" value={equipmentDraft.value} onChange={(e) => setEquipmentDraft({ ...equipmentDraft, value: Number(e.target.value) })} /></Field>
        </>}
        table={<DataTable headers={["備品名", "管理番号", "利用者", "場所", "状態", "購入日", "金額"]} rows={data.equipment.map((r) => [r.name, r.assetTag, r.owner, r.location, <Status value={r.condition} />, r.purchaseDate, yen(r.value)])} />}
      />
    </div>
  );
}

function Reports({ data, visibleRows, update, currentEmployee }: { data: DataStore; visibleRows: Report[]; update: <K extends keyof DataStore>(key: K, rows: DataStore[K]) => void; currentEmployee?: Employee }) {
  const [draft, setDraft] = useState({ type: "日報" as Report["type"], date: today, summary: "" });
  return <SimpleModule title="日報・週報作成" icon={<FileText size={19} />} onSubmit={() => { if (!currentEmployee) return; update("reports", [{ id: uid("rep"), employeeId: currentEmployee.id, employee: currentEmployee.name, ...draft }, ...data.reports]); }} form={<><Field label="社員"><input value={currentEmployee?.name || ""} disabled /></Field><Field label="種類"><select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Report["type"] })}><option>日報</option><option>週報</option></select></Field><Field label="日付"><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field><Field label="内容"><textarea value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} /></Field></>} table={<DataTable headers={["社員", "種類", "日付", "内容"]} rows={visibleRows.map((r) => [r.employee, r.type, r.date, r.summary])} />} />;
}

function ChatView({ data, update, currentEmployee }: { data: DataStore; update: <K extends keyof DataStore>(key: K, rows: DataStore[K]) => void; currentEmployee?: Employee }) {
  const [draft, setDraft] = useState({ channel: "全社", message: "", time: "10:00" });
  return <SimpleModule title="コメント投稿" icon={<MessageSquare size={19} />} onSubmit={() => { if (!currentEmployee) return; update("chats", [{ id: uid("chat"), authorId: currentEmployee.id, author: currentEmployee.name, ...draft }, ...data.chats]); }} form={<><Field label="投稿者"><input value={currentEmployee?.name || ""} disabled /></Field><Field label="チャンネル"><input value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value })} /></Field><Field label="時刻"><input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} /></Field><Field label="内容"><input value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} /></Field></>} table={<DataTable headers={["時刻", "チャンネル", "投稿者", "内容"]} rows={data.chats.map((r) => [r.time, r.channel, r.author, r.message])} />} />;
}

function Admin({ data, update }: { data: DataStore; update: <K extends keyof DataStore>(key: K, rows: DataStore[K]) => void }) {
  return (
    <div className="pageStack">
      <Card>
        <SectionTitle icon={<Shield size={19} />} title="権限管理" action={<button onClick={() => localStorage.setItem("company-hub-backup", JSON.stringify(data))}><Save size={16} />バックアップ</button>} />
        <p className="muted">社員管理画面でアカウントメールと権限を設定します。メールがログインアカウントと一致すると、その社員に紐づきます。</p>
      </Card>
      <DataTable headers={["名前", "メール", "権限", "アカウントUID"]} rows={data.employees.map((employee) => [employee.name, employee.email, accessRoleLabels[employee.accessRole], employee.authUid || "メール紐づけ待ち"])} />
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
