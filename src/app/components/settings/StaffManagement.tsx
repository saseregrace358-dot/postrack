import { useState, useEffect } from "react";
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

function StaffManagement({ onBack }: StaffManagementProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

 const fetchEmployees = async () => {
  try {
    const res = await getEmployees();
    setEmployees(res.data);
  } catch (error) {
    console.log(error);
  }
};
 const handleStatusChange = async (
  employeeId: string,
  newStatus: string
) => {
  try {
    await updateEmployee(employeeId, {
      status: newStatus,
    });

    fetchEmployees();
  } catch (error) {
    console.log(error);
  }
};
    

  const handleAddEmployee = async (employee: any) => {
  try {
    await createEmployee(employee);

    setIsModalOpen(false);
    fetchEmployees();
  } catch (error) {
    console.log(error);
  }
};

const handleUpdateEmployee = async (employee: any) => {
  try {
    await updateEmployee(employee.id, employee);

    setEditingEmployee(null);
    setIsModalOpen(false);

    fetchEmployees();
  } catch (error) {
    console.log(error);
  }
};

  const handleEditEmployee = (employee: any) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const filteredEmployees = employees.filter((employee) => {
    if (activeTab === "all") return true;
    return employee.status === activeTab;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="
            p-2
            rounded-xl
            border
            border-slate-200
            dark:border-slate-800
            bg-white
            dark:bg-slate-900
          "
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

      {/* Add Staff */}
      <div className="mb-6">
        <button
          onClick={() => setIsModalOpen(true)}
          className="
            w-full md:w-auto
            flex items-center justify-center gap-2
            px-5 py-3
            rounded-xl
            bg-indigo-600
            hover:bg-indigo-700
            text-white
            font-medium
          "
        >
          <Plus size={18} />
          Add Employee
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {["all", "active", "inactive"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              px-4 py-2 rounded-xl capitalize transition-all whitespace-nowrap
              ${
                activeTab === tab
                  ? "bg-indigo-600 text-white"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              }
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Employee List */}
      <div className="space-y-4">
        {filteredEmployees.length === 0 ? (
          <div
            className="
              bg-white
              dark:bg-slate-900
              border
              border-slate-200
              dark:border-slate-800
              rounded-2xl
              p-8
              text-center
            "
          >
            <p className="text-slate-500">
              No employees found
            </p>
          </div>
        ) : (
          filteredEmployees.map((employee) => (
            <EmployeeRow
              key={employee.id}
              employee={employee}
              onStatusChange={handleStatusChange}
              onEditEmployee={handleEditEmployee}
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