import crypto from "node:crypto";

export default class DeterministicHash {
  /**
   * Genera un hash determinístico SHA-256
   * @param {string} id
   * @param {string} namespace (opcional)
   * @returns {string}
   */
  static generate(id, namespace = "kyrnex-host") {
    if (!id || typeof id !== "string") {
      throw new Error("ID must be a valid string");
    }

    const normalized = `${namespace}:${id.trim().toLowerCase()}`;

    return crypto.createHash("sha256").update(normalized).digest("hex");
  }

  /**
   * Versión corta del hash (ej: para subdominios internos)
   */
  static short(id, length = 32, namespace = "kyrnex-host") {
    const fullHash = this.generate(id, namespace);
    return fullHash.slice(0, length);
  }
}
