export const runStats = {
  fetchStats: {
    page1: 0,
    page2: 0,
    page3: 0,
    page4: 0,
    page5: 0,
    page6: 0,
    page7: 0,
    page8: 0,
    page9: 0,
    page10: 0,
    totalFetched: 0
  } as Record<string, number>,
  filterStats: {
    expiredRemoved: 0,
    duplicateRemoved: 0,
    invalidUrlRemoved: 0,
    remaining: 0
  }
};

export function resetStats() {
  runStats.fetchStats = {
    page1: 0,
    page2: 0,
    page3: 0,
    page4: 0,
    page5: 0,
    page6: 0,
    page7: 0,
    page8: 0,
    page9: 0,
    page10: 0,
    totalFetched: 0
  };
  runStats.filterStats = { expiredRemoved: 0, duplicateRemoved: 0, invalidUrlRemoved: 0, remaining: 0 };
}
