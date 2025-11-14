import React, { useState } from "react";
import AdminProductStats from "./AdminProductStats.jsx";

export default function AdminView() {
  const [page, setPage] = useState("stats");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-blue-700 mb-4">
        Администратор
      </h1>

      {/* Навигация */}
      <nav className="flex gap-3 border-b pb-3 mb-6">
        <button
          onClick={() => setPage("stats")}
          className={`px-4 py-2 rounded-xl border ${
            page === "stats" ? "bg-blue-600 text-white" : "bg-white"
          }`}
        >
          Статистики за продукти
        </button>
      </nav>

      {/* Съдържание на избраната секция */}
      {page === "stats" && <AdminProductStats />}
    </div>
  );
}
