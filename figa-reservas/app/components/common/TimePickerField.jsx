"use client";

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) =>
  String(index + 1).padStart(2, "0")
);

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0")
);

function parseTimeValue(value) {
  if (!value) {
    return {
      hour: "",
      minute: "",
      period: "AM",
    };
  }

  const [rawHour = "", rawMinute = ""] = value.split(":");
  const hour24 = Number(rawHour);

  if (Number.isNaN(hour24)) {
    return {
      hour: "",
      minute: "",
      period: "AM",
    };
  }

  return {
    hour: String(hour24 % 12 || 12).padStart(2, "0"),
    minute: String(Number(rawMinute || 0)).padStart(2, "0"),
    period: hour24 >= 12 ? "PM" : "AM",
  };
}

function to24Hour(parts) {
  if (!parts.hour || !parts.minute) {
    return "";
  }

  const parsedHour = Number(parts.hour);
  const parsedMinute = Number(parts.minute);

  if (Number.isNaN(parsedHour) || Number.isNaN(parsedMinute)) {
    return "";
  }

  let hour24 = parsedHour % 12;
  if (parts.period === "PM") {
    hour24 += 12;
  }

  return `${String(hour24).padStart(2, "0")}:${String(parsedMinute).padStart(2, "0")}`;
}

export default function TimePickerField({ value = "", onChange }) {
  const parts = parseTimeValue(value);

  const updatePart = (part, nextValue) => {
    const nextParts = {
      ...parts,
      [part]: nextValue,
    };

    if (part === "hour" && nextValue && !nextParts.minute) {
      nextParts.minute = "00";
    }

    if (!nextParts.hour) {
      onChange("");
      return;
    }

    onChange(to24Hour(nextParts));
  };

  return (
    <div className="time-picker-group">
      <select
        value={parts.hour}
        onChange={(event) => updatePart("hour", event.target.value)}
        className="form-input form-select"
        aria-label="Hora"
      >
        <option value="">Hora</option>
        {HOUR_OPTIONS.map((hour) => (
          <option key={hour} value={hour}>
            {hour}
          </option>
        ))}
      </select>

      <select
        value={parts.minute}
        onChange={(event) => updatePart("minute", event.target.value)}
        className="form-input form-select"
        aria-label="Minutos"
      >
        <option value="">Min</option>
        {MINUTE_OPTIONS.map((minute) => (
          <option key={minute} value={minute}>
            {minute}
          </option>
        ))}
      </select>

      <select
        value={parts.period}
        onChange={(event) => updatePart("period", event.target.value)}
        className="form-input form-select form-select-period"
        aria-label="AM o PM"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}