import { getStore } from "@netlify/blobs";

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

const response = (statusCode, body) => ({
  statusCode,
  headers,
  body: JSON.stringify(body)
});

export const handler = async (event) => {
  const url = new URL(event.rawUrl);
  const id = url.searchParams.get("id");

  if (!id) {
    return response(400, { error: "El id del tablero es obligatorio" });
  }

  const store = getStore("mapa-de-compromisos-tableros");
  const key = `${id}.json`;

  if (event.httpMethod === "GET") {
    const tablero = await store.get(key, { type: "json" });
    if (!tablero) {
      return response(404, { error: "Tablero no encontrado" });
    }
    return response(200, tablero);
  }

  if (event.httpMethod === "PUT") {
    const tablero = JSON.parse(event.body || "{}");
    await store.setJSON(key, tablero);
    return response(200, { ok: true });
  }

  return response(405, { error: "Método no permitido" });
};
