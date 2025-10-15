import { render, screen } from "@testing-library/react";
import ReservaForm from "../components/common/ReservaForm";

test("renderiza el formulario de reserva", () => {
  render(<ReservaForm />);
  expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
});
