import { useState } from "react";

interface Employee {
id: string;
name: string;
password: string;
permissions: string[];
}

interface Props {
employee: Employee;
onEditEmployee: (employee: Employee) => void;
onDeleteEmployee: (employeeId: string) => void;
}

function EmployeeRow({
employee,
onEditEmployee,
onDeleteEmployee,
}: Props) {
const [open, setOpen] = useState(false);

return ( <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">

  <div
    onClick={() => setOpen(!open)}
    className="p-4 flex items-center justify-between cursor-pointer"
  >
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
        {employee.name?.charAt(0).toUpperCase()}
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white">
          {employee.name}
        </h3>

        <p className="text-sm text-slate-500">
          Staff Account
        </p>
      </div>
    </div>

    <button
      onClick={(e) => {
        e.stopPropagation();
        onEditEmployee(employee);
      }}
      className="bg-indigo-600 text-white px-4 py-2 rounded-lg"
    >
      Edit
    </button>
  </div>

  {open && (
    <div className="border-t p-4 space-y-4">

      <Detail
        label="Username"
        value={employee.name}
      />

      <Detail
        label="Permissions"
        value={
          employee.permissions.length
            ? employee.permissions.join(", ")
            : "No permissions assigned"
        }
      />

      <div className="flex gap-3">
        <button
          onClick={() => onEditEmployee(employee)}
          className="flex-1 bg-blue-600 text-white py-2 rounded-xl"
        >
          Edit Employee
        </button>

        <button
          onClick={() => onDeleteEmployee(employee.id)}
          className="flex-1 bg-red-600 text-white py-2 rounded-xl"
        >
          Delete Employee
        </button>
      </div>
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
return ( <div> <p className="text-sm text-slate-500">
{label} </p>


  <p className="font-medium text-slate-900 dark:text-white">
    {value || "N/A"}
  </p>
</div>


);
}

export default EmployeeRow;
