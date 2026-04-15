import admin from "firebase-admin";
import { db } from "@/app/lib/firebaseadmin.jsx";
import { appError } from "@/app/core/server/shared/appError.js";
import { sendEmailResend } from "@/app/core/server/notifications/providers/emailResendProvider.js";
import { sendWhatsAppTwilio } from "@/app/core/server/notifications/providers/whatsappTwilioProvider.js";

const CR_UTC_OFFSET_HOURS = 6;

function parseHourTo24(hora) {
  const value = String(hora || "").trim();
  if (!value) return { hours: 8, minutes: 0 };

  const match24 = value.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (match24) {
    return {
      hours: Number(match24[1]),
      minutes: Number(match24[2]),
    };
  }

  const match12 = value.match(/^([1-9]|1[0-2]):([0-5]\d)\s*([AaPp][Mm])$/);
  if (match12) {
    const hour12 = Number(match12[1]);
    const minutes = Number(match12[2]);
    const period = match12[3].toUpperCase();
    const hours = period === "PM" ? (hour12 % 12) + 12 : hour12 % 12;
    return { hours, minutes };
  }

  return { hours: 8, minutes: 0 };
}

function parseReservaDateTimeUTC(reserva) {
  const ymd = String(reserva.fecha || "").trim();
  const match = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const { hours, minutes } = parseHourTo24(reserva.hora);

  return new Date(
    Date.UTC(year, month - 1, day, hours + CR_UTC_OFFSET_HOURS, minutes, 0)
  );
}

function normalizePhone(raw) {
  const input = String(raw || "").trim();
  if (!input) return "";

  const only = input.replace(/[^\d+]/g, "");
  if (only.startsWith("+")) return only;
  if (only.startsWith("00")) return `+${only.slice(2)}`;

  const digits = only.replace(/\D/g, "");
  if (digits.length === 8) return `+506${digits}`;
  if (digits.length === 11 && digits.startsWith("506")) return `+${digits}`;
  if (digits.length > 8) return `+${digits}`;

  return "";
}

