import type { Department } from "@/context/SubjectsContext";

export function sortDepartments(departments: Department[], deptsWithMaterials: Set<string>): Department[] {
  return [...departments].sort((a, b) => {
    const aHas = deptsWithMaterials.has(a.id);
    const bHas = deptsWithMaterials.has(b.id);
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    // Alphabetical order of code or name
    const aLabel = a.code || a.name || "";
    const bLabel = b.code || b.name || "";
    return aLabel.localeCompare(bLabel);
  });
}
