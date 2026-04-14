"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Loading from "./Loading.jsx";
import { useUser } from "../../context/UserContext.js";

export default function ProtectedRoute({
  children,
  allowedRoles,
  requireAuth = true,
  fallback = <Loading />,
}) {
  const router = useRouter();
  const { user, role, loading } = useUser();

  useEffect(() => {
    if (loading) return;

    if (!requireAuth) {
      if (user && role) router.replace("/dashboard");
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (allowedRoles && role && !allowedRoles.includes(role)) {
      router.replace("/dashboard");
    }
  }, [allowedRoles, loading, requireAuth, role, router, user]);

  if (loading) return fallback;
  if (requireAuth && !user) return null;
  if (requireAuth && allowedRoles && !role) return null;
  if (requireAuth && allowedRoles && role && !allowedRoles.includes(role)) return null;
  if (!requireAuth && user && role) return null;

  return children;
}