function formatDateForMessage(value) {
  const ymd = String(value || "");
  const match = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return ymd || "-";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function buildMessage(reserva, conductorNombre) {
  const fecha = formatDateForMessage(reserva.fecha);
  const hora = String(reserva.hora || "-");

  return {
    subject: `Recordatorio 24h - Reserva #${reserva.id || reserva.figaId || ""}`,
    text: [
      `Hola ${conductorNombre || "conductor"},`,
      "",
      "Tienes una reserva asignada en aproximadamente 24 horas:",
      `Reserva: #${reserva.id || reserva.figaId || "-"}`,
      `Cliente: ${reserva.cliente || "-"}`,
      `Fecha: ${fecha}`,
      `Hora: ${hora}`,
      `Pick up: ${reserva.pickUp || "-"}`,
      `Drop off: ${reserva.dropOff || "-"}`,
      `Agencia: ${reserva.proveedor || "-"}`,
      `ItinId: ${reserva.itinId || "-"}`,
    ].join("\n"),
  };
}


async function getConductorData(reserva, byIdCache, byUidCache) {
  const conductorId = String(reserva.conductorId || "").trim();
  const assignedUid = String(reserva.assignedUid || "").trim();

  if (conductorId) {
    if (byIdCache.has(conductorId)) return byIdCache.get(conductorId);

    const doc = await db.collection("conductores").doc(conductorId).get();
    const data = doc.exists ? { id: doc.id, ...doc.data() } : null;
    byIdCache.set(conductorId, data);
    if (data?.uid) byUidCache.set(String(data.uid), data);
    return data;
  }

  if (assignedUid) {
    if (byUidCache.has(assignedUid)) return byUidCache.get(assignedUid);

    const snap = await db
      .collection("conductores")
      .where("uid", "==", assignedUid)
      .limit(1)
      .get();

    const data = snap.empty
      ? null
      : { id: snap.docs[0].id, ...snap.docs[0].data() };
    byUidCache.set(assignedUid, data);
    if (data?.id) byIdCache.set(data.id, data);
    return data;
  }

  return null;
}

async function getUserByUid(uid, userCache) {
  const value = String(uid || "").trim();
  if (!value) return null;

  if (userCache.has(value)) return userCache.get(value);

  const doc = await db.collection("users").doc(value).get();
  const data = doc.exists ? { id: doc.id, ...doc.data() } : null;
  userCache.set(value, data);
  return data;
}

export async function runReservas24hReminderUseCase({
  emailProvider = sendEmailResend,
  whatsappProvider = sendWhatsAppTwilio,
  ignoreWindow = false,
  minHours: minHoursOverride,
  maxHours: maxHoursOverride,
} = {}) {
  if (!db) {
    throw appError("Firebase Admin no está configurado en el servidor", 500, "ServerError");
  }

  const minHoursRaw = Number(
    minHoursOverride ?? process.env.REMINDER_MIN_HOURS ?? 23
  );
  const maxHoursRaw = Number(
    maxHoursOverride ?? process.env.REMINDER_MAX_HOURS ?? 25
  );
  const minHours = Number.isFinite(minHoursRaw) ? minHoursRaw : 23;
  const maxHours = Number.isFinite(maxHoursRaw) ? maxHoursRaw : 25;

  const emailMissing = [];
  if (!process.env.RESEND_API_KEY) emailMissing.push("RESEND_API_KEY");
  if (!process.env.REMINDER_FROM_EMAIL) emailMissing.push("REMINDER_FROM_EMAIL");

  const whatsappMissing = [];
  if (!process.env.TWILIO_ACCOUNT_SID) whatsappMissing.push("TWILIO_ACCOUNT_SID");
  if (!process.env.TWILIO_AUTH_TOKEN) whatsappMissing.push("TWILIO_AUTH_TOKEN");
  if (!process.env.TWILIO_WHATSAPP_FROM) whatsappMissing.push("TWILIO_WHATSAPP_FROM");

  const emailEnabled = emailMissing.length === 0;
  const whatsappEnabled = whatsappMissing.length === 0;

  const summary = {
    scanned: 0,
    eligible: 0,
    sent: 0,
    sentEmail: 0,
    sentWhatsApp: 0,
    skipped: 0,
    skippedReasons: {
      canceledOrAlreadySent: 0,
      invalidDate: 0,
      outOfWindow: 0,
      missingContact: 0,
      noChannelConfigured: 0,
      noChannelSent: 0,
    },
    filters: {
      ignoreWindow: Boolean(ignoreWindow),
      minHours,
      maxHours,
    },
    channels: {
      emailEnabled,
      whatsappEnabled,
      emailMissing,
      whatsappMissing,
    },
    errors: [],
  };

  const byIdCache = new Map();
  const byUidCache = new Map();
  const userCache = new Map();

  const snapshot = await db.collection("reservas").get();
  const now = new Date();

  summary.scanned = snapshot.size;

  for (const doc of snapshot.docs) {
    const reserva = { id: doc.id, ...doc.data() };

    if (reserva.cancelada || reserva.reminder24hSentAt) {
      summary.skipped += 1;
      summary.skippedReasons.canceledOrAlreadySent += 1;
      continue;
    }

    const fechaHoraUTC = parseReservaDateTimeUTC(reserva);
    if (!fechaHoraUTC) {
      summary.skipped += 1;
      summary.skippedReasons.invalidDate += 1;
      continue;
    }

    const diffHours = (fechaHoraUTC.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (!ignoreWindow && (diffHours < minHours || diffHours > maxHours)) {
      summary.skipped += 1;
      summary.skippedReasons.outOfWindow += 1;
      continue;
    }

    const conductor = await getConductorData(reserva, byIdCache, byUidCache);
    const assignedUid = String(reserva.assignedUid || conductor?.uid || "").trim();
    const userProfile = await getUserByUid(assignedUid, userCache);
    const conductorNombre = String(
      conductor?.nombre || reserva.conductorNombre || reserva.chofer || ""
    ).trim();
    const conductorEmail = String(conductor?.email || userProfile?.email || "")
      .trim()
      .toLowerCase();
    const conductorPhone = normalizePhone(
      conductor?.telefonoWhatsApp || conductor?.telefono
    );

    if (!conductorEmail && !conductorPhone) {
      summary.skipped += 1;
      summary.skippedReasons.missingContact += 1;
      continue;
    }

    if (!emailEnabled && !whatsappEnabled) {
      summary.skipped += 1;
      summary.skippedReasons.noChannelConfigured += 1;
      continue;
    }

    summary.eligible += 1;

    try {
      const msg = buildMessage(reserva, conductorNombre);
      const sentChannels = [];

      if (conductorEmail) {
        const emailSent = await emailProvider({
          to: conductorEmail,
          subject: msg.subject,
          text: msg.text,
        });
        if (emailSent) {
          sentChannels.push("email");
          summary.sentEmail += 1;
        }
      }

      if (conductorPhone) {
        const whatsappSent = await whatsappProvider({ to: conductorPhone, text: msg.text });
        if (whatsappSent) {
          sentChannels.push("whatsapp");
          summary.sentWhatsApp += 1;
        }
      }

      if (sentChannels.length > 0) {
        await db.collection("reservas").doc(doc.id).set(
          {
            reminder24hSentAt: admin.firestore.FieldValue.serverTimestamp(),
            reminder24hChannels: sentChannels,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        summary.sent += 1;
      } else {
        summary.skipped += 1;
        summary.skippedReasons.noChannelSent += 1;
      }
    } catch (error) {
      summary.errors.push({
        reservaId: doc.id,
        message: error.message,
      });
    }
  }

  return summary;
}
