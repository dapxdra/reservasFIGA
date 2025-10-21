"use client";
import { useRouter } from "next/navigation";
import Logo from "./Logo";

export default function LogoNav() {
  const router = useRouter();

  const handleClick = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dashboardFiltro", "activas");
      localStorage.setItem("dashboardSearchQuery", "");
      localStorage.setItem(
        "dashboardFilters",
        JSON.stringify({
          startDate: "",
          endDate: "",
          month: "",
          cliente: "",
          id: "",
          itinId: "",
          proveedor: "",
        })
      );
    }
    router.push("/dashboard");
  };

  return (
    <nav className="w-full flex items-center justify-center bg-gray-50 border border-gray-100 shadow-sm rounded-xl px-4 py-3 mb-6">
      <div
        className="flex-none items-center ml-px-4 cursor-pointer"
        role="button"
        title="Ir al dashboard (ver activas)"
        onClick={handleClick}
      >
        <Logo />
      </div>
    </nav>
  );
}
