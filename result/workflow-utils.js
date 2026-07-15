(function attachResultWorkflow(root) {
  function hasResumePosition(segment) {
    return Number.isFinite(Number(segment?.nextScrollTop))
      || Number.isFinite(Number(segment?.endScrollTop));
  }

  function getSourceActionState(capture) {
    const hasSource = Number.isInteger(capture?.source?.tabId)
      || Boolean(String(capture?.source?.url || "").trim());
    const segment = capture?.segment;
    const hasSavedPosition = hasResumePosition(segment);
    const canContinue = hasSource
      && hasSavedPosition
      && segment?.canReturnToSource !== false
      && segment?.reason !== "complete";

    return {
      show: hasSource,
      canReturn: hasSource,
      canReturnToSavedEnd: hasSource && hasSavedPosition,
      canContinue,
    };
  }

  function getContinuousCaptureIds(items, currentId) {
    const captures = Array.isArray(items) ? items.filter((item) => item?.id) : [];
    const byId = new Map(captures.map((item) => [item.id, item]));
    if (!currentId) {
      return [];
    }
    if (!byId.has(currentId)) {
      return [currentId];
    }

    const links = new Map(captures.map((item) => [item.id, new Set()]));
    for (const item of captures) {
      const parentId = item.segment?.parentCaptureId;
      if (!parentId || !byId.has(parentId)) {
        continue;
      }
      links.get(item.id).add(parentId);
      links.get(parentId).add(item.id);
    }

    const connected = new Set([currentId]);
    const queue = [currentId];
    while (queue.length) {
      const id = queue.shift();
      for (const linkedId of links.get(id) || []) {
        if (connected.has(linkedId)) {
          continue;
        }
        connected.add(linkedId);
        queue.push(linkedId);
      }
    }

    return captures
      .filter((item) => connected.has(item.id))
      .sort(compareContinuousCaptures)
      .map((item) => item.id);
  }

  function shouldKeepPagedExportsVisible(capture) {
    return capture?.target?.captureStrategy === "pages"
      || capture?.target?.captureMode === "pages";
  }

  function shouldKeepCaptureCacheAfterExport(capture, options = {}) {
    return getSourceActionState(capture).canContinue
      || Number(options.linkedSectionCount) > 1;
  }

  function getQuickPreviewPlan(items, currentId, totalPixelBudget = 8_000_000) {
    const ids = getContinuousCaptureIds(items, currentId);
    const sectionCount = Math.max(1, ids.length);
    return {
      ids,
      pixelBudgetPerSection: Math.max(250_000, Math.floor(totalPixelBudget / sectionCount))
    };
  }

  function compareContinuousCaptures(a, b) {
    const startDifference = numericSortValue(a.segment?.startScrollTop) - numericSortValue(b.segment?.startScrollTop);
    if (startDifference) {
      return startDifference;
    }
    const partDifference = numericSortValue(a.segment?.part) - numericSortValue(b.segment?.part);
    if (partDifference) {
      return partDifference;
    }
    return dateSortValue(a.capturedAt) - dateSortValue(b.capturedAt);
  }

  function numericSortValue(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : Number.MAX_SAFE_INTEGER;
  }

  function dateSortValue(value) {
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
  }

  root.XFResultWorkflow = {
    getContinuousCaptureIds,
    getQuickPreviewPlan,
    getSourceActionState,
    hasResumePosition,
    shouldKeepCaptureCacheAfterExport,
    shouldKeepPagedExportsVisible
  };
})(globalThis);
