import { useEffect, useState } from "react";

interface Employee {
id?: string;
full_name: string;
email: string;
password: string;
permissions: string[];
}

interface AddEmployeeModalProps {
isOpen: boolean;
onClose: () => void;
onAddEmployee: (employee: Employee) => void;
onUpdateEmployee: (employee: Employee) => void;
editingEmployee: Employee | null;
}

interface InputProps {
label: string;
value: string;
setValue: React.Dispatch<React.SetStateAction<string>>;
type?: string;
}

function AddEmployeeModal({
isOpen,
onClose,
onAddEmployee,
onUpdateEmployee,
editingEmployee,
}: AddEmployeeModalProps) {
const isEdit = !!editingEmployee;

const [fullName, setFullName] = useState("");
const [email, setEmail] = useState("");

const [password, setPassword] = useState("");
const [permissions, setPermissions] = useState<string[]>([]);

const permissionOptions = [
"dashboard",
"Inventory",
"sales",
"POS",
"settings",
];

useEffect(() => {
document.body.style.overflow = isOpen ? "hidden" : "auto";
}, [isOpen]);

useEffect(() => {
if (editingEmployee) {
setFullName(editingEmployee.full_name || "");
setEmail(editingEmployee.email || "");
setPassword("");
setPermissions(editingEmployee.permissions || []);
}
}, [editingEmployee]);

const togglePermission = (permission: string) => {
setPermissions((prev) =>
prev.includes(permission)
? prev.filter((p) => p !== permission)
: [...prev, permission]
);
};

const resetForm = () => {
  setFullName("");
  setEmail("");
  setPassword("");
  setPermissions([]);
};
const handleSubmit = (
e: React.FormEvent<HTMLFormElement>
) => {
e.preventDefault();


const employeeData: any = {
  id: editingEmployee?.id,
  full_name: fullName,
  email,
  permissions,
};

if (password.trim() !== "") {
  employeeData.password = password;
}

if (isEdit) {
  onUpdateEmployee(employeeData);
} else {
  onAddEmployee({
    ...employeeData,
    id: Date.now().toString(),
  });
}

resetForm();
onClose();


};

if (!isOpen) return null;

if (!isOpen) return null;

return (
  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
    <div
      className="
        relative
        w-full
        h-[95vh]
        sm:h-auto
        sm:max-h-[90vh]
        sm:max-w-2xl
        bg-white
        dark:bg-slate-900
        rounded-t-3xl
        sm:rounded-3xl
        shadow-2xl
        overflow-hidden
      "
    >
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-5 py-4 flex items-center justify-between z-10">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {isEdit ? "Edit Employee" : "Add Employee"}
          </h2>

          <p className="text-sm text-slate-500">
            {isEdit
              ? "Update employee information."
              : "Create a new employee account."}
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="overflow-y-auto h-[calc(95vh-80px)] sm:h-auto">
        <form
          onSubmit={handleSubmit}
          className="space-y-6 p-5"
        >
          <Input
            label="Full Name"
            value={fullName}
            setValue={setFullName}
          />

          <Input
            label="Email Address"
            value={email}
            setValue={setEmail}
            type="email"
          />

          <Input
            label="Password"
            value={password}
            setValue={setPassword}
            type="password"
          />

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-3">
              Permissions
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {permissionOptions.map((permission) => (
                <label
                  key={permission}
                  className={`cursor-pointer rounded-xl border p-4 transition flex items-center gap-3 ${
                    permissions.includes(permission)
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : "border-slate-200 dark:border-slate-700 hover:border-green-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={permissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                    className="h-4 w-4 accent-green-600"
                  />

                  <span className="capitalize text-slate-700 dark:text-white">
                    {permission}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto rounded-xl border border-slate-300 dark:border-slate-700 px-5 py-3"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="w-full sm:w-auto rounded-xl bg-green-600 hover:bg-green-700 px-6 py-3 text-white font-semibold"
            >
              {isEdit ? "Update Employee" : "Create Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
);
}
function Input({
  label,
  value,
  setValue,
  type = "text",
}: InputProps) {
  return (
    <div>
      <label className="block mb-2 font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="
          w-full
          rounded-xl
          border
          border-slate-300
          dark:border-slate-700
          bg-white
          dark:bg-slate-800
          px-4
          py-3
          text-slate-900
          dark:text-white
          focus:border-green-500
          focus:ring-2
          focus:ring-green-500
          outline-none
          transition
        "
      />
    </div>
  );
}
export default AddEmployeeModal;