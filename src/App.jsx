import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import DataEntryInvoices from "./views/DataEntryInvoices.jsx";
import ProductsView from "./views/ProductsView.jsx";
import AccountantView from "./views/AccountantView.jsx";
import AdminView from "./views/AdminView.jsx";
import InvoicesList from "./views/InvoicesList.jsx";
import SuppliersView from "./views/SuppliersView.jsx";
import ProjectsView from "./views/ProjectsView.jsx";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState("invoicesList");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(s)
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    const u = session.user;
    const role = u.user_metadata?.role || "accountant";
    const name = u.user_metadata?.name || u.email.split("@")[0];
    setProfile({ id: u.id, email: u.email, role, name });
  }, [session]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  if (!session) return <Login />;

  return (
    <div>
      <header className="flex justify-between items-center bg-white border-b px-4 py-2">
        <h1 className="font-bold text-xl text-blue-700">Pintcom</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            {profile?.name} ({roleBg(profile?.role)})
          </span>
          <button
            onClick={handleLogout}
            className="rounded-xl border px-3 py-1 text-sm"
          >
            Изход
          </button>
        </div>
      </header>

      {/* Оператор и Счетоводител имат еднакви страници */}
      {(profile?.role === "data_entry" || profile?.role === "accountant") && (
        <div>
          <nav className="flex flex-wrap gap-2 border-b bg-gray-100 px-4 py-2">
            <NavButton text="Списък фактури" active={page === "invoicesList"} onClick={() => setPage("invoicesList")} />
            <NavButton text="Нова фактура" active={page === "invoices"} onClick={() => setPage("invoices")} />
            <NavButton text="Продукти" active={page === "products"} onClick={() => setPage("products")} />
            <NavButton text="Проекти" active={page === "projects"} onClick={() => setPage("projects")} />
            <NavButton text="Доставчици" active={page === "suppliers"} onClick={() => setPage("suppliers")} />
          </nav>

          {page === "invoicesList" && <InvoicesList onNewInvoice={() => setPage("invoices")} />}
          {page === "invoices" && <DataEntryInvoices profile={profile} />}
          {page === "products" && <ProductsView />}
          {page === "projects" && <ProjectsView />}
          {page === "suppliers" && <SuppliersView />}
        </div>
      )}

      {/* Админ */}
      {profile?.role === "admin" && <AdminView />}
    </div>
  );
}

function NavButton({ text, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-3 py-1 border ${
        active ? "bg-blue-600 text-white" : "bg-white"
      }`}
    >
      {text}
    </button>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function signIn(e) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Грешен имейл или парола.");
  }

  return (
    <div className="grid place-items-center min-h-screen bg-gray-100">
      <form
        onSubmit={signIn}
        className="bg-white p-6 rounded-2xl shadow max-w-sm w-full"
      >
        <h1 className="text-2xl font-bold mb-4 text-blue-700 text-center">
          Pintcom
        </h1>
        <input
          className="w-full border rounded-xl px-3 py-2 mb-3"
          type="email"
          placeholder="Имейл"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full border rounded-xl px-3 py-2 mb-3"
          type="password"
          placeholder="Парола"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white rounded-xl py-2"
        >
          Влез
        </button>
      </form>
    </div>
  );
}

function roleBg(role) {
  if (role === "data_entry") return "Оператор";
  if (role === "accountant") return "Счетоводител";
  if (role === "admin") return "Администратор";
  return role;
}



