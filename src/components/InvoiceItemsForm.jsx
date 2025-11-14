import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function normalizeName(name) {
  return name.trim().toLowerCase().replace(/[.,\s]+/g, " ");
}

export default function InvoiceItemsForm({ invoiceId, onDone }) {
  const [projects, setProjects] = useState([]);
  const [items, setItems] = useState([
    { id: Math.random(), name: "", qty: "", unitPrice: "", projectId: "" },
  ]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("projects")
        .select("id,name")
        .eq("active", true)
        .order("name");
      setProjects(data || []);
    })();
  }, []);

  function addRow() {
    setItems((prev) => [
      ...prev,
      { id: Math.random(), name: "", qty: "", unitPrice: "", projectId: "" },
    ]);
  }
  function removeRow(id) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }
  function updateItem(id, field, value) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  }

  async function handleSave() {
    for (const it of items) {
      if (!it.name.trim()) return alert("Въведете име на стока");
      if (!it.projectId) return alert("Изберете проект");

      const normalized = normalizeName(it.name);

      // търсим продукт по нормализирано име
      let { data: existing } = await supabase
        .from("products")
        .select("id")
        .ilike("normalized_name", normalized)
        .maybeSingle();

      let productId = existing?.id;
      if (!productId) {
        // създаваме нов продукт
        const { data: newProd, error: errCreate } = await supabase
          .from("products")
          .insert({ name: it.name.trim(), normalized_name: normalized })
          .select()
          .single();
        if (errCreate) return alert(errCreate.message);
        productId = newProd.id;
      }

      const { error: errItem } = await supabase.from("invoice_items").insert({
        invoice_id: invoiceId,
        product_id: productId,
        project_id: it.projectId,
        quantity: parseFloat(it.qty || 0),
        unit_price: parseFloat(it.unitPrice || 0),
      });
      if (errItem) return alert(errItem.message);
    }
    alert("Артикулите са записани успешно!");
    onDone(); // връща към списъка
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="text-lg font-bold text-blue-700 mb-3">
        Добавяне на артикули към фактура
      </h2>

      <div className="space-y-4">
        {items.map((it) => (
          <div key={it.id} className="rounded-xl border p-3 bg-white shadow-sm">
            <input
              className="w-full border rounded-xl px-3 py-2 mb-2"
              placeholder="Име на стока"
              value={it.name}
              onChange={(e) => updateItem(it.id, "name", e.target.value)}
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                className="border rounded-xl px-3 py-2"
                placeholder="Количество"
                value={it.qty}
                onChange={(e) => updateItem(it.id, "qty", e.target.value)}
              />
              <input
                type="number"
                className="border rounded-xl px-3 py-2"
                placeholder="Ед. цена (€)"
                value={it.unitPrice}
                onChange={(e) => updateItem(it.id, "unitPrice", e.target.value)}
              />
              <select
                className="border rounded-xl px-3 py-2"
                value={it.projectId}
                onChange={(e) => updateItem(it.id, "projectId", e.target.value)}
              >
                <option value="">Проект…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-2 text-right">
              <button onClick={() => removeRow(it.id)} className="text-sm text-red-600">
                Премахни
              </button>
            </div>
          </div>
        ))}

        <div className="flex justify-between mt-3">
          <button onClick={addRow} className="rounded-xl border px-4 py-2 bg-white">
             Добави ред
          </button>
          <button onClick={handleSave} className="rounded-xl bg-blue-600 text-white px-4 py-2">
            Запиши всички
          </button>
        </div>
      </div>
    </div>
  );
}

