import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function AdminProductStats() {
  const [data, setData] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data, error } = await supabase
      .from("product_purchases")
      .select("*")
      .order("invoice_date", { ascending: true });

    if (error) return alert("Грешка при зареждане: " + error.message);

    setData(data);
    setProducts([...new Set(data.map((d) => d.product_name))]);
  }

  const filtered = selectedProduct
    ? data.filter((d) => d.product_name === selectedProduct)
    : [];

  const aggregated = filtered.reduce((acc, curr) => {
    acc[curr.invoice_date] = (acc[curr.invoice_date] || 0) + Number(curr.qty);
    return acc;
  }, {});

  const lineData = Object.entries(aggregated).map(([date, qty]) => ({
    date,
    qty,
  }));

  const totalQty = filtered.reduce((a, b) => a + Number(b.qty), 0);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-blue-700 mb-4">
        Статистики за продукти
      </h1>

      <label className="block mb-3">
        <span className="text-sm text-gray-600">Избери продукт</span>
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="w-full border rounded-xl px-3 py-2 mt-1"
        >
          <option value="">-- Изберете --</option>
          {products.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>

      {!selectedProduct && (
        <p className="text-gray-600 text-sm">
          Моля изберете продукт, за да видите статистики.
        </p>
      )}

      {selectedProduct && (
        <div className="space-y-10 mt-6">

          {/* Бар графика – общо закупено количество */}
          <div>
            <h2 className="text-lg font-semibold mb-2">
              Общо закупено количество: {totalQty}
            </h2>
            <BarChart width={500} height={300} data={[{ name: selectedProduct, qty: totalQty }]}>
              <CartesianGrid stroke="#ccc" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="qty" fill="#4a90e2" />
            </BarChart>
          </div>

          {/* Линейна графика – покупки по дати */}
          <div>
            <h2 className="text-lg font-semibold mb-2">
              Количество по дати
            </h2>
            <LineChart width={700} height={350} data={lineData}>
              <CartesianGrid stroke="#ccc" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="qty" stroke="#4a90e2" />
            </LineChart>
          </div>
        </div>
      )}
    </div>
  );
}
