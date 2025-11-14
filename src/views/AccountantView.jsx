import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function AccountantView() {
  const [invoices, setInvoices] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Зареждане на всички фактури при стартиране
  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("date", { ascending: false });
    if (error) {
      alert("Грешка при зареждане: " + error.message);
      return;
    }

    setInvoices(data || []);

    // извличаме уникални доставчици за падащото меню
    const uniqueSuppliers = [...new Set(data.map((i) => i.supplier))];
    setSuppliers(uniqueSuppliers);
    setFiltered(data);
  }

  function applyFilters() {
    let result = invoices;

    if (selectedSupplier)
      result = result.filter((i) => i.supplier === selectedSupplier);

    if (dateFrom)
      result = result.filter((i) => new Date(i.date) >= new Date(dateFrom));

    if (dateTo)
      result = result.filter((i) => new Date(i.date) <= new Date(dateTo));

    setFiltered(result);
  }

  function clearFilters() {
    setSelectedSupplier("");
    setDateFrom("");
    setDateTo("");
    setFiltered(invoices);
  }

  // изчисляваме тотал по вид продукт (ако искаш може да се визуализира отделно)
  const totalSum = filtered.reduce(
    (sum, i) => sum + Number(i.total_cost || 0),
    0
  );

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-blue-700 mb-4">
        Справка фактури
      </h1>

      <div className="rounded-xl border bg-white p-4 mb-6">
        <h2 className="font-semibold mb-3">Филтри</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="block">
            <span className="text-sm text-gray-600">Доставчик</span>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full border rounded-xl px-3 py-2"
            >
              <option value="">-- Всички --</option>
              {suppliers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <Input
            label="От дата"
            type="date"
            value={dateFrom}
            onChange={setDateFrom}
          />
          <Input
            label="До дата"
            type="date"
            value={dateTo}
            onChange={setDateTo}
          />

          <div className="flex items-end gap-2">
            <button
              onClick={applyFilters}
              className="bg-blue-600 text-white rounded-xl px-4 py-2"
            >
              Приложи
            </button>
            <button
              onClick={clearFilters}
              className="border rounded-xl px-4 py-2"
            >
              Изчисти
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white border p-4 shadow-sm">
        <h2 className="font-semibold mb-2">
          Резултати ({filtered.length} фактури)
        </h2>

        <table className="w-full border text-sm mb-4">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2 text-left">№</th>
              <th className="border px-3 py-2 text-left">Дата</th>
              <th className="border px-3 py-2 text-left">Доставчик</th>
              <th className="border px-3 py-2 text-left">Обща сума (€)</th>
              <th className="border px-3 py-2 text-left">Продукти</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="odd:bg-white even:bg-gray-50 align-top">
                <td className="border px-3 py-2">{i.number}</td>
                <td className="border px-3 py-2">{i.date}</td>
                <td className="border px-3 py-2">{i.supplier}</td>
                <td className="border px-3 py-2 text-right">
                  {Number(i.total_cost).toFixed(2)}
                </td>
                <td className="border px-3 py-2">
                  {Array.isArray(i.items) && i.items.length > 0 ? (
                    <ul className="list-disc ml-5 space-y-1">
                      {i.items.map((it, idx) => (
                        <li key={idx}>
                          {it.qty} × {it.unit_price} €
                          <span className="text-gray-600">
                            {" "}
                            – Проект: {it.project_id}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-gray-500">(няма данни)</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-right font-semibold text-lg">
          Общо: {totalSum.toFixed(2)} €
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-xl px-3 py-2"
      />
    </label>
  );
}

