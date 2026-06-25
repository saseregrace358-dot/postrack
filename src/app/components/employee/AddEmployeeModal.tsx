import { useEffect, useState } from "react";

interface Employee {
id?: string;
name: string;
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

const [name, setName] = useState("");
const [password, setPassword] = useState("");
const [permissions, setPermissions] = useState<string[]>([]);

const permissionOptions = [
"dashboard",
"products",
"sales",
"reports",
"staff",
"settings",
];

useEffect(() => {
document.body.style.overflow = isOpen ? "hidden" : "auto";
}, [isOpen]);

useEffect(() => {
if (editingEmployee) {
setName(editingEmployee.name || "");
setPassword(editingEmployee.password || "");
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
setName("");
setPassword("");
setPermissions([]);
};

const handleSubmit = (
e: React.FormEvent<HTMLFormElement>
) => {
e.preventDefault();


const employeeData: Employee = {
  id: editingEmployee?.id,
  name,
  password,
  permissions,
};

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

return ( <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"> <div className="bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-800 p-6 relative">


    <button
      onClick={onClose}
      className="absolute top-4 right-4 text-white text-2xl"
    >
      ✕
    </button>

    <h2 className="text-2xl font-bold text-white mb-6">
      {isEdit ? "Edit Staff" : "Add Staff"}
    </h2>

    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <Input
        label="Staff Name"
        value={name}
        setValue={setName}
      />

      <Input
        label="Password"
        value={password}
        setValue={setPassword}
        type="password"
      />

      <div>
        <label className="block text-slate-300 mb-3">
          Permissions
        </label>

        <div className="grid grid-cols-2 gap-3">
          {permissionOptions.map((permission) => (
            <label
              key={permission}
              className="flex items-center gap-3 bg-slate-800 p-3 rounded-xl cursor-pointer"
            >
              <input
                type="checkbox"
                checked={permissions.includes(permission)}
                onChange={() =>
                  togglePermission(permission)
                }
              />

              <span className="text-white capitalize">
                {permission}
              </span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 rounded-xl text-white font-semibold"
      >
        {isEdit
          ? "Update Staff"
          : "Create Staff Account"}
      </button>
    </form>
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
return ( <div> <label className="block text-slate-300 mb-2">
{label} </label>

```
  <input
    type={type}
    value={value}
    onChange={(e) => setValue(e.target.value)}
    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white"
  />
</div>


);
}

export default AddEmployeeModal;
