import { Geist, Geist_Mono } from "next/font/google";
import { UserProvider } from "./context/UserContext";
import "./globals.css";
import { ReservasRevisadasProvider } from "./context/ReservasContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "FigaReservas",
  description: "Administración de reservas de FIGA",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <UserProvider>
          <ReservasRevisadasProvider>{children}</ReservasRevisadasProvider>
        </UserProvider>
      </body>
    </html>
  );
}
