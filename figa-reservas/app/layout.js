import { Geist, Geist_Mono } from "next/font/google";
import { UserProvider } from "./context/UserContext";
import "./globals.css";
import { ReservasRevisadasProvider } from "./context/ReservasContext";
import { ReservasDataProvider } from "./context/ReservasDataContext";
import { Toaster } from "react-hot-toast";

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
          <ReservasDataProvider>
            <ReservasRevisadasProvider>
              {children}
              <Toaster
                position="bottom-center"
                reverseOrder={false}
                gutter={8}
                toastOptions={{
                  duration: 3500,
                  style: {
                    background: "#cdcdcd",
                    color: "#363636",
                    fontSize: "14px",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  },
                  success: {
                    iconTheme: {
                      primary: "#10b981",
                      secondary: "#fff",
                    },
                    style: {
                      border: "1px solid #6ee7b7",
                      background: "#ecfdf5",
                      color: "#047857",
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: "#ef4444",
                      secondary: "#fff",
                    },
                    style: {
                      border: "1px solid #fecaca",
                      background: "#fef2f2",
                      color: "#b91c1c",
                    },
                  },
                  loading: {
                    style: {
                      border: "1px solid #bfdbfe",
                      background: "#eff6ff",
                      color: "#1d4ed8",
                    },
                  },
                }}
              />
            </ReservasRevisadasProvider>
          </ReservasDataProvider>
        </UserProvider>
      </body>
    </html>
  );
}
