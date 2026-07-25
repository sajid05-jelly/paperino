import type { Department } from "@/context/SubjectsContext";

export function sortDepartments(departments: Department[], deptMaterialCounts: Record<string, number>): Department[] {
  return [...departments].sort((a, b) => {
    // Custom priority logic
    const getPriority = (dept: Department) => {
      const id = dept.id.toLowerCase();
      const name = (dept.name || "").toLowerCase();
      
      if (id === "btech") return 1;
      if (id === "bot" || id.includes("occupational") || name.includes("occupational therapy")) return 2;
      if (id === "mca") return 3;
      return 4;
    };

    const pA = getPriority(a);
    const pB = getPriority(b);

    if (pA !== pB) {
      return pA - pB;
    }

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
