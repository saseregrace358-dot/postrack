import { useState, useEffect } from "react";
import { Lock, Users, Shield, UserCog, User } from "lucide-react";

interface Props {
  expanded: string | null;
  toggleSection: (section: string) => void;
  user?: any;
}

export function PrivacySettings({
  expanded,
  toggleSection,
  user,
}: Props) {
  const isOpen = expanded === "privacy";

  const [openTab, setOpenTab] = useState<
    "security" | "staff" | "roles" | "accounts"
  >("security");

  const [currentUserRole, setCurrentUserRole] = useState("admin");

  const [staff, setStaff] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const isAdmin =
    user?.role === "admin" || currentUserRole === "admin";

  useEffect(() => {
    if (isOpen) {
      fetch("http://localhost:8000/staff")
        .then((res) => res.json())
        .then(setStaff)
        .catch(console.error);

      fetch("http://localhost:8000/users")
        .then((res) => res.json())
        .then(setUsers)
        .catch(console.error);
    }
  }, [isOpen]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border">

      {/* HEADER */}
      <button
        onClick={() => toggleSection("privacy")}
        className="w-full p-4 flex justify-between"
      >
        <div className="flex items-center gap-3">
          <Lock size={20} />
          Privacy & Security
        </div>

        <span>{isOpen ? "−" : "›"}</span>
      </button>

      {/* CONTENT */}
      {isOpen && (
        <div className="border-t">

          {/* TAB HEADER */}
          <div className="flex gap-2 p-3 border-b bg-slate-50 dark:bg-slate-900">

            <button
              onClick={() => setOpenTab("security")}
              className="px-3 py-1 text-sm rounded bg-blue-600 text-white"
            >
              Security
            </button>

            <button
              onClick={() => setOpenTab("staff")}
              className="px-3 py-1 text-sm"
            >
              Staff
            </button>

            <button
              onClick={() => setOpenTab("roles")}
              className="px-3 py-1 text-sm"
            >
              Roles
            </button>

            <button
              onClick={() => setOpenTab("accounts")}
              className="px-3 py-1 text-sm"
            >
              Accounts
            </button>
          </div>

          {/* BODY */}
          <div className="p-4 space-y-4">

            {/* SECURITY */}
            {openTab === "security" && (
              <div className="space-y-3">
                <label className="flex justify-between">
                  Two Factor Authentication
                  <input type="checkbox" />
                </label>

                <label className="flex justify-between">
                  Require PIN Before Sale
                  <input type="checkbox" />
                </label>

                <label className="flex justify-between">
                  Auto Logout
                  <input type="checkbox" />
                </label>
              </div>
            )}

            {/* STAFF (ADMIN ONLY) */}
            {openTab === "staff" && isAdmin && (
              <div className="space-y-2">
                {staff.map((s) => (
                  <div
                    key={s.id}
                    className="flex justify-between border p-2 rounded"
                  >
                    <div>
                      <p>{s.email}</p>
                      <p className="text-xs text-gray-500">
                        {s.role} • PIN: {s.pin}
                      </p>
                    </div>

                    <button className="text-red-500 text-sm">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ROLES */}
            {openTab === "roles" && (
              <div className="space-y-2 text-sm">
                <p className="font-semibold">Role Permissions</p>

                {["admin", "manager", "cashier"].map((role) => (
                  <div key={role} className="border p-2 rounded">
                    <p className="font-medium">{role}</p>

                    {["dashboard", "sales", "inventory"].map((page) => (
                      <label
                        key={page}
                        className="flex justify-between text-sm"
                      >
                        {page}
                        <input type="checkbox" />
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* ACCOUNTS */}
            {openTab === "accounts" && (
              <div className="space-y-2">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex justify-between border p-2 rounded"
                  >
                    <div>
                      <p>{u.email}</p>
                      <p className="text-xs text-gray-500">
                        {u.role}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button className="text-blue-500 text-sm">
                        Edit
                      </button>
                      <button className="text-red-500 text-sm">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}