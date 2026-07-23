import type { Department } from "@/context/SubjectsContext";

export function sortDepartments(departments: Department[], deptMaterialCounts: Record<string, number>): Department[] {
  return [...departments].sort((a, b) => {
    const aCount = deptMaterialCounts[a.id] || 0;
    const bCount = deptMaterialCounts[b.id] || 0;

    if (aCount !== bCount) {
      return bCount - aCount;
    }
    // Alphabetical order of code or name
    const aLabel = a.code || a.name || "";
    const bLabel = b.code || b.name || "";
    return aLabel.localeCompare(bLabel);
  });
}
