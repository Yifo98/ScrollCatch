(function exposeWorkbenchUtils(global) {
  const PAGE_CUT_EDGE_GAP = 0.002;
  const PAGE_DRAG_EDGE_SIZE = 72;
  const PAGE_DRAG_MAX_SPEED = 46;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function clampDraggedPageCut(fractions, index, fraction, gap = PAGE_CUT_EDGE_GAP) {
    const previous = index > 0 ? Number(fractions[index - 1]) : 0;
    const next = index < fractions.length - 1 ? Number(fractions[index + 1]) : 1;
    const min = clamp(previous + gap, gap, 1 - gap);
    const max = clamp(next - gap, min, 1 - gap);
    return Math.round(clamp(Number(fraction) || 0, min, max) * 10000) / 10000;
  }

  function getPageDragAutoScrollVelocity(
    clientY,
    viewportTop,
    viewportBottom,
    edgeSize = PAGE_DRAG_EDGE_SIZE,
    maxSpeed = PAGE_DRAG_MAX_SPEED
  ) {
    const topEdge = viewportTop + edgeSize;
    const bottomEdge = viewportBottom - edgeSize;
    if (clientY < topEdge) {
      const strength = clamp((topEdge - clientY) / edgeSize, 0, 1);
      return -Math.max(1, Math.round(maxSpeed * strength));
    }
    if (clientY > bottomEdge) {
      const strength = clamp((clientY - bottomEdge) / edgeSize, 0, 1);
      return Math.max(1, Math.round(maxSpeed * strength));
    }
    return 0;
  }

  function applyCropEnabledToSections(sections, enabled, getFullCrop) {
    for (const section of sections || []) {
      if (!section?.state) {
        continue;
      }
      section.state.enableCrop = Boolean(enabled);
      if (!section.state.crop && typeof getFullCrop === "function") {
        section.state.crop = getFullCrop(section);
      }
    }
    return sections;
  }

  function reorderItemsById(items, activeId, direction) {
    const nextItems = Array.isArray(items) ? [...items] : [];
    const currentIndex = nextItems.findIndex((item) => item?.id === activeId);
    const nextIndex = currentIndex + Number(direction || 0);
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= nextItems.length) {
      return nextItems;
    }
    [nextItems[currentIndex], nextItems[nextIndex]] = [nextItems[nextIndex], nextItems[currentIndex]];
    return nextItems;
  }

  function buildRegularPageCutFractions(outputHeight, pageHeight) {
    const height = Math.max(1, Math.round(Number(outputHeight) || 0));
    const step = Math.max(1, Math.round(Number(pageHeight) || height));
    const fractions = [];
    for (let cursor = step; cursor < height; cursor += step) {
      fractions.push(cursor / height);
    }
    return fractions;
  }

  global.XFWorkbenchUtils = {
    PAGE_CUT_EDGE_GAP,
    PAGE_DRAG_EDGE_SIZE,
    PAGE_DRAG_MAX_SPEED,
    applyCropEnabledToSections,
    buildRegularPageCutFractions,
    clampDraggedPageCut,
    getPageDragAutoScrollVelocity,
    reorderItemsById
  };
})(globalThis);
