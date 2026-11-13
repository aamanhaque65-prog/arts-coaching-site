import { useEffect, useRef, useState } from "react";
import { FiX } from "react-icons/fi";
import { getApiError } from "../services/api.js";

const emptyValues = {
  name: "",
  course: "",
  monthlyFee: "",
  mobileNumber: "",
  guardianName: "",
};

function validateStudent(values) {
  const errors = {};
  const name = values.name.trim();
  const course = values.course.trim();
  const mobileNumber = values.mobileNumber.trim();
  const guardianName = values.guardianName.trim();
  const monthlyFee = Number(values.monthlyFee);

  if (!name || name.length > 120) {
    errors.name = "Enter a student name using no more than 120 characters.";
  }
  if (!course || course.length > 100) {
    errors.course = "Enter a course using no more than 100 characters.";
  }
  if (
    !values.monthlyFee.trim() ||
    !Number.isFinite(monthlyFee) ||
    monthlyFee < 0 ||
    monthlyFee > 1000000 ||
    Number(monthlyFee.toFixed(2)) !== monthlyFee
  ) {
    errors.monthlyFee = "Enter a monthly fee from INR 0 to INR 1,000,000 with up to 2 decimal places.";
  }
  if (
    mobileNumber.length > 30 ||
    !/^[+()\d\s.-]{7,30}$/.test(mobileNumber) ||
    mobileNumber.replace(/\D/g, "").length < 7
  ) {
    errors.mobileNumber = "Enter a valid mobile number with at least 7 digits and no more than 30 characters.";
  }
  if (!guardianName || guardianName.length > 120) {
    errors.guardianName = "Enter a guardian name using no more than 120 characters.";
  }

  return errors;
}

export default function StudentForm({
  student,
  onSubmit,
  onCancel,
  onSaved,
  onError,
  open,
}) {
  const [values, setValues] = useState(emptyValues);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    dialogRef.current?.querySelector("input")?.focus();
    setValues(student ? {
      name: student.name,
      course: student.course,
      monthlyFee: String(student.monthlyFee),
      mobileNumber: student.mobileNumber,
      guardianName: student.guardianName,
    } : emptyValues);
    setErrors({});
    return () => previousFocus?.focus?.();
  }, [open, student]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event) {
      if (event.key === "Escape" && !busy) onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validateStudent(values);
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    setBusy(true);
    setErrors({});
    try {
      const savedStudent = await onSubmit({
        name: values.name.trim(),
        course: values.course.trim(),
        monthlyFee: Number(values.monthlyFee),
        mobileNumber: values.mobileNumber.trim(),
        guardianName: values.guardianName.trim(),
      });
      onSaved(savedStudent);
    } catch (error) {
      if (error?.response?.data?.fields) {
        setErrors(error.response.data.fields);
      } else {
        onError(getApiError(error));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onCancel();
    }}>
      <section className="student-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="student-form-title">
        <div className="modal-heading">
          <div>
            <h2 id="student-form-title">{student ? "Edit student" : "Add student"}</h2>
            <p>{student ? `Update ${student.name}’s student profile.` : "Enter the student and guardian details below."}</p>
          </div>
          <button className="icon-button" type="button" aria-label="Close form" onClick={onCancel} disabled={busy}><FiX size={18} /></button>
        </div>

        <form className="form-stack student-form" noValidate onSubmit={handleSubmit}>
          <label htmlFor="student-name">Student name</label>
          <input id="student-name" name="name" value={values.name} onChange={handleChange} maxLength="120" autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "student-name-error" : undefined} required />
          {errors.name && <span className="field-error" id="student-name-error" role="alert">{errors.name}</span>}

          <label htmlFor="student-course">Course / class</label>
          <input id="student-course" name="course" value={values.course} onChange={handleChange} maxLength="100" placeholder="e.g. Class 12 Bengali" aria-invalid={Boolean(errors.course)} aria-describedby={errors.course ? "student-course-error" : undefined} required />
          {errors.course && <span className="field-error" id="student-course-error" role="alert">{errors.course}</span>}

          <div className="student-form-row">
            <div className="student-field">
              <label htmlFor="student-mobile">Mobile number</label>
              <input id="student-mobile" name="mobileNumber" type="tel" inputMode="tel" value={values.mobileNumber} onChange={handleChange} maxLength="30" autoComplete="tel" aria-invalid={Boolean(errors.mobileNumber)} aria-describedby={errors.mobileNumber ? "student-mobile-error" : undefined} required />
              {errors.mobileNumber && <span className="field-error" id="student-mobile-error" role="alert">{errors.mobileNumber}</span>}
            </div>
            <div className="student-field">
              <label htmlFor="student-monthly-fee">Monthly fee (INR)</label>
              <input id="student-monthly-fee" name="monthlyFee" type="number" min="0" max="1000000" step="0.01" value={values.monthlyFee} onChange={handleChange} aria-invalid={Boolean(errors.monthlyFee)} aria-describedby={errors.monthlyFee ? "student-fee-error" : undefined} required />
              {errors.monthlyFee && <span className="field-error" id="student-fee-error" role="alert">{errors.monthlyFee}</span>}
            </div>
          </div>

          <label htmlFor="student-guardian">Guardian name</label>
          <input id="student-guardian" name="guardianName" value={values.guardianName} onChange={handleChange} maxLength="120" aria-invalid={Boolean(errors.guardianName)} aria-describedby={errors.guardianName ? "student-guardian-error" : undefined} required />
          {errors.guardianName && <span className="field-error" id="student-guardian-error" role="alert">{errors.guardianName}</span>}

          <div className="student-form-actions">
            <button className="secondary-button" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
            <button className="primary-button" type="submit" disabled={busy}>{busy ? "Saving…" : student ? "Save changes" : "Add student"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
