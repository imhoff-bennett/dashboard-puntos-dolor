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
  const requestUrl = event.rawUrl || `http://localhost${event.path || ""}`;
  const url = new URL(requestUrl);
  const id = url.searchParams.get("id") || event.queryStringParameters?.id;

  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
    return response(400, { error: "El id del tablero es obligatorio" });
  }

  const store = getStore("mapa-de-compromisos-tableros");
  const key = id;
  const legacyKey = `${id}.json`;

  try {
    if (event.httpMethod === "GET") {
      const tablero =
        (await store.get(key, { type: "json" })) ||
        (await store.get(legacyKey, { type: "json" }));

      if (!tablero) {
        return response(404, { error: "Tablero no encontrado" });
      }

      return response(200, tablero);
    }

    if (event.httpMethod === "PUT") {
      const tablero = JSON.parse(event.body || "{}");

      if (!tablero || tablero.id !== id) {
        return response(400, { error: "El tablero no coincide con el id solicitado" });
      }

      await store.setJSON(key, tablero);
      return response(200, { ok: true });
    }

    return response(405, { error: "Método no permitido" });
  } catch (error) {
    return response(500, {
      error: "No se pudo acceder al almacenamiento del tablero",
      detail: error?.message || "Error desconocido"
    });
  }
};
