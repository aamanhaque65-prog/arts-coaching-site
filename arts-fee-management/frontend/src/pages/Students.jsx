import { useCallback, useEffect, useRef, useState } from "react";
import { FiAlertCircle, FiPlus, FiSearch, FiUsers } from "react-icons/fi";
import { PageHeading } from "../components/Header.jsx";
import StatsCard from "../components/StatsCard.jsx";
import StudentForm from "../components/StudentForm.jsx";
import StudentTable from "../components/StudentTable.jsx";
import { api, getApiError } from "../services/api.js";

const EMPTY_PAGINATION = { page: 1, pageSize: 10, total: 0, totalPages: 0 };

export default function Students() {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formStudent, setFormStudent] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const requestId = useRef(0);
  const deleteCancelRef = useRef(null);

  const loadStudents = useCallback(async (requestedPage = 1, requestedSearch = search) => {
    const id = ++requestId.current;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.get("/students", {
        params: { page: requestedPage, search: requestedSearch },
      });
      if (id === requestId.current) {
        setStudents(data.students);
        setPagination(data.pagination);
        setPage(data.pagination.page);
      }
    } catch (cause) {
      if (id === requestId.current) setError(getApiError(cause));
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }, [search]);

  useEffect(() => {
    if (!deleteCandidate) return;
    const previousFocus = document.activeElement;
    deleteCancelRef.current?.focus();
    function handleKeyDown(event) {
      if (event.key === "Escape" && !deleting) setDeleteCandidate(null);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [deleteCandidate, deleting]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    loadStudents(page, search);
  }, [loadStudents, page, search]);

  function closeForm() {
    setFormOpen(false);
    setFormStudent(null);
  }

  async function saveStudent(values) {
    if (formStudent) {
      await api.put(`/students/${formStudent.id}`, values);
      return { ...formStudent, ...values };
    }
    const { data } = await api.post("/students", values);
    return data.student;
  }

  function handleSaved(student) {
    const isNew = !formStudent;
    closeForm();
    setNotice(isNew ? `${student.name} was added to the student directory.` : `${student.name}’s profile was updated.`);
    setError("");
    loadStudents(isNew ? 1 : page, search);
  }

  async function confirmDelete() {
    if (!deleteCandidate) return;
    setDeleting(true);
    setError("");
    try {
      await api.delete(`/students/${deleteCandidate.id}`);
      setNotice(`${deleteCandidate.name} was removed from the active student directory.`);
      setDeleteCandidate(null);
      const lastItemOnPage = students.length === 1 && page > 1;
      loadStudents(lastItemOnPage ? page - 1 : page, search);
    } catch (cause) {
      setError(getApiError(cause));
    } finally {
      setDeleting(false);
    }
  }

  const studentsLabel = busy && !pagination.total ? "…" : String(pagination.total);

  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRATION · STUDENTS"
        title="Student management"
        description="Manage student and guardian details for your coaching centre."
      />
      {error && <p className="alert alert-error" role="alert"><FiAlertCircle size={18} />{error}</p>}
      {notice && <p className="alert alert-success" role="status">{notice}</p>}

      <section className="stats-grid students-stats" aria-label="Student summary">
        <StatsCard label="Active students" value={studentsLabel} helper="Matching your current search" icon="students" tone="blue" />
      </section>

      <section className="panel student-directory-panel" aria-labelledby="student-directory-title">
        <div className="student-directory-heading">
          <div className="panel-heading">
            <div><h2 id="student-directory-title">Student directory</h2><p>Search and manage student profiles.</p></div>
            <label className="search-field">
              <FiSearch size={16} aria-hidden="true" />
              <span className="sr-only">Search students</span>
              <input
                aria-label="Search students by name, course, mobile or guardian"
                type="search"
                placeholder="Search students…"
                maxLength="100"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button
              className="primary-button add-student-button"
              type="button"
              onClick={() => { setFormStudent(null); setFormOpen(true); }}
            >
              <FiPlus size={16} aria-hidden="true" /> Add student
            </button>
          </div>
        </div>
        <StudentTable
          students={students}
          pagination={pagination}
          page={page}
          busy={busy}
          query={search}
          onPageChange={setPage}
          onEdit={(student) => { setFormStudent(student); setFormOpen(true); }}
          onDelete={setDeleteCandidate}
        />
      </section>

      {formOpen && (
        <StudentForm
          student={formStudent}
          open={formOpen}
          onSubmit={saveStudent}
          onSaved={handleSaved}
          onError={setError}
          onCancel={closeForm}
        />
      )}

      {deleteCandidate && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !deleting) setDeleteCandidate(null);
        }}>
          <section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-student-title" aria-describedby="delete-student-description">
            <div className="confirm-icon"><FiAlertCircle size={22} aria-hidden="true" /></div>
            <h2 id="delete-student-title">Remove student?</h2>
            <p id="delete-student-description">Remove <strong>{deleteCandidate.name}</strong> from the active student directory? Existing payment history will be preserved.</p>
            <div className="student-form-actions">
              <button className="secondary-button" ref={deleteCancelRef} type="button" onClick={() => setDeleteCandidate(null)} disabled={deleting}>Cancel</button>
              <button className="danger-button" type="button" onClick={confirmDelete} disabled={deleting}>{deleting ? "Removing…" : "Remove student"}</button>
            </div>
          </section>
        </div>
      )}

      <div className="student-page-footer"><FiUsers size={15} aria-hidden="true" />Student records are visible to signed-in administrators only.</div>
    </>
  );
}
