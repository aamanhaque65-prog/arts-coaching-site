import { FiEdit2, FiTrash2, FiUsers } from "react-icons/fi";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export default function StudentTable({
  students,
  pagination,
  page,
  busy,
  query,
  onPageChange,
  onEdit,
  onDelete,
}) {
  return (
    <>
      <div className="table-scroll">
        <table className="data-table student-table" aria-busy={busy}>
          <thead>
            <tr>
              <th scope="col">Student</th>
              <th scope="col">Course</th>
              <th scope="col">Mobile number</th>
              <th scope="col">Guardian</th>
              <th scope="col">Monthly fee</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {students.length ? students.map((student) => (
              <tr key={student.id}>
                <td>
                  <span className="student-name">{student.name}</span>
                  {student.studentCode && <small className="student-code">{student.studentCode}</small>}
                </td>
                <td>{student.course}</td>
                <td><a className="student-phone" href={`tel:${student.mobileNumber.replace(/[^\d+]/g, "")}`}>{student.mobileNumber}</a></td>
                <td>{student.guardianName}</td>
                <td className="amount-cell">{formatCurrency(student.monthlyFee)}</td>
                <td>
                  <div className="student-row-actions">
                    <button className="icon-button row-action" type="button" onClick={() => onEdit(student)} aria-label={`Edit ${student.name}`}><FiEdit2 size={15} /></button>
                    <button className="icon-button row-action row-action-delete" type="button" onClick={() => onDelete(student)} aria-label={`Delete ${student.name}`}><FiTrash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td className="student-empty-cell" colSpan={6}>
                <FiUsers size={24} aria-hidden="true" />
                <strong>{query ? "No students found" : "No students yet"}</strong>
                <span>{query ? "Try a different search." : "Add your first student to start building the directory."}</span>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="student-table-footer">
        <span>
          {pagination.total
            ? `Showing ${(page - 1) * pagination.pageSize + 1}–${Math.min(page * pagination.pageSize, pagination.total)} of ${pagination.total} students`
            : "No students to display"}
        </span>
        <nav className="pagination" aria-label="Student pages">
          <button className="page-button" type="button" onClick={() => onPageChange(page - 1)} disabled={busy || page <= 1}>Previous</button>
          <span className="page-current">Page {pagination.totalPages ? page : 0} of {pagination.totalPages}</span>
          <button className="page-button" type="button" onClick={() => onPageChange(page + 1)} disabled={busy || page >= pagination.totalPages}>Next</button>
        </nav>
      </div>
    </>
  );
}
