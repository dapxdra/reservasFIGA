import ReservaForm from "../components/reservaform.jsx";
import { useEffect, useState } from "react";
import { auth } from "../lib/firebase.jsx";
import { useRouter } from "next/navigation";

export default function ReservasPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login"); // Redirigir si no está autenticado
      } else {
        setUser(user);
      }
    });
    return () => unsubscribe(); // Limpiar el listener al desmontar el componente
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-black bg-white p-4">
      <ReservaForm />
    </div>
  );
}
