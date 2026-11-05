// One request in flight, one latest pending revision. Dragging never fills a FIFO queue.
export function latestPreviewQueue(request, receive, status, failed) {
  let pending = null,
    latest = null,
    running = false,
    disposed = false;
  async function pump() {
    if (running || disposed) return;
    running = true;
    while (pending && !disposed) {
      const task = pending;
      pending = null;
      try {
        const result = await request(task.project);
        // Intermediate parameter frames are useful; old data/old chart frames are not.
        if (!disposed && task.identity === latest.identity)
          receive(result, task.project);
      } catch (e) {
        if (!disposed && task === latest) failed(e);
      }
    }
    running = false;
    if (!disposed) status(false);
  }
  return {
    submit(project, identity) {
      if (disposed) return;
      latest = pending = { project, identity };
      status(true);
      pump();
    },
    dispose() {
      disposed = true;
      pending = null;
    },
  };
}
