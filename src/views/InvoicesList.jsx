import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function InvoicesList({ profile }) {
  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [products, setProducts] = useState([]);

  const [filterProject, setFilterProject] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [search, setSearch] = useState("");

  const [selectedInvoice, setSelectedInvoice] = useState(null); // за преглед
  const [editInvoice, setEditInvoice] = useState(null); // за редакция
  const [editSupplierQuery, setEditSupplierQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: inv, error } = await supabase
      .from("invoices")
      .select("id, number, date, total_cost, supplier, supplier_id, items")
      .order("date", { ascending: false });

    if (error) {
      console.error("Error loading invoices:", error.message);
      alert("Грешка при зареждане на фактурите: " + error.message);
    }

    const [{ data: supp }, { data: proj }, { data: prod }] = await Promise.all([
      supabase.from("suppliers").select("id, name").order("name"),
      supabase.from("projects").select("id, name").order("name"),
      supabase.from("products").select("id, name").order("name"),
    ]);

    setInvoices(inv || []);
    setSuppliers(supp || []);
    setProjects(proj || []);
    setProducts(prod || []);
  }

  // ---------- Отваряне/затваряне на модали ----------
  async function openInvoiceDetails(id) {
    const { data, error } = await supabase
      .from("invoices")
      .select("*, items")
      .eq("id", id)
      .single();
    if (error) return alert("Грешка при зареждане на фактурата: " + error.message);
    setSelectedInvoice(data);
  }

  function closeModal() {
    setSelectedInvoice(null);
    setEditInvoice(null);
    setEditSupplierQuery("");
  }

  // ---------- Изтриване ----------
  async function deleteInvoice(id) {
    if (!window.confirm("Сигурни ли сте, че искате да изтриете тази фактура?")) return;
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) {
      alert("Грешка при изтриване: " + error.message);
      return;
    }
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    alert("Фактурата беше изтрита успешно.");
  }

  // ---------- Редакция: подготовка ----------
  function startEdit(inv) {
    // Копие за редакция, за да не променяме масива на живо
    const draft = {
      id: inv.id,
      number: inv.number || "",
      supplier: inv.supplier || suppliers.find((s) => s.id === inv.supplier_id)?.name || "",
      supplier_id: inv.supplier_id || null,
      date: inv.date || "",
      total_cost: inv.total_cost || 0,
      items: (inv.items || []).map((x) => ({
        id: x.id ?? Math.random(),
        product_name: x.product_name || "",
        product_id: x.product_id || null,
        qty: x.qty ?? "",
        unit_price: x.unit_price ?? "",
        project_id: x.project_id || "",
      })),
    };
    setEditInvoice(draft);
    setEditSupplierQuery(draft.supplier);
  }

  // ---------- Редакция: продукти/редове ----------
  function editUpdateItem(id, patch) {
    setEditInvoice((prev) => ({
      ...prev,
      items: prev.items.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }

  function editAddRow() {
    setEditInvoice((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { id: Math.random(), product_name: "", product_id: null, qty: "", unit_price: "", project_id: "" },
      ],
    }));
  }

  function editRemoveRow(id) {
    setEditInvoice((prev) => ({
      ...prev,
      items: prev.items.filter((r) => r.id !== id),
    }));
  }

  // ---------- Редакция: доставчик (предложения + създаване при нужда по бутон) ----------
  async function addNewSupplierFromEdit() {
    const name = (editSupplierQuery || "").trim();
    if (!name) return;
    const { data, error } = await supabase.from("suppliers").insert({ name }).select().single();
    if (error) return alert("Грешка при добавяне на доставчик: " + error.message);
    setSuppliers((prev) => [...prev, data]);
    setEditInvoice((prev) => ({ ...prev, supplier: data.name, supplier_id: data.id }));
    setEditSupplierQuery(data.name);
  }

  // ---------- Редакция: запис ----------
  async function handleSaveEdit() {
    if (!editInvoice) return;

    // Валидации
    if (!editInvoice.number.trim()) return alert("Въведете номер на фактура");
    if (!editInvoice.supplier?.trim() && !editInvoice.supplier_id)
      return alert("Въведете или изберете доставчик");
    if (!editInvoice.date) return alert("Изберете дата");

    for (const it of editInvoice.items) {
      if (!it.product_name.trim()) return alert("Въведете име на продукт");
      if (!it.project_id) return alert("Изберете проект");
    }

    // Проверка за суми
    const sumItems = editInvoice.items.reduce(
      (acc, it) => acc + (parseFloat(it.qty || 0) * parseFloat(it.unit_price || 0)),
      0
    );
    const diff = Math.abs(sumItems - parseFloat(editInvoice.total_cost || 0));
    if (diff > 0.01) {
      const proceed = window.confirm(
        `Общата стойност на продуктите (${sumItems.toFixed(2)} €) не съвпада с въведената обща сума (${Number(editInvoice.total_cost || 0).toFixed(2)} €). Желаете ли да продължите?`
      );
      if (!proceed) return;
    }

    // Намиране на supplier_id ако е избрано име от списъка
    const existingSupplier = suppliers.find(
      (s) => s.name.toLowerCase() === (editInvoice.supplier || "").toLowerCase()
    );
    const supplier_id = editInvoice.supplier_id || existingSupplier?.id || null;

    const payload = {
      number: editInvoice.number.trim(),
      supplier: supplier_id ? null : editInvoice.supplier?.trim() || null, // ако няма id, пазим текст
      supplier_id: supplier_id,
      date: editInvoice.date,
      total_cost: parseFloat(editInvoice.total_cost || 0),
      items: editInvoice.items.map((it) => ({
        ...it,
        qty: parseFloat(it.qty || 0),
        unit_price: parseFloat(it.unit_price || 0),
      })),
    };

    const { error } = await supabase.from("invoices").update(payload).eq("id", editInvoice.id);
    if (error) {
      alert("Грешка при запис на промените: " + error.message);
      return;
    }

    alert("Фактурата е успешно обновена.");
    closeModal();
    loadData();
  }

  // ---------- Филтриране ----------
  const filtered = invoices.filter((inv) => {
    const supplierName =
      inv.supplier ||
      suppliers.find((s) => s.id === inv.supplier_id)?.name ||
      "";
    const byProject =
      !filterProject ||
      inv.items?.some(
        (item) =>
          projects.find((p) => p.id === item.project_id)?.name === filterProject
      );
    const byDate = !filterDate || inv.date === filterDate;
    const query = (search || "").toLowerCase();
    const bySearch =
      !query ||
      inv.number?.toLowerCase().includes(query) ||
      supplierName.toLowerCase().includes(query);

    return byProject && byDate && bySearch;
  });

  // ---------- UI ----------
  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-blue-700 mb-4">Списък с фактури</h1>

      {/* Филтри */}
      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-sm text-gray-600 block mb-1">Проект</label>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="w-full border rounded-xl px-3 py-2"
          >
            <option value="">-- Всички --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-1">Дата</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full border rounded-xl px-3 py-2"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-1">
            Търси по номер или доставчик
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Търсене..."
            className="w-full border rounded-xl px-3 py-2"
          />
        </div>
      </div>

      {/* Таблица */}
      <div className="overflow-x-auto border rounded-xl bg-white shadow-sm">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-2 text-left text-sm font-semibold">№ Фактура</th>
              <th className="p-2 text-left text-sm font-semibold">Доставчик</th>
              <th className="p-2 text-left text-sm font-semibold">Дата</th>
              <th className="p-2 text-right text-sm font-semibold">Обща стойност (€)</th>
              <th className="p-2 text-right text-sm font-semibold">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => {
              const supplierName =
                inv.supplier ||
                suppliers.find((s) => s.id === inv.supplier_id)?.name ||
                "-";
              return (
                <tr
                  key={inv.id}
                  className="border-b hover:bg-blue-50 cursor-pointer"
                  onClick={() => openInvoiceDetails(inv.id)}
                >
                  <td className="p-2 text-sm">{inv.number}</td>
                  <td className="p-2 text-sm">{supplierName}</td>
                  <td className="p-2 text-sm">{inv.date}</td>
                  <td className="p-2 text-sm text-right">
                    {Number(inv.total_cost || 0).toFixed(2)}
                  </td>
                  <td className="p-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(inv);
                      }}
                      className="text-blue-600 text-sm mr-2"
                    >
                      Редактирай
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteInvoice(inv.id);
                      }}
                      className="text-red-600 text-sm"
                    >
                      Изтрий
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center text-gray-500 p-4 text-sm">
                  Няма намерени фактури
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Модален прозорец за преглед */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg max-w-2xl w-full p-6 relative">
            <button
              onClick={closeModal}
              className="absolute top-2 right-3 text-gray-600 text-lg font-bold"
            >
              ×
            </button>

            <h2 className="text-xl font-semibold text-blue-700 mb-3">
              Фактура № {selectedInvoice.number}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Доставчик:{" "}
              <strong>
                {selectedInvoice.supplier ||
                  suppliers.find((s) => s.id === selectedInvoice.supplier_id)?.name ||
                  "-"}
              </strong>
              <br />
              Дата: {selectedInvoice.date}
              <br />
              Обща стойност: {Number(selectedInvoice.total_cost || 0).toFixed(2)} €
            </p>

            <h3 className="font-semibold mb-2">Закупени стоки:</h3>
            <div className="border rounded-xl overflow-hidden">
              <table className="min-w-full border-collapse">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="p-2 text-left text-sm font-semibold">Продукт</th>
                    <th className="p-2 text-center text-sm font-semibold">Кол-во</th>
                    <th className="p-2 text-center text-sm font-semibold">Ед. цена (€)</th>
                    <th className="p-2 text-right text-sm font-semibold">Общо (€)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items?.map((it, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2 text-sm">{it.product_name}</td>
                      <td className="p-2 text-sm text-center">{it.qty}</td>
                      <td className="p-2 text-sm text-center">{it.unit_price}</td>
                      <td className="p-2 text-sm text-right">
                        {(it.qty * it.unit_price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-right mt-4">
              <button onClick={closeModal} className="border rounded-xl px-4 py-2">
                Затвори
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модален прозорец за редакция (пълна) */}
      {editInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-lg max-w-3xl w-full p-6 relative">
            <button
              onClick={closeModal}
              className="absolute top-2 right-3 text-gray-600 text-lg font-bold"
            >
              ×
            </button>

            <h2 className="text-xl font-semibold text-blue-700 mb-4">
              Редакция на фактура
            </h2>

            <div className="grid md:grid-cols-2 gap-3 mb-4">
              <label className="block text-sm text-gray-600">
                № Фактура
                <input
                  type="text"
                  value={editInvoice.number}
                  onChange={(e) =>
                    setEditInvoice({ ...editInvoice, number: e.target.value })
                  }
                  className="w-full border rounded-xl px-3 py-2"
                />
              </label>

              <div>
                <label className="text-sm text-gray-600 block mb-1">Доставчик</label>
                <input
                  type="text"
                  value={editSupplierQuery}
                  onChange={(e) => {
                    setEditSupplierQuery(e.target.value);
                    setEditInvoice((prev) => ({ ...prev, supplier: e.target.value, supplier_id: null }));
                  }}
                  placeholder="Въведете име на доставчик"
                  className="w-full border rounded-xl px-3 py-2"
                />
                {editSupplierQuery && (
                  <div className="border rounded-xl bg-gray-50 mt-1 max-h-32 overflow-auto">
                    {suppliers
                      .filter((s) =>
                        s.name.toLowerCase().includes(editSupplierQuery.toLowerCase())
                      )
                      .map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setEditInvoice((prev) => ({ ...prev, supplier: s.name, supplier_id: s.id }));
                            setEditSupplierQuery(s.name);
                          }}
                          className="px-3 py-1 hover:bg-blue-100 cursor-pointer text-sm"
                        >
                          {s.name}
                        </div>
                      ))}
                  </div>
                )}
                {editSupplierQuery &&
                  suppliers.filter((s) =>
                    s.name.toLowerCase().includes(editSupplierQuery.toLowerCase())
                  ).length === 0 && (
                    <button onClick={addNewSupplierFromEdit} className="text-blue-600 text-xs mt-1">
                      Добави нов доставчик "{editSupplierQuery}"
                    </button>
                  )}
              </div>

              <label className="block text-sm text-gray-600">
                Дата
                <input
                  type="date"
                  value={editInvoice.date}
                  onChange={(e) =>
                    setEditInvoice({ ...editInvoice, date: e.target.value })
                  }
                  className="w-full border rounded-xl px-3 py-2"
                />
              </label>

              <label className="block text-sm text-gray-600">
                Обща стойност (€)
                <input
                  type="number"
                  value={editInvoice.total_cost}
                  onChange={(e) =>
                    setEditInvoice({
                      ...editInvoice,
                      total_cost: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl px-3 py-2"
                />
              </label>
            </div>

            <h3 className="font-semibold mb-2">Стоки</h3>
            <div className="space-y-3">
              {editInvoice.items.map((it) => {
                const matches = products.filter((p) =>
                  p.name.toLowerCase().includes((it.product_name || "").toLowerCase())
                );
                return (
                  <div key={it.id} className="border rounded-xl p-3">
                    <div className="grid md:grid-cols-4 gap-2">
                      <div>
                        <label className="text-sm text-gray-600 block mb-1">Продукт</label>
                        <input
                          type="text"
                          value={it.product_name}
                          onChange={(e) => editUpdateItem(it.id, { product_name: e.target.value })}
                          className="w-full border rounded-xl px-3 py-2"
                        />
                        {it.product_name && matches.length > 0 && (
                          <div className="border rounded-xl bg-gray-50 mt-1 max-h-32 overflow-auto">
                            {matches.map((m) => (
                              <div
                                key={m.id}
                                onClick={() =>
                                  editUpdateItem(it.id, { product_name: m.name, product_id: m.id })
                                }
                                className="px-3 py-1 hover:bg-blue-100 cursor-pointer text-sm"
                              >
                                {m.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <label className="block text-sm text-gray-600">
                        Количество
                        <input
                          type="number"
                          value={it.qty}
                          onChange={(e) => editUpdateItem(it.id, { qty: e.target.value })}
                          className="w-full border rounded-xl px-3 py-2"
                        />
                      </label>

                      <label className="block text-sm text-gray-600">
                        Ед. цена (€)
                        <input
                          type="number"
                          value={it.unit_price}
                          onChange={(e) => editUpdateItem(it.id, { unit_price: e.target.value })}
                          className="w-full border rounded-xl px-3 py-2"
                        />
                      </label>

                      <label className="block text-sm text-gray-600">
                        Проект
                        <select
                          value={it.project_id}
                          onChange={(e) => editUpdateItem(it.id, { project_id: e.target.value })}
                          className="w-full border rounded-xl px-3 py-2"
                        >
                          <option value="">-- Изберете --</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="text-right mt-2">
                      <button
                        onClick={() => editRemoveRow(it.id)}
                        className="text-red-600 text-sm"
                      >
                        Премахни ред
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between mt-4">
              <button onClick={editAddRow} className="border rounded-xl px-4 py-2">
                Добави ред
              </button>
              <div>
                <button onClick={handleSaveEdit} className="bg-blue-600 text-white rounded-xl px-4 py-2 mr-2">
                  Запиши промените
                </button>
                <button onClick={closeModal} className="border rounded-xl px-4 py-2">
                  Затвори
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}







