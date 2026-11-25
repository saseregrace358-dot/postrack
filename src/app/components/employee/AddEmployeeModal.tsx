
import { useEffect, useState } from "react";
import type { FormEvent, Dispatch, SetStateAction } from "react";

interface Employee {
  id?: string | number;
  full_name: string;
  email: string;
  phone?: string;
  password?: string;
  role: string;
  status: string;
  permissions: string[];
}

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEmployee: (employee: Employee) => void | Promise<void>;
  onUpdateEmployee: (employee: Employee) => void | Promise<void>;
  editingEmployee: Employee | null;
}

interface TextFieldProps {
  label: string;
  value: string;
  setValue: Dispatch<SetStateAction<string>>;
  type?: string;
  placeholder?: string;
  required?: boolean;
}

function AddEmployeeModal({
  isOpen,
  onClose,
  onAddEmployee,
  onUpdateEmployee,
  editingEmployee,
}: AddEmployeeModalProps) {
  const isEdit = Boolean(editingEmployee);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const permissionOptions = [
    "dashboard",
    "Inventory",
    "sales",
    "POS",
    "settings",
  ];

  useEffect(() => {
    if (!isOpen) return;

    if (editingEmployee) {
      setFullName(editingEmployee.full_name || "");
      setEmail(editingEmployee.email || "");
      setPhone(editingEmployee.phone || "");
      setPassword("");
      setRole(editingEmployee.role || "");
      setStatus(
        editingEmployee.status?.trim().toLowerCase() === "inactive"
          ? "inactive"
          : "active"
      );
      setPermissions(editingEmployee.permissions || []);
    } else {
      resetForm();
    }
  }, [editingEmployee, isOpen]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setRole("");
    setStatus("active");
    setPermissions([]);
  };

  const togglePermission = (permission: string) => {
    setPermissions((previous) =>
      previous.includes(permission)
        ? previous.filter((item) => item !== permission)
        : [...previous, permission]
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) return;

    if (!fullName.trim()) {
      alert("Full name is required.");
      return;
    }

    if (!email.trim()) {
      alert("Email address is required.");
      return;
    }

    if (!role.trim()) {
      alert("Employee role is required.");
      return;
    }

    if (!isEdit && !password.trim()) {
      alert("Password is required.");
      return;
    }

    setLoading(true);

    try {
      const employeeData: Employee = {
        id: editingEmployee?.id,
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role: role.trim(),
        status,
        permissions,
        ...(password.trim() ? { password: password.trim() } : {}),
      };

      if (isEdit) {
        await onUpdateEmployee(employeeData);
      } else {
        await onAddEmployee(employeeData);
      }

      resetForm();
      onClose();
    } catch (error) {
      console.error("Employee save error:", error);
      alert("Failed to save employee. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const fieldClass =
    "w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-white outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500";

  const labelClass =
    "block mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3 sm:p-6">
      <div className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {isEdit ? "Edit Employee" : "Add Employee"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isEdit
                ? "Update employee information."
                : "Create a new employee account."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close modal"
            className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">

            <TextField
              label="Full Name"
              value={fullName}
              setValue={setFullName}
              placeholder="Enter employee's full name"
              required
            />

            <TextField
              label="Email Address"
              value={email}
              setValue={setEmail}
              type="email"
              placeholder="Enter employee's email address"
              required
            />

            <TextField
              label="Phone Number"
              value={phone}
              setValue={setPhone}
              type="tel"
              placeholder="Enter employee's phone number"
            />

            <TextField
              label={isEdit ? "New Password (Optional)" : "Password"}
              value={password}
              setValue={setPassword}
              type="password"
              placeholder={
                isEdit
                  ? "Leave blank to keep current password"
                  : "Create employee password"
              }
              required={!isEdit}
            />

            {/* Free-text role input */}
            <div>
              <label htmlFor="employee-role" className={labelClass}>
                Employee Role
              </label>
              <input
                id="employee-role"
                type="text"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                placeholder="e.g. Branch Manager, Sales Officer, Accountant"
                required
                className={fieldClass}
              />
              <p className="mt-1 text-xs text-slate-500">
                Enter any job title for this employee.
              </p>
            </div>

            {/* Employee status */}
            <div>
              <label htmlFor="employee-status" className={labelClass}>
                Employee Status
              </label>
              <select
                id="employee-status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as "active" | "inactive")
                }
                className={fieldClass}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Inactive employees cannot log in to DGTrack.
              </p>
            </div>

            {/* Permissions */}
            <div>
              <label className={labelClass}>
                Employee Permissions
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {permissionOptions.map((permission) => (
                  <label
                    key={permission}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                      permissions.includes(permission)
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : "border-slate-200 hover:border-green-400 dark:border-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={permissions.includes(permission)}
                      onChange={() => togglePermission(permission)}
                      className="h-5 w-5 accent-green-600"
                    />
                    <span className="text-sm capitalize text-slate-700 dark:text-white">
                      {permission}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-300 px-6 py-3 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-white dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Saving..."
                : isEdit
                  ? "Update Employee"
                  : "Create Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  setValue,
  type = "text",
  placeholder,
  required = false,
}: TextFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full min-h-[48px] rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}

export default AddEmployeeModal;
