
import { useState } from "react";
import {
  Mail,
  Phone,
  Shield,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
} from "lucide-react";

interface Employee {
  id: string | number;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  permissions: string[];
}

interface Props {
  employee: Employee;
  onEditEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employeeId: string | number) => void;
}

export default function EmployeeRow({
  employee,
  onEditEmployee,
  onDeleteEmployee,
}: Props) {
  const [open, setOpen] = useState(false);

  const normalizedStatus = String(employee.status ?? "")
    .trim()
    .toLowerCase();

  const isActive = normalizedStatus === "active";
  const isInactive = normalizedStatus === "inactive";

  const statusLabel = isActive
    ? "Active"
    : isInactive
      ? "Inactive"
      : "Unknown";

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div
        onClick={() => setOpen(!open)}
        className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-lg">
            {employee.full_name?.charAt(0).toUpperCase() || "E"}
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {employee.full_name}
            </h3>
            <p className="text-sm text-slate-500">
              {employee.role || "Employee"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`text-xs px-3 py-1 rounded-full font-medium ${
              isActive
                ? "bg-green-100 text-green-700"
                : isInactive
                  ? "bg-red-100 text-red-700"
                  : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {statusLabel}
          </span>

          {open ? (
            <ChevronUp className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-500" />
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-200 dark:border-slate-700 p-5 space-y-5">
          <Detail
            icon={<Mail size={16} />}
            label="Email"
            value={employee.email}
          />

          <Detail
            icon={<Phone size={16} />}
            label="Phone"
            value={employee.phone || "Not provided"}
          />

          <Detail
            icon={<Shield size={16} />}
            label="Role"
            value={employee.role || "Employee"}
          />

          <Detail
            icon={<BadgeCheck size={16} />}
            label="Status"
            value={statusLabel}
          />

          <div>
            <p className="text-sm text-slate-500 mb-2">Permissions</p>
            <div className="flex flex-wrap gap-2">
              {employee.permissions?.length ? (
                employee.permissions.map((permission) => (
                  <span
                    key={permission}
                    className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium"
                  >
                    {permission}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 text-sm">
                  No permissions assigned
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditEmployee(employee);
              }}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl transition"
            >
              <Pencil size={18} />
              Edit
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteEmployee(employee.id);
              }}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl transition"
            >
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-green-600 mt-1">{icon}</div>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="font-medium text-slate-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );
}
