"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/proofs/index.ts
var proofs_exports = {};
__export(proofs_exports, {
  verifyExecutionProof: () => verifyExecutionProof
});
module.exports = __toCommonJS(proofs_exports);

// src/payment/a2a-client.ts
async function request(baseUrl, path, init, accessToken) {
  const base = baseUrl.replace(/\/$/, "");
  const headers = {
    ...init?.headers ?? {}
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const resp = await fetch(`${base}${path}`, { ...init, headers });
  if (!resp.ok) {
    let message = `Payments request failed (${resp.status}): ${path}`;
    try {
      const body = await resp.json();
      if (body.error) message = body.error;
    } catch {
    }
    throw new Error(message);
  }
  return resp.json();
}

// src/proofs/index.ts
async function verifyExecutionProof(baseUrl, proof, accessToken) {
  return request(
    baseUrl,
    "/api/v1/proofs/verify",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proof })
    },
    accessToken
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  verifyExecutionProof
});
//# sourceMappingURL=index.js.map