import toast from "react-hot-toast";

export const notifySuccess = (msg) => toast.success(msg);
export const notifyError = (msg) => toast.error(msg);
export const notifyInfo = (msg) => toast(msg);
export const notifyLoading = (msg) => toast.loading(msg);

// Confirmación interactiva con botones
export function confirmToast(
  message,
  { okText = "Confirmar", cancelText = "Cancelar" } = {}
) {
  return new Promise((resolve) => {
    toast(
      (t) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <p style={{ margin: 0, fontWeight: 500, color: "#374151" }}>
            {message}
          </p>
          <div
            style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}
          >
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
              style={{
                background: "#f3f4f6",
                color: "#374151",
                border: "none",
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {okText}
            </button>
          </div>
        </div>
      ),
      {
        duration: 60000,
        style: { minWidth: "300px" },
      }
    );
  });
}
