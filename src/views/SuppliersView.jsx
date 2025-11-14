import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function SuppliersView() {
  const [suppliers, setSuppliers] = useState([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  // 📦 Зареждане на всички доставчици
  useEffect(() => {
    loadSuppliers();
  }, []);

  async function loadSuppliers() {
    setLoading(true);
    const { data, error } = await supabase.from("suppliers").select("id, name, created_at").order("name");
    if (error) alert("Грешка при зареждане: " + error.message);
    setSuppliers(data || []);
    setLoading(false);
  }

  // ➕ Добавяне на нов доставчик
  async function addSupplier() {
    const name = newName.trim();
    if (!name) return alert("Въведете име на доставчик.");
    const { error } = await supabase.from("suppliers").insert({ name });
    if (error) return alert("Грешка при добавяне: " + error.message);
    setNewName("");
    loadSuppliers();
  }

  // ✏️ Редактиране на доставчик (на място)
  async function updateSupplier(id, name) {
    const { error } = await supabase.from("suppliers").update({ name }).eq("id", id);
    if (error) return alert("Грешка при промяна: " + error.message);
    loadSuppliers();
  }

  // ❌ Изтриване на доставчик
  async function deleteSupplier(id) {
    if (!window.confirm("Наистина ли искате да изтриете този доставчик?")) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) return alert("Грешка при изтриване: " + error.message);
    loadSuppliers();
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-blue-700 mb-4">Доставчици</h1>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Име на нов доставчик"
          className="flex-1 border rounded-xl px-3 py-2"
        />
        <button onClick={addSupplier} className="bg-blue-600 text-white px-4 py-2 rounded-xl">
           Добави
        </button>
      </div>

      {loading ? (
        <p>Зареждане...</p>
      ) : suppliers.length === 0 ? (
        <p className="text-gray-600">Няма добавени доставчици.</p>
      ) : (
        <div className="overflow-auto rounded-xl border bg-white shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-3 py-2 border-b">Име</th>
                <th className="text-left px-3 py-2 border-b">Създаден</th>
                <th className="px-3 py-2 border-b"></th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="odd:bg-white even:bg-gray-50">
                  <td className="border-b px-3 py-2">
                    <input
                      type="text"
                      value={s.name}
                      onChange={(e) =>
                        setSuppliers((prev) =>
                          prev.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x))
                        )
                      }
                      onBlur={(e) => updateSupplier(s.id, e.target.value)}
                      className="w-full border rounded px-2 py-1"
                    />
                  </td>
                  <td className="border-b px-3 py-2 text-gray-500">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                  <td className="border-b px-3 py-2 text-right">
                    <button
                      onClick={() => deleteSupplier(s.id)}
                      className="text-red-600 underline text-sm"
                    >
                      Изтрий
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
