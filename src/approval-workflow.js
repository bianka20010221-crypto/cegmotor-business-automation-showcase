const transitions = {
  proposed: new Set(["approved", "rejected"]),
  approved: new Set(["executing", "cancelled"]),
  executing: new Set(["completed", "failed"]),
  rejected: new Set(),
  cancelled: new Set(),
  completed: new Set(),
  failed: new Set(["approved"]),
};

export function proposeAction({ workspaceId, actorId, action, payload }) {
  if (!workspaceId || !actorId || !action) throw new Error("missing_action_context");
  return {
    id: crypto.randomUUID(),
    workspaceId,
    actorId,
    action,
    payload,
    status: "proposed",
    createdAt: new Date().toISOString(),
    audit: [{ event: "proposed", by: actorId }],
  };
}

export function transition(proposal, nextStatus, userId) {
  if (!transitions[proposal.status]?.has(nextStatus)) {
    throw new Error(`invalid_transition:${proposal.status}:${nextStatus}`);
  }
  return {
    ...proposal,
    status: nextStatus,
    audit: [...proposal.audit, { event: nextStatus, by: userId }],
  };
}

export function canExecute(proposal) {
  return proposal.status === "approved";
}

