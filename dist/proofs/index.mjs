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
export {
  verifyExecutionProof
};
//# sourceMappingURL=index.mjs.map