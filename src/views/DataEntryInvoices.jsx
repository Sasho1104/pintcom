import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function DataEntryInvoices({ profile }) {
  const [projects, setProjects] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [number, setNumber] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierId, setSupplierId] = useState(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [totalCost, setTotalCost] = useState("");
  const [items, setItems] = useState([
    { id: Math.random(), product_name: "", product_id: null, qty: "", unit_price: "", project_id: "" },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: pro } = await supabase.from("projects").select("id, name").eq("active", true).order("name");
      const { data: prod } = await supabase.from("products").select("id, name").order("name");
      const { data: supp } = await supabase.from("suppliers").select("id, name").order("name");
      setProjects(pro || []);
      setProducts(prod || []);
      setSuppliers(supp || []);
    })();
  }, []);

  function addRow() {
    setItems([...items, { id: Math.random(), product_name: "", product_id: null, qty: "", unit_price: "", project_id: "" }]);
  }

  function removeRow(id) {
    setItems(items.filter((x) => x.id !== id));
  }

  function updateItem(id, patch) {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  async function addNewProduct(it) {
    const name = it.product_name.trim();
    if (!name) return;
    const { data, error } = await supabase.from("products").insert({ name }).select().single();
    if (error) return alert("Грешка при добавяне на продукт: " + error.message);
    setProducts((prev) => [...prev, data]);
    updateItem(it.id, { product_id: data.id, product_name: data.name });
  }

  async function addNewSupplier() {
    const name = supplierName.trim();
    if (!name) return;
    const { data, error } = await supabase.from("suppliers").insert({ name }).select().single();
    if (error) return alert("Грешка при добавяне на доставчик: " + error.message);
    setSuppliers((prev) => [...prev, data]);
    setSupplierId(data.id);
    alert(`Добавен е нов доставчик: ${data.name}`);
  }

  // 💾 Запис на фактура
  async function saveInvoice() {
    if (!number.trim()) return alert("Въведете номер на фактура");
    if (!supplierName.trim()) return alert("Въведете доставчик");
    if (!totalCost) return alert("Въведете обща стойност");

    // Проверка дали вече съществува фактура със същия номер
    const { data: existing } = await supabase
      .from("invoices")
      .select("id, number")
      .eq("number", number.trim());

    if (existing && existing.length > 0) {
      const confirmOverwrite = window.confirm(
        `Вече съществува фактура с номер "${number.trim()}". Искате ли все пак да я запишете?`
      );
      if (!confirmOverwrite) return;
    }

    // Проверка за всяка стока
    for (const it of items) {
      if (!it.product_name.trim()) return alert("Въведете име на продукт");
      if (!it.project_id) return alert("Изберете проект");
    }

    // Проверка за сума на редовете
    const rowsSum = items.reduce(
      (acc, it) => acc + (parseFloat(it.qty || 0) * parseFloat(it.unit_price || 0)),
      0
    );
    const diff = Math.abs(rowsSum - parseFloat(totalCost || 0));
    if (diff > 0.01) {
      const proceed = window.confirm(
        `Общата стойност на продуктите (${rowsSum.toFixed(2)} €) не съвпада с въведената обща сума (${Number(totalCost || 0).toFixed(2)} €). Желаете ли да продължите?`
      );
      if (!proceed) return;
    }

    const preparedItems = items.map((it) => ({
      ...it,
      qty: parseFloat(it.qty || 0),
      unit_price: parseFloat(it.unit_price || 0),
    }));

    const payload = {
      number: number.trim(),
      supplier: supplierName.trim(),
      supplier_id: supplierId,
      date,
      total_cost: parseFloat(totalCost),
      created_by: profile.id,
      items: preparedItems,
    };

    setSaving(true);
    const { error } = await supabase.from("invoices").insert(payload);
    setSaving(false);

    if (error) alert("Грешка при запис: " + error.message);
    else {
      alert("Фактурата е запазена успешно!");
      setNumber("");
      setSupplierName("");
      setSupplierId(null);
      setTotalCost("");
      setItems([{ id: Math.random(), product_name: "", product_id: null, qty: "", unit_price: "", project_id: "" }]);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-blue-700 mb-4">Нова фактура</h1>

      <div className="grid gap-3 md:grid-cols-2 mb-4">
        <Input label="№ Фактура" value={number} onChange={setNumber} />

        {/* Доставчик с предложения */}
        <div>
          <label className="text-sm text-gray-600 block mb-1">Доставчик</label>
          <input
            type="text"
            value={supplierName}
            onChange={(e) => {
              setSupplierName(e.target.value);
              setSupplierId(null);
            }}
            placeholder="Въведете име на доставчик"
            className="w-full border rounded-xl px-3 py-2"
          />
          {supplierName && (
            <div className="border rounded-xl bg-gray-50 mt-1 max-h-32 overflow-auto">
              {suppliers
                .filter((s) => s.name.toLowerCase().includes(supplierName.toLowerCase()))
                .map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSupplierName(s.name);
                      setSupplierId(s.id);
                    }}
                    className="px-3 py-1 hover:bg-blue-100 cursor-pointer text-sm"
                  >
                    {s.name}
                  </div>
                ))}
            </div>
          )}
          {supplierName &&
            suppliers.filter((s) =>
              s.name.toLowerCase().includes(supplierName.toLowerCase())
            ).length === 0 && (
              <button
                onClick={addNewSupplier}
                className="text-blue-600 underline text-xs mt-1"
              >
                Добави нов доставчик "{supplierName}"
              </button>
            )}
        </div>

        <Input label="Дата" type="date" value={date} onChange={setDate} />
        <Input label="Обща стойност (€)" type="number" value={totalCost} onChange={setTotalCost} />
      </div>

      <h2 className="text-lg font-semibold mb-2">Стоки</h2>
      {items.map((it) => {
        const matches = products.filter((p) =>
          p.name.toLowerCase().includes(it.product_name.toLowerCase())
        );

        return (
          <div key={it.id} className="border rounded-xl p-3 mb-3 bg-white shadow-sm">
            <div className="grid gap-2 md:grid-cols-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Продукт</label>
                <input
                  type="text"
                  className="w-full border rounded-xl px-3 py-2"
                  placeholder="Име на продукт"
                  value={it.product_name}
                  onChange={(e) => updateItem(it.id, { product_name: e.target.value })}
                />
                {it.product_name && matches.length > 0 && (
                  <div className="border rounded-xl bg-gray-50 mt-1 max-h-32 overflow-auto">
                    {matches.map((m) => (
                      <div
                        key={m.id}
                        onClick={() =>
                          updateItem(it.id, { product_name: m.name, product_id: m.id })
                        }
                        className="px-3 py-1 hover:bg-blue-100 cursor-pointer text-sm"
                      >
                        {m.name}
                      </div>
                    ))}
                  </div>
                )}
                {it.product_name &&
                  matches.length === 0 &&
                  it.product_name.trim().length > 1 && (
                    <button
                      onClick={() => addNewProduct(it)}
                      className="text-blue-600 underline text-xs mt-1"
                    >
                      Добави нов продукт "{it.product_name}"
                    </button>
                  )}
              </div>

              <Input
                label="Количество"
                type="number"
                value={it.qty}
                onChange={(v) => updateItem(it.id, { qty: v })}
              />
              <Input
                label="Ед. цена (€)"
                type="number"
                value={it.unit_price}
                onChange={(v) => updateItem(it.id, { unit_price: v })}
              />
              <Select
                label="Проект"
                value={it.project_id}
                onChange={(v) => updateItem(it.id, { project_id: v })}
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
              />
            </div>
            <div className="text-right mt-2">
              <button onClick={() => removeRow(it.id)} className="text-red-600 underline text-sm">
                Премахни ред
              </button>
            </div>
          </div>
        );
      })}

      <div className="flex justify-between mt-4">
        <button onClick={() => window.history.back()} className="border rounded-xl px-4 py-2 text-gray-700">
          Назад
        </button>

        <div className="flex gap-2">
          <button onClick={addRow} className="border rounded-xl px-4 py-2">
            Добави ред
          </button>
          <button
            onClick={saveInvoice}
            disabled={saving}
            className="bg-blue-600 text-white rounded-xl px-6 py-2 disabled:opacity-50"
          >
            Запиши фактура
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, type = "text", value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-600">{label}</span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-xl px-3 py-2"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-xl px-3 py-2"
      >
        <option value="">-- Изберете --</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}



