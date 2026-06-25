import { useState } from "react";

interface Employee {
  id: string;
  fullName: string;
  position: string;
  status: string;
  avatar?: string;
  performance?: string;
  salaryRange?: string;
  age?: string;
  sex?: string;
  email?: string;
  phone?: string;
  address?: string;
  stateOfOrigin?: string;
  employmentDate?: string;
}

interface Props {
  employee: Employee;
  onStatusChange: (
    employeeId: string,
    status: string
  ) => void;
  onEditEmployee: (
    employee: Employee
  ) => void;
}

function EmployeeRow({
  employee,
  onStatusChange,
  onEditEmployee,
}: Props) {
  const [open, setOpen] = useState(false);
  const [previewImage, setPreviewImage] =
    useState<string | null>(null);

  const [zoom, setZoom] = useState(1);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">

      {/* Header */}
      <div
        onClick={() => setOpen(!open)}
        className="p-4 flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-3">

          {employee.avatar ? (
            <img
              src={employee.avatar}
              alt={employee.fullName}
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
              {employee.fullName?.charAt(0)}
            </div>
          )}

          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {employee.fullName}
            </h3>

            <p className="text-sm text-slate-500">
              {employee.position}
            </p>
          </div>

        </div>

        <select
          value={employee.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) =>
            onStatusChange(
              employee.id,
              e.target.value
            )
          }
          className="px-3 py-2 rounded-xl text-sm"
        >
          <option value="active">
            Active
          </option>

          <option value="inactive">
            Inactive
          </option>
        </select>
      </div>

      {/* Expanded */}
      {open && (
        <div className="border-t p-4 space-y-3">

          <button
            onClick={() =>
              onEditEmployee(employee)
            }
            className="w-full bg-indigo-600 text-white py-2 rounded-xl"
          >
            Edit Employee
          </button>

          <Detail
            label="Email"
            value={employee.email}
          />

          <Detail
            label="Phone"
            value={employee.phone}
          />

          <Detail
            label="Age"
            value={employee.age}
          />

          <Detail
            label="Sex"
            value={employee.sex}
          />

          <Detail
            label="Address"
            value={employee.address}
          />

          <Detail
            label="State Of Origin"
            value={
              employee.stateOfOrigin
            }
          />

          <Detail
            label="Performance"
            value={`${employee.performance || 0}%`}
          />

          <Detail
            label="Salary"
            value={employee.salaryRange}
          />

        </div>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
          onClick={() =>
            setPreviewImage(null)
          }
        >
          <div className="absolute top-5 right-5 flex gap-2">

            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoom(
                  (z) =>
                    Math.min(z + 0.2, 3)
                );
              }}
              className="bg-white px-3 py-1 rounded"
            >
              +
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoom(
                  (z) =>
                    Math.max(z - 0.2, 1)
                );
              }}
              className="bg-white px-3 py-1 rounded"
            >
              -
            </button>

          </div>

          <img
            src={previewImage}
            style={{
              transform: `scale(${zoom})`,
            }}
            className="max-w-[90%] max-h-[90%]"
          />
        </div>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div>
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="font-medium text-slate-900 dark:text-white break-words">
        {value || "N/A"}
      </p>
    </div>
  );
}

export default EmployeeRow;