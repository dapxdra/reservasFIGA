import admin from "firebase-admin";
import { db } from "@/app/lib/firebaseadmin.jsx";
import { appError } from "@/app/core/server/shared/appError.js";
import { serializeFirestoreRefValue } from "@/app/core/shared/firebase/serializeFirestoreRefValue.js";
import { sendEmailResend } from "@/app/core/server/notifications/providers/emailResendProvider.js";
import { sendWhatsAppTwilio } from "@/app/core/server/notifications/providers/whatsappTwilioProvider.js";

const CR_UTC_OFFSET_HOURS = 6;

function getTodayCRYmd() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Costa_Rica",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function normalizeIdValue(value) {
  return String(serializeFirestoreRefValue(value) || value || "").trim();
}

function isValidFromAddress(value) {
  const input = String(value || "")
    .trim()
    .replace(/^['\"]|['\"]$/g, "")
    .trim();
  if (!input) return false;

  const plainEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const namedEmail = /^.+\s<[^\s@]+@[^\s@]+\.[^\s@]+>$/;

  return plainEmail.test(input) || namedEmail.test(input);
}

function normalizeFromAddress(value) {
  return String(value || "")
    .trim()
    .replace(/^['\"]|['\"]$/g, "")
    .trim();
}

function maskEmail(value) {
  const email = String(value || "").trim();
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) return "";

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  if (!domain) return "";

  const visible = local.slice(0, 2);
  return `${visible}${local.length > 2 ? "***" : ""}@${domain}`;
}

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
  const placa = String(reserva.vehiculoPlaca || reserva.buseta || reserva.vehiculo || "-");

  return {
    subject: `Recordatorio - Reserva #${reserva.id || reserva.figaId || ""}`,
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
      `Vehiculo asignado: ${placa}`,
    ].join("\n"),
  };
}


async function getConductorData(reserva, byIdCache, byUidCache, byNameCache) {
  const conductorId = normalizeIdValue(reserva.conductorId);
  const assignedUid = normalizeIdValue(reserva.assignedUid);
  const conductorNombre = String(reserva.conductorNombre || reserva.chofer || "").trim();

  if (conductorId) {
    if (byIdCache.has(conductorId)) return byIdCache.get(conductorId);

    const doc = await db.collection("conductores").doc(conductorId).get();
    const data = doc.exists ? { id: doc.id, ...doc.data() } : null;
    byIdCache.set(conductorId, data);
    const dataUid = normalizeIdValue(data?.uid);
    if (dataUid) byUidCache.set(dataUid, data);
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

  if (conductorNombre) {
    const normalizedName = conductorNombre.toLowerCase();
    if (byNameCache.has(normalizedName)) return byNameCache.get(normalizedName);

    const snap = await db
      .collection("conductores")
      .where("nombre", "==", conductorNombre)
      .limit(1)
      .get();

    const data = snap.empty
      ? null
      : { id: snap.docs[0].id, ...snap.docs[0].data() };

    byNameCache.set(normalizedName, data);
    if (data?.id) byIdCache.set(data.id, data);
    const dataUid = normalizeIdValue(data?.uid);
    if (dataUid) byUidCache.set(dataUid, data);
    return data;
  }

  return null;
}

async function getUserByUid(uid, userCache) {
  const value = normalizeIdValue(uid);
  if (!value) return null;

  if (userCache.has(value)) return userCache.get(value);

  const doc = await db.collection("users").doc(value).get();
  if (doc.exists) {
    const data = { id: doc.id, ...doc.data() };
    userCache.set(value, data);
    return data;
  }

  const snap = await db
    .collection("users")
    .where("uid", "==", value)
    .limit(1)
    .get();

  const data = snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
  userCache.set(value, data);
  return data;
}

export async function runReservas24hReminderUseCase({
  emailProvider = sendEmailResend,
  whatsappProvider = sendWhatsAppTwilio,
  ignoreWindow = false,
  onlyActive = false,
  maxSends = 1,
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
  const maxSendsSafe = Number.isFinite(Number(maxSends))
    ? Math.max(1, Number(maxSends))
    : 1;
  const normalizedFrom = normalizeFromAddress(process.env.REMINDER_FROM_EMAIL);
  const fromValid = isValidFromAddress(normalizedFrom);

  const emailMissing = [];
  if (!process.env.RESEND_API_KEY) emailMissing.push("RESEND_API_KEY");
  if (!process.env.REMINDER_FROM_EMAIL) {
    emailMissing.push("REMINDER_FROM_EMAIL");
  } else if (!fromValid) {
    emailMissing.push("REMINDER_FROM_EMAIL (formato inválido)");
  }

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
      canceled: 0,
      reachedMaxSends: 0,
      invalidDate: 0,
      outOfWindow: 0,
      inactivePast: 0,
      missingContact: 0,
      noChannelConfigured: 0,
      noChannelSent: 0,
    },
    filters: {
      ignoreWindow: Boolean(ignoreWindow),
      onlyActive: Boolean(onlyActive),
      maxSends: maxSendsSafe,
      minHours,
      maxHours,
    },
    channels: {
      emailEnabled,
      whatsappEnabled,
      emailMissing,
      whatsappMissing,
      fromValid,
      fromPreview: maskEmail(normalizedFrom),
    },
    errors: [],
  };

  const byIdCache = new Map();
  const byUidCache = new Map();
  const byNameCache = new Map();
  const userCache = new Map();
  const todayCR = getTodayCRYmd();

  const snapshot = await db.collection("reservas").get();
  const now = new Date();

  summary.scanned = snapshot.size;

  for (const doc of snapshot.docs) {
    const reserva = { id: doc.id, ...doc.data() };
    const sendCountRaw = Number(
      reserva.reminderSendCount ?? (reserva.reminder24hSentAt ? 1 : 0)
    );
    const sendCount = Number.isFinite(sendCountRaw) ? sendCountRaw : 0;

    if (reserva.cancelada) {
      summary.skipped += 1;
      summary.skippedReasons.canceled += 1;
      continue;
    }

    if (sendCount >= maxSendsSafe) {
      summary.skipped += 1;
      summary.skippedReasons.reachedMaxSends += 1;
      continue;
    }

    const fechaHoraUTC = parseReservaDateTimeUTC(reserva);
    if (!fechaHoraUTC) {
      summary.skipped += 1;
      summary.skippedReasons.invalidDate += 1;
      continue;
    }

    const diffHours = (fechaHoraUTC.getTime() - now.getTime()) / (1000 * 60 * 60);

    const reservaDate = String(reserva.fecha || "").trim();
    if (onlyActive && reservaDate < todayCR) {
      summary.skipped += 1;
      summary.skippedReasons.inactivePast += 1;
      continue;
    }

    if (!ignoreWindow && (diffHours < minHours || diffHours > maxHours)) {
      summary.skipped += 1;
      summary.skippedReasons.outOfWindow += 1;
      continue;
    }

    const conductor = await getConductorData(reserva, byIdCache, byUidCache, byNameCache);
    const assignedUid = normalizeIdValue(reserva.assignedUid || conductor?.uid);
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
            reminderLastSentAt: admin.firestore.FieldValue.serverTimestamp(),
            reminderSendCount: sendCount + 1,
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
