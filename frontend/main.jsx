const API_BASE = "https://hrms-lite-api-2zf2.onrender.com";

async function apiRequest(path, options = {}) {
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const isJson =
    resp.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await resp.json().catch(() => null) : null;

  if (!resp.ok) {
    const message =
      body?.detail ||
      `Request failed with status ${resp.status}: ${resp.statusText}`;
    const error = new Error(message);
    error.status = resp.status;
    throw error;
  }

  return body;
}

function App() {
  const [activeTab, setActiveTab] = React.useState("employees");

  
  const [employees, setEmployees] = React.useState([]);
  const [employeesLoading, setEmployeesLoading] = React.useState(true);
  const [summaryDate, setSummaryDate] = React.useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dailySummary, setDailySummary] = React.useState(null);
  const [summaryLoading, setSummaryLoading] = React.useState(false);

  const [form, setForm] = React.useState({
    employee_id: "",
    full_name: "",
    email: "",
    department: "",
  });
  const [savingEmployee, setSavingEmployee] = React.useState(false);

  const [attendanceForm, setAttendanceForm] = React.useState({
    employeeId: "",
    date: new Date().toISOString().slice(0, 10),
    status: "Present",
  });
  const [selectedEmployee, setSelectedEmployee] = React.useState(null);
  const [attendanceSummary, setAttendanceSummary] = React.useState(null);
  const [attendanceLoading, setAttendanceLoading] = React.useState(false);
  const [markingAttendance, setMarkingAttendance] = React.useState(false);

  const [error, setError] = React.useState(null);
  const [filterFrom, setFilterFrom] = React.useState("");
  const [filterTo, setFilterTo] = React.useState("");

  React.useEffect(() => {
    loadEmployees();
  }, []);

  React.useEffect(() => {
    loadDailySummary(summaryDate);
  }, [summaryDate]);

  React.useEffect(() => {
    if (!selectedEmployee && employees.length > 0) {
      setSelectedEmployee(employees[0]);
    }
  }, [employees, selectedEmployee]);

  React.useEffect(() => {
    if (selectedEmployee) {
      setAttendanceForm((prev) => ({
        ...prev,
        employeeId: selectedEmployee.id,
      }));
      loadAttendance(selectedEmployee.id);
    } else {
      setAttendanceSummary(null);
    }
  }, [selectedEmployee]);

  async function loadEmployees() {
    setEmployeesLoading(true);
    setError(null);
    try {
      const data = await apiRequest("/employees");
      setEmployees(data);
    } catch (e) {
      setError(e.message || "Failed to load employees.");
    } finally {
      setEmployeesLoading(false);
    }
  }

  async function loadDailySummary(dateStr) {
    if (!dateStr) return;
    setSummaryLoading(true);
    try {
      const data = await apiRequest(`/attendance/summary?date=${dateStr}`);
      setDailySummary(data);
    } catch (e) {
      // do not surface as global error to avoid noise when there is simply no data yet
      setDailySummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }

  async function loadAttendance(employeeId) {
    if (!employeeId) return;
    setAttendanceLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/employees/${employeeId}/attendance`);
      setAttendanceSummary(data);
    } catch (e) {
      setError(e.message || "Failed to load attendance.");
      setAttendanceSummary(null);
    } finally {
      setAttendanceLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleAttendanceChange(e) {
    const { name, value } = e.target;
    setAttendanceForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleCreateEmployee(e) {
    e.preventDefault();
    setSavingEmployee(true);
    setError(null);
    try {
      const payload = {
        employee_id: form.employee_id.trim(),
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        department: form.department.trim(),
      };
      const created = await apiRequest("/employees", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setEmployees((prev) => [...prev, created]);
      setForm({
        employee_id: "",
        full_name: "",
        email: "",
        department: "",
      });
      if (!selectedEmployee) {
        setSelectedEmployee(created);
      }
    } catch (e) {
      setError(e.message || "Failed to create employee.");
    } finally {
      setSavingEmployee(false);
    }
  }

  async function handleDeleteEmployee(id) {
    if (!window.confirm("Delete this employee and all attendance records?")) {
      return;
    }
    setError(null);
    try {
      await apiRequest(`/employees/${id}`, { method: "DELETE" });
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      if (selectedEmployee?.id === id) {
        setSelectedEmployee(null);
      }
    } catch (e) {
      setError(e.message || "Failed to delete employee.");
    }
  }

  async function handleMarkAttendance(e) {
    e.preventDefault();
    if (!attendanceForm.employeeId) return;
    setMarkingAttendance(true);
    setError(null);
    try {
      await apiRequest("/attendance", {
        method: "POST",
        body: JSON.stringify({
          employee_id: Number(attendanceForm.employeeId),
          date: attendanceForm.date,
          status: attendanceForm.status,
        }),
      });
      await loadAttendance(attendanceForm.employeeId);
    } catch (err) {
      setError(err.message || "Failed to mark attendance.");
    } finally {
      setMarkingAttendance(false);
    }
  }

  const presentCount =
    (attendanceSummary?.records || [])
      .filter((r) => {
        const d = new Date(r.date).toISOString().slice(0, 10);
        if (filterFrom && d < filterFrom) return false;
        if (filterTo && d > filterTo) return false;
        return true;
      })
      .filter((r) => r.status === "Present").length;
  const absentCount =
    (attendanceSummary?.records || [])
      .filter((r) => {
        const d = new Date(r.date).toISOString().slice(0, 10);
        if (filterFrom && d < filterFrom) return false;
        if (filterTo && d > filterTo) return false;
        return true;
      })
      .filter((r) => r.status === "Absent").length;

  const filteredRecords =
    attendanceSummary?.records?.filter((r) => {
      const d = new Date(r.date).toISOString().slice(0, 10);
      if (filterFrom && d < filterFrom) return false;
      if (filterTo && d > filterTo) return false;
      return true;
    }) || [];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-title">
          <h1>
            HRMS Lite
            <span className="badge-pill">Internal HR Console</span>
          </h1>
          <p>Manage employees and track daily attendance.</p>
        </div>
        <div className="app-meta">
          <span className="dot" />
          <span>Admin mode</span>
          <span>•</span>
          <span>Single-tenant</span>
          <span>•</span>
          <span>{employees.length} employees</span>
        </div>
      </header>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
          gap: 12,
        }}
      >
        <div className="tabs">
          <button
            className={`tab ${
              activeTab === "employees" ? "tab-active" : ""
            }`.trim()}
            onClick={() => setActiveTab("employees")}
          >
            Employees
            <span>{employees.length}</span>
          </button>
          <button
            className={`tab ${
              activeTab === "attendance" ? "tab-active" : ""
            }`.trim()}
            onClick={() => setActiveTab("attendance")}
          >
            Attendance
            <span>{attendanceSummary?.records?.length ?? 0}</span>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="subtle-label">Summary for</div>
          <input
            type="date"
            value={summaryDate}
            onChange={(e) => setSummaryDate(e.target.value)}
            style={{
              borderRadius: 999,
              padding: "5px 10px",
              border: "1px solid #e5e7eb",
              fontSize: 12,
            }}
          />
          <div className="badge-soft">
            {summaryLoading || !dailySummary
              ? "No data yet"
              : `Present ${dailySummary.present} • Absent ${dailySummary.absent} • Total ${dailySummary.total_employees}`}
          </div>
        </div>
      </div>


      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <main className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <h2>Employee Directory</h2>
              <p>
                Centralized list of all employees with quick add and removal.
              </p>
            </div>
            <span className="pill">
              {employeesLoading
                ? "Loading…"
                : employees.length
                ? `${employees.length} active`
                : "No employees yet"}
            </span>
          </div>

          <form onSubmit={handleCreateEmployee}>
            <div className="form-grid">
              <div className="field">
                <label>
                  Employee ID <span className="required">*</span>
                </label>
                <input
                  name="employee_id"
                  value={form.employee_id}
                  onChange={handleChange}
                  placeholder="EMP-001"
                  required
                />
              </div>
              <div className="field">
                <label>
                  Full name <span className="required">*</span>
                </label>
                <input
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="e.g. Jane Doe"
                  required
                />
              </div>
              <div className="field">
                <label>
                  Email address <span className="required">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="name@company.com"
                  required
                />
              </div>
              <div className="field">
                <label>
                  Department <span className="required">*</span>
                </label>
                <input
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  placeholder="Engineering, HR, Finance…"
                  required
                />
              </div>
            </div>
            <div className="form-footer">
              <p className="helper">
                <span>Required</span> fields are validated server-side, with
                duplicate email/ID checks.
              </p>
              <div className="actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() =>
                    setForm({
                      employee_id: "",
                      full_name: "",
                      email: "",
                      department: "",
                    })
                  }
                >
                  Clear
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingEmployee}
                >
                  {savingEmployee ? "Saving…" : "Add employee"}
                </button>
              </div>
            </div>
          </form>

          <div className="table-wrapper">
            {employeesLoading ? (
              <div className="empty-state">
                <strong>Loading employees…</strong>
              </div>
            ) : !employees.length ? (
              <div className="empty-state">
                <strong>No employees yet.</strong> Add your first employee above
                to start tracking attendance.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th style={{ width: 72 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr
                      key={emp.id}
                      onClick={() => setSelectedEmployee(emp)}
                      style={{
                        cursor: "pointer",
                        backgroundColor:
                          selectedEmployee?.id === emp.id
                            ? "#e0ecff"
                            : undefined,
                      }}
                    >
                      <td>
                        <div style={{ fontWeight: 500 }}>{emp.full_name}</div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#6b7280",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            marginTop: 2,
                          }}
                        >
                          {emp.employee_id}
                        </div>
                      </td>
                      <td>{emp.email}</td>
                      <td>{emp.department}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-danger"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteEmployee(emp.id);
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <h2>Daily Attendance</h2>
              <p>
                Mark presence for today and review historical attendance per
                employee.
              </p>
            </div>
            <div className="pill-legend">
              <span className="status-pill status-green">Present</span>
              <span className="status-pill status-red">Absent</span>
              <span className="status-pill status-muted">No record</span>
            </div>
          </div>

          <div className="right-panel-body">
            <form onSubmit={handleMarkAttendance}>
              <div className="form-grid">
                <div className="field">
                  <label>
                    Employee <span className="required">*</span>
                  </label>
                  <select
                    name="employeeId"
                    value={attendanceForm.employeeId}
                    onChange={(e) => {
                      handleAttendanceChange(e);
                      const id = Number(e.target.value);
                      const emp = employees.find((x) => x.id === id);
                      setSelectedEmployee(emp || null);
                    }}
                    required
                  >
                    <option value="">Select employee…</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.employee_id})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>
                    Date <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={attendanceForm.date}
                    onChange={handleAttendanceChange}
                    required
                  />
                </div>
                <div className="field">
                  <label>
                    Status <span className="required">*</span>
                  </label>
                  <select
                    name="status"
                    value={attendanceForm.status}
                    onChange={handleAttendanceChange}
                    required
                  >
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                  </select>
                </div>
              </div>
              <div className="form-footer">
                <p className="helper">
                  <span>Smart updates.</span> Marking attendance for an existing
                  date will update the record instead of creating duplicates.
                </p>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={markingAttendance || !employees.length}
                >
                  {markingAttendance ? "Saving…" : "Save attendance"}
                </button>
              </div>
            </form>

            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <div>
                  <div className="subtle-label">Selected employee</div>
                  <div style={{ fontSize: 13 }}>
                    {selectedEmployee ? (
                      <>
                        <strong>{selectedEmployee.full_name}</strong>{" "}
                        <span style={{ color: "#6b7280" }}>
                          ({selectedEmployee.employee_id}) •{" "}
                          {selectedEmployee.department}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: "#9ca3af" }}>
                        No employee selected yet.
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div className="subtle-label">Summary</div>
                  <div className="summary-line">
                    <span>Present days</span>
                    <span>{presentCount}</span>
                  </div>
                  <div className="summary-line">
                    <span>Absent days</span>
                    <span>{absentCount}</span>
                  </div>
                </div>
              </div>

              <div className="attendance-list">
                {attendanceLoading ? (
                  <div className="empty-state">
                    <strong>Loading attendance…</strong>
                  </div>
                ) : !selectedEmployee ? (
                  <div className="empty-state">
                    <strong>Select an employee</strong> to see their attendance
                    history.
                  </div>
                ) : !attendanceSummary?.records?.length ? (
                  <div className="empty-state">
                    <strong>No attendance records yet.</strong> Start by marking
                    today&apos;s status above.
                  </div>
                ) : (
                  <>
                    <div className="attendance-row header">
                      <div>Date</div>
                      <div>Status</div>
                      <div>Source</div>
                    </div>
                    {filteredRecords.map((record) => (
                      <div key={record.id} className="attendance-row">
                        <div>
                          {new Date(record.date).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div>
                          <span
                            className={`status-pill ${
                              record.status === "Present"
                                ? "status-green"
                                : "status-red"
                            }`.trim()}
                          >
                            {record.status}
                          </span>
                        </div>
                        <div>
                          <span className="badge-soft">
                            <span /> Manual entry
                          </span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

