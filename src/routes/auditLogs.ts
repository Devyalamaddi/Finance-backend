import { Router } from "express";
import { authRequired, requireRoles } from "../middlewares/auth";
import { auditLogsQuerySchema } from "../schemas";
import { getAuditLogs, getEntityAuditTrail } from "../services/auditLog";
import { HttpError } from "../utils/httpError";

const router = Router();
router.use(authRequired);


 //Get all audit logs (admin only).
 //USP: Complete audit trail visibility for compliance and fraud detection.

router.get("/", requireRoles("admin"), async (req, res) => {
  const q = auditLogsQuerySchema.parse(req.query);

  const { logs, total } = await getAuditLogs({
    limit: q.limit,
    offset: q.offset,
    action: q.action,
    entityType: q.entity_type,
    userId: q.user_id,
    fromDate: q.from_date,
    toDate: q.to_date,
  });

  res.json({
    total,
    limit: q.limit,
    offset: q.offset,
    data: logs,
  });
});


 //Get audit trail for a specific entity.
 //Shows complete history of changes to a record.

router.get("/entity/:entityType/:entityId", requireRoles("admin"), async (req, res) => {
  const { entityType, entityId } = req.params;

  if (!entityType || !entityId) {
    throw new HttpError(400, "BAD_REQUEST", "Entity type and ID are required");
  }

  const trail = await getEntityAuditTrail(entityType as string, entityId as string);

  res.json({
    entityType,
    entityId,
    trail,
  });
});

export default router;
