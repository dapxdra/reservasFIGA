import ReservaForm from "../components/reservaform.js";

export default function ReservasPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-black bg-white p-4">
      <h1 className="text-2xl font-bold mb-4">Nueva Reserva</h1>
      <ReservaForm />
    </div>
  );
}
