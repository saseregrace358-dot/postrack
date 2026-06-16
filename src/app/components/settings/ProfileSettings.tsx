import { useEffect, useState } from "react";
import { User } from "lucide-react";

interface Props {
  expanded: string | null;
  toggleSection: (section: string) => void;
  user: any;
  setUser: React.Dispatch<any>;
}

export function ProfileSettings({
  expanded,
  toggleSection,
}: Props) {
  const isOpen = expanded === "profile";

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const res = await fetch("http://localhost:8000/users/me");
      const data = await res.json();

      setProfile(data);
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border">

      {/* HEADER */}
      <button
        onClick={() => toggleSection("profile")}
        className="w-full p-4 flex justify-between items-center"
      >
        <div className="flex items-center gap-3">
          <User size={20} />
          <span>Profile</span>
        </div>

        <span>{isOpen ? "−" : "›"}</span>
      </button>

      {/* CONTENT */}
      {isOpen && (
        <div className="p-4 border-t">

          {loading ? (
            <p className="text-sm text-gray-500">Loading profile...</p>
          ) : profile ? (
            <div className="space-y-4">

              {/* Avatar */}
              <div className="flex items-center gap-3">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt="Avatar"
                    className="w-14 h-14 rounded-full object-cover border"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center">
                    <User />
                  </div>
                )}

                <div>
                  <p className="font-semibold">{profile.name}</p>
                  <p className="text-sm text-gray-500">{profile.role}</p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">

                <p>
                  <span className="font-medium">Email:</span>{" "}
                  {profile.email}
                </p>

                <p>
                  <span className="font-medium">Phone:</span>{" "}
                  {profile.phone}
                </p>

                <p>
                  <span className="font-medium">Address:</span>{" "}
                  {profile.address}
                </p>

                <p>
                  <span className="font-medium">Branch:</span>{" "}
                  {profile.branch}
                </p>

                <p>
                  <span className="font-medium">Role:</span>{" "}
                  {profile.role}
                </p>

              </div>

            </div>
          ) : (
            <p className="text-sm text-red-500">
              Failed to load profile
            </p>
          )}

        </div>
      )}
    </div>
  );
}