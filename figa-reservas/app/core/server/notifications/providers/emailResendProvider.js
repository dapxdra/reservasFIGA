export async function sendEmailResend({ to, subject, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const rawFrom = String(process.env.REMINDER_FROM_EMAIL || "").trim();
  const from = rawFrom.replace(/^['\"]|['\"]$/g, "").trim();

  const plainEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const namedEmail = /^.+\s<[^\s@]+@[^\s@]+\.[^\s@]+>$/;
  const fromIsValid = plainEmail.test(from) || namedEmail.test(from);

  if (!apiKey || !from || !to) return false;
  if (!fromIsValid) {
    throw new Error(
      "Configuracion invalida: REMINDER_FROM_EMAIL debe tener formato 'email@dominio.com' o 'Nombre <email@dominio.com>'"
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to, subject, text }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Email provider error: ${response.status} ${errText}`);
  }

  return true;
}
