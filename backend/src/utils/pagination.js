export function parsePaging(req, defaults = { limit: 20, skip: 0, max: 100 }) {
  const limit = Math.max(1, Math.min(Number(req.query?.limit ?? defaults.limit), defaults.max));
  const page  = Math.max(1, Number(req.query?.page ?? 1));
  const skip  = Number.isFinite(Number(req.query?.skip)) ? Math.max(0, Number(req.query.skip)) : (page - 1) * limit;
  return { limit, skip };
}
