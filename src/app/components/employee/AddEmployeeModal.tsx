
import { useEffect, useState } from "react";

interface Employee {
  id?: string;
  name: string;
  age: string;
  sex: string;
  email: string;
  phone: string;
  address: string;
  stateOfOrigin: string;
  position: string;
  dateOfEmployment: string;
  status: string;
  performance: string;
  salaryRange: string;
  avatar: string;
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
  disabled?: boolean;
}

interface SelectProps {
  label: string;
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  options: string[];
  disabled?: boolean;
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
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("Male");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [stateOfOrigin, setStateOfOrigin] = useState("");
  const [position, setPosition] = useState("");
  const [dateOfEmployment, setDateOfEmployment] = useState("");
  const [status, setStatus] = useState("active");
  const [performance, setPerformance] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [avatar, setAvatar] = useState("");

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
  }, [isOpen]);

  useEffect(() => {
    if (editingEmployee) {
      setName(editingEmployee.name || "");
      setAge(editingEmployee.age || "");
      setSex(editingEmployee.sex || "Male");
      setEmail(editingEmployee.email || "");
      setPhone(editingEmployee.phone || "");
      setAddress(editingEmployee.address || "");
      setStateOfOrigin(editingEmployee.stateOfOrigin || "");
      setPosition(editingEmployee.position || "");
      setDateOfEmployment(editingEmployee.dateOfEmployment || "");
      setStatus(editingEmployee.status || "active");
      setPerformance(editingEmployee.performance || "");
      setSalaryRange(editingEmployee.salaryRange || "");
      setAvatar(editingEmployee.avatar || "");
    }
  }, [editingEmployee]);

  if (!isOpen) return null;

  const handleAvatarUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setAvatar(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setName("");
    setAge("");
    setSex("Male");
    setEmail("");
    setPhone("");
    setAddress("");
    setStateOfOrigin("");
    setPosition("");
    setDateOfEmployment("");
    setStatus("active");
    setPerformance("");
    setSalaryRange("");
    setAvatar("");
  };

  const handleSubmit = (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const employeeData: Employee = {
      id: editingEmployee?.id,
      name,
      age,
      sex,
      email,
      phone,
      address,
      stateOfOrigin,
      position,
      dateOfEmployment,
      status,
      performance,
      salaryRange,
      avatar,
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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 p-6 relative">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white text-2xl"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold text-white mb-6">
          {isEdit ? "Edit Employee" : "Add Employee"}
        </h2>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div className="flex flex-col items-center gap-4">
            {avatar ? (
              <img
                src={avatar}
                alt="avatar"
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                {name?.charAt(0) || "?"}
              </div>
            )}

            <label className="cursor-pointer bg-indigo-600 text-white px-4 py-2 rounded-xl">
              Upload Avatar
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Full Name" value={name} setValue={setName} disabled={isEdit} />
            <Input label="Age" value={age} setValue={setAge} disabled={isEdit} />
            <Select label="Sex" value={sex} setValue={setSex} options={["Male", "Female"]} disabled={isEdit} />
            <Input label="Email" value={email} setValue={setEmail} disabled={isEdit} />
            <Input label="Phone" value={phone} setValue={setPhone} disabled={isEdit} />
            <Input label="Address" value={address} setValue={setAddress} disabled={isEdit} />
            <Input label="State of Origin" value={stateOfOrigin} setValue={setStateOfOrigin} disabled={isEdit} />
            <Input label="Date of Employment" type="date" value={dateOfEmployment} setValue={setDateOfEmployment} disabled={isEdit} />

            <Input label="Position" value={position} setValue={setPosition} />
            <Select label="Status" value={status} setValue={setStatus} options={["active", "inactive"]} />
            <Input label="Performance (%)" value={performance} setValue={setPerformance} />
            <Input label="Salary Range" value={salaryRange} setValue={setSalaryRange} />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 rounded-xl text-white font-semibold"
          >
            {isEdit ? "Update Employee" : "Add Employee"}
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
  disabled = false,
}: InputProps) {
  return (
    <div>
      <label className="block text-slate-300 mb-2">
        {label}
      </label>

      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white"
      />
    </div>
  );
}

function Select({
  label,
  value,
  setValue,
  options,
  disabled = false,
}: SelectProps) {
  return (
    <div>
      <label className="block text-slate-300 mb-2">
        {label}
      </label>

      <select
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export default AddEmployeeModal;

