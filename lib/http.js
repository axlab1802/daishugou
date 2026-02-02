async function readJson(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1e6) {
      throw new Error("BODY_TOO_LARGE");
    }
  }
  if (!body) return {};
  return JSON.parse(body);
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

module.exports = {
  readJson,
  sendJson,
};
