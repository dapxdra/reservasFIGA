import { db } from "../../lib/firebaseadmin.js";

export async function GET() {
  try {
    const snapshot = await db.collection("canceladas").get();
    const canceladas = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return new Response(JSON.stringify(canceladas), { status: 200 });
  } catch (error) {
    console.error("Error obteniendo reservas canceladas:", error);
    return new Response(JSON.stringify({ message: "Error en el servidor" }), {
      status: 500,
    });
  }
}
