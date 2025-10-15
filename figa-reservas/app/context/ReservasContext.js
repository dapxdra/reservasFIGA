"use client";
import { createContext, useContext, useState } from "react";

const ReservasRevisadasContext = createContext();

export function ReservasRevisadasProvider({ children }) {
  const [revisadas, setRevisadas] = useState({});

  return (
    <ReservasRevisadasContext.Provider value={{ revisadas, setRevisadas }}>
      {children}
    </ReservasRevisadasContext.Provider>
  );
}

export function useReservasRevisadas() {
  return useContext(ReservasRevisadasContext);
}
