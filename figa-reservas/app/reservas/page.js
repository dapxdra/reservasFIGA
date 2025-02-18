import ReservaForm from "../components/reservaform.js";

export default function ReservasPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Nueva Reserva</h1>
      <ReservaForm />
    </div>
  );
}
