import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function ProjectsView() {
  const [projects, setProjects] = useState([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  // 🧭 Зареждаме проектите
  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    else setProjects(data || []);
  }

  // ➕ Добавяне на проект
  async function addProject() {
    if (!newName.trim()) return alert("Въведете име на проект");
    setLoading(true);
    const { error } = await supabase
      .from("projects")
      .insert([{ name: newName.trim(), active: true }]);
    setLoading(false);
    if (error) alert(error.message);
    else {
      setNewName("");
      await loadProjects();
    }
  }

  // 💾 Редактиране на име
  async function updateName(id, name) {
    const { error } = await supabase
      .from("projects")
      .update({ name })
      .eq("id", id);
    if (error) alert("Грешка при промяна: " + error.message);
  }

  // 🔄 Промяна на статус (активен/неактивен)
  async function toggleActive(id, active) {
    const { error } = await supabase
      .from("projects")
      .update({ active: !active })
      .eq("id", id);
    if (error) alert(error.message);
    else await loadProjects();
  }

  // ❌ Изтриване
  async function deleteProject(id) {
    if (!window.confirm("Сигурни ли сте, че искате да изтриете този проект?")) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) alert(error.message);
    else await loadProjects();
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-blue-700 mb-4">Проекти</h1>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Име на проект"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 border rounded-xl px-3 py-2"
        />
        <button
          onClick={addProject}
          disabled={loading}
          className="bg-blue-600 text-white rounded-xl px-4 py-2"
        >
           Добави
        </button>
      </div>

      <div className="bg-white rounded-xl shadow divide-y">
        {projects.map((p) => (
          <div key={p.id} className="flex flex-col md:flex-row md:items-center justify-between p-3">
            <input
              type="text"
              value={p.name}
              onChange={(e) =>
                setProjects((prev) =>
                  prev.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x))
                )
              }
              onBlur={() => updateName(p.id, p.name)}
              className="border rounded-xl px-3 py-1 flex-1"
            />
            <div className="flex gap-2 mt-2 md:mt-0">
              <button
                onClick={() => toggleActive(p.id, p.active)}
                className={`px-3 py-1 rounded-xl border ${
                  p.active
                    ? "bg-green-100 text-green-700 border-green-400"
                    : "bg-gray-100 text-gray-600 border-gray-300"
                }`}
              >
                {p.active ? "Активен" : "Неактивен"}
              </button>
              <button
                onClick={() => deleteProject(p.id)}
                className="px-3 py-1 rounded-xl border border-red-400 text-red-600 hover:bg-red-50"
              >
                Изтрий
              </button>
            </div>
          </div>
        ))}

        {projects.length === 0 && (
          <div className="text-center text-gray-500 py-6">Няма добавени проекти.</div>
        )}
      </div>
    </div>
  );
}
