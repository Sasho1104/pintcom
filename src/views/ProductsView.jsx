import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function ProductsView() {
  const [products, setProducts] = useState([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name", { ascending: true });
    if (!error) setProducts(data || []);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function addProduct() {
    const name = newName.trim();
    if (!name) return alert("Въведете име на продукта");

    const normalized = normalize(name);
    const existing = products.find(
      (p) => normalize(p.name) === normalized
    );
    if (existing) {
      alert("Такъв продукт вече съществува: " + existing.name);
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("products").insert({ name });
    setLoading(false);
    if (error) alert(error.message);
    else {
      setNewName("");
      loadProducts();
    }
  }

  async function saveEdit(id) {
    const name = editValue.trim();
    if (!name) return alert("Името не може да е празно");
    const normalized = normalize(name);
    const duplicate = products.find(
      (p) => p.id !== id && normalize(p.name) === normalized
    );
    if (duplicate) return alert("Такъв продукт вече съществува.");

    const { error } = await supabase
      .from("products")
      .update({ name })
      .eq("id", id);
    if (error) alert(error.message);
    else {
      setEditingId(null);
      loadProducts();
    }
  }

  async function deleteProduct(id, name) {
    if (!confirm(`Сигурен ли си, че искаш да изтриеш продукта "${name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) alert("Грешка при изтриване: " + error.message);
    else loadProducts();
  }

  function normalize(str) {
    return str
      .toLowerCase()
      .replace(/[.\s\-]/g, "")
      .replace("винтчета", "винт")
      .replace("кутия", "")
      .trim();
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-blue-700 mb-4">
        Продукти
      </h1>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Име на нов продукт"
          className="flex-1 border rounded-xl px-3 py-2"
        />
        <button
          onClick={addProduct}
          disabled={loading}
          className="bg-blue-600 text-white rounded-xl px-4 py-2 disabled:opacity-50"
        >
          Добави
        </button>
      </div>

      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-3 py-2 text-left w-3/5">Име</th>
            <th className="border px-3 py-2 text-center w-2/5">Действие</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="odd:bg-white even:bg-gray-50">
              <td className="border px-3 py-2">
                {editingId === p.id ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="border rounded px-2 py-1 w-full"
                  />
                ) : (
                  p.name
                )}
              </td>
              <td className="border px-3 py-2 text-center space-x-2">
                {editingId === p.id ? (
                  <button
                    className="text-blue-600"
                    onClick={() => saveEdit(p.id)}
                  >
                    Запази
                  </button>
                ) : (
                  <button
                    className="text-blue-600"
                    onClick={() => {
                      setEditingId(p.id);
                      setEditValue(p.name);
                    }}
                  >
                    Редактирай
                  </button>
                )}
                <button
                  className="text-red-600"
                  onClick={() => deleteProduct(p.id, p.name)}
                >
                  Изтрий
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}



