/**
 * returns 404
 * not found handler
 */
function notFoundHandlr(req, res) {
  if (req.method.toLocaleLowerCase() === "options") res.end();
  else res.status(404).json({ error: "Endpoint not found, try again" });
}

export default notFoundHandlr;
