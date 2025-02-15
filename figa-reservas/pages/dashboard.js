import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function Dashboard() {
  const [reservas, setReservas] = useState([]);
  const [nuevaReserva, setNuevaReserva] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (!user) window.location.href = "/login";
      setUser(user);
    });

    const fetchReservas = async () => {
      const querySnapshot = await getDocs(collection(db, "reservas"));
      setReservas(
        querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    };

    fetchReservas();
  }, []);

  const addReserva = async () => {
    if (!nuevaReserva) return;
    await addDoc(collection(db, "reservas"), { nombre: nuevaReserva });
    setNuevaReserva("");
    window.location.reload();
  };

  const deleteReserva = async (id) => {
    await deleteDoc(doc(db, "reservas", id));
    window.location.reload();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Reservas</h1>
      <div className="my-4">
        <input
          type="text"
          className="input input-bordered"
          placeholder="Nombre de la reserva"
          value={nuevaReserva}
          onChange={(e) => setNuevaReserva(e.target.value)}
        />
        <button className="btn btn-primary ml-2" onClick={addReserva}>
          Agregar
        </button>
      </div>
      <table className="table w-full">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {reservas.map((reserva) => (
            <tr key={reserva.id}>
              <td>{reserva.id}</td>
              <td>{reserva.nombre}</td>
              <td>
                <button
                  className="btn btn-error"
                  onClick={() => deleteReserva(reserva.id)}
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn btn-secondary mt-4" onClick={() => signOut(auth)}>
        Cerrar Sesión
      </button>
    </div>
  );
}
