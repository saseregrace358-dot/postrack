import { Globe } from "lucide-react";

interface Props {
  expanded: string | null;
  toggleSection: (section: string) => void;
}

export function LanguageSettings({
  expanded,
  toggleSection,
}: Props) {
  const isOpen = expanded === "language";

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border">

      <button
        onClick={() => toggleSection("language")}
        className="w-full p-4 flex justify-between"
      >
        <div className="flex items-center gap-3">
          <Globe size={20} />
          Language
        </div>

        <span>{isOpen ? "−" : "›"}</span>
      </button>

      {isOpen && (
        <div className="p-4 border-t">

          <select className="w-full border rounded p-2">
            <option>English</option>
            <option>French</option>
            <option>Spanish</option>
            <option>Yoruba</option>
            <option>Hausa</option>
            <option>Igbo</option>
          </select>

        </div>
      )}
    </div>
  );
}