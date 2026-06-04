import { getStore } from "@netlify/blobs";

const STORE_NAME = "mapa-de-compromisos-tableros";

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

const response = (statusCode, body) => ({
  statusCode,
  headers,
  body: JSON.stringify(body)
});

const missingBlobEnvironmentResponse = () => {
  const missing = [];
  if (!process.env.NETLIFY_SITE_ID && !process.env.SITE_ID) {
    missing.push("NETLIFY_SITE_ID");
  }
  if (!process.env.NETLIFY_BLOBS_TOKEN && !process.env.NETLIFY_AUTH_TOKEN) {
    missing.push("NETLIFY_BLOBS_TOKEN");
  }

  return response(500, {
    error: "Faltan variables de entorno para Netlify Blobs",
    detail: `Configurá ${missing.join(" y ")} en Netlify para poder guardar tableros compartibles.`
  });
};

const getBoardsStore = () => {
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  const token = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN;

  if (siteID && token) {
    return getStore({
      name: STORE_NAME,
      siteID,
      token
    });
  }

  return getStore(STORE_NAME);
};

const isMissingBlobsEnvironmentError = (error) =>
  error?.name === "MissingBlobsEnvironmentError" ||
  String(error?.message || "").includes("MissingBlobsEnvironmentError") ||
  String(error?.message || "").includes("environment has not been configured to use Netlify Blobs");

export const handler = async (event) => {
  const requestUrl = event.rawUrl || `http://localhost${event.path || ""}`;
  const url = new URL(requestUrl);
  const id = url.searchParams.get("id") || event.queryStringParameters?.id;

  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
    return response(400, { error: "El id del tablero es obligatorio" });
  }

  const key = id;
  const legacyKey = `${id}.json`;

  try {
    const store = getBoardsStore();

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
    if (isMissingBlobsEnvironmentError(error)) {
      return missingBlobEnvironmentResponse();
    }

    return response(500, {
      error: "No se pudo acceder al almacenamiento del tablero",
      detail: error?.message || "Error desconocido"
    });
  }
};
