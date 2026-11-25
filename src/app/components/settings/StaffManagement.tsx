
import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../../../api/employee";

import EmployeeRow from "../employee/EmployeeRow";
import AddEmployeeModal from "../employee/AddEmployeeModal";

interface StaffManagementProps {
  onBack: () => void;
}

interface Employee {
  id: string | number;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  permissions: string[];
}

function StaffManagement({ onBack }: StaffManagementProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await getEmployees();

      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.employees)
          ? res.data.employees
          : null;

      if (!data) {
        console.error("Unexpected employee response:", res.data);
        throw new Error("Invalid employee response.");
      }

      setEmployees(data);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
      setError("Unable to load employees. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleAddEmployee = async (employee: any) => {
    try {
      await createEmployee(employee);
      setIsModalOpen(false);
      await fetchEmployees();
    } catch (err) {
      console.error("Failed to add employee:", err);
      alert("Failed to add employee.");
    }
  };

  const handleUpdateEmployee = async (employee: any) => {
    try {
      if (employee.id === undefined) {
        throw new Error("Employee ID is missing.");
      }

      await updateEmployee(employee.id, employee);

      setEditingEmployee(null);
      setIsModalOpen(false);

      await fetchEmployees();
    } catch (err) {
      console.error("Failed to update employee:", err);
      alert("Failed to update employee.");
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const handleDeleteEmployee = async (id: string | number) => {
    try {
      await deleteEmployee(id);

      setEmployees((prev) =>
        prev.filter((employee) => String(employee.id) !== String(id))
      );

      alert("Employee deleted successfully.");
    } catch (err) {
      console.error("Failed to delete employee:", err);
      alert("Failed to delete employee.");
    }
  };

  const getStatus = (employee: Employee) =>
    String(employee.status ?? "").trim().toLowerCase();

  const filteredEmployees = employees.filter((employee) => {
    if (activeTab === "all") return true;
    return getStatus(employee) === activeTab;
  });

  const activeCount = employees.filter(
    (employee) => getStatus(employee) === "active"
  ).length;

  const inactiveCount = employees.filter(
    (employee) => getStatus(employee) === "inactive"
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        >
          <ArrowLeft size={18} />
        </button>

        <div>
          <h2 className="text-xl md:text-3xl font-bold text-slate-900 dark:text-white">
            Staff Management
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage employees and permissions
          </p>
        </div>
      </div>

      <div className="mb-6">
        <button
          onClick={() => {
            setEditingEmployee(null);
            setIsModalOpen(true);
          }}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
        >
          <Plus size={18} />
          Add Employee
        </button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { key: "all", label: `All (${employees.length})` },
          { key: "active", label: `Active (${activeCount})` },
          { key: "inactive", label: `Inactive (${inactiveCount})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-indigo-600 text-white"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center text-slate-500">
            Loading employees...
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center">
            <p className="text-red-500 mb-3">{error}</p>
            <button
              onClick={fetchEmployees}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white"
            >
              Retry
            </button>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center">
            <p className="text-slate-500">No employees found</p>
          </div>
        ) : (
          filteredEmployees.map((employee) => (
            <EmployeeRow
              key={employee.id}
              employee={employee}
              onEditEmployee={handleEditEmployee}
              onDeleteEmployee={handleDeleteEmployee}
            />
          ))
        )}
      </div>

      <AddEmployeeModal
        isOpen={isModalOpen}
        onClose={() => {
          setEditingEmployee(null);
          setIsModalOpen(false);
        }}
        editingEmployee={editingEmployee}
        onAddEmployee={handleAddEmployee}
        onUpdateEmployee={handleUpdateEmployee}
      />
    </div>
  );
}

export default StaffManagement;
