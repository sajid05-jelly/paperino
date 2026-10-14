import fs from "fs";
import path from "path";

export interface StoredSection {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  departmentId: string;
  departmentName: string;
  semesterId: string;
  sectionType: "pyq" | "notes" | "questions";
  createdBy?: string;
  creatorName?: string;
  creatorEmail?: string;
  approvedByAdminId?: string;
  approvedByAdminEmail?: string;
  createdAt?: any;
}

const DATA_DIR = path.join(process.cwd(), "src", "data");
const FILE_PATH = path.join(DATA_DIR, "configured_sections.json");

function ensureDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getStoredSections(): StoredSection[] {
  try {
    ensureDirectory();
    if (!fs.existsSync(FILE_PATH)) {
      return [];
    }
    const content = fs.readFileSync(FILE_PATH, "utf-8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Error reading stored sections:", err);
    return [];
  }
}

export function setStoredSections(sections: StoredSection[]): void {
  try {
    ensureDirectory();
    fs.writeFileSync(FILE_PATH, JSON.stringify(sections, null, 2), "utf-8");
  } catch (err) {
    console.error("Error setting stored sections:", err);
  }
}

export function saveStoredSection(section: StoredSection): StoredSection[] {
  try {
    ensureDirectory();
    const sections = getStoredSections();
    const existingIndex = sections.findIndex(
      s => s.departmentId === section.departmentId &&
           String(s.semesterId) === String(section.semesterId) &&
           s.subjectId === section.subjectId &&
           s.sectionType === section.sectionType
    );

    if (existingIndex >= 0) {
      sections[existingIndex] = { ...sections[existingIndex], ...section };
    } else {
      sections.push(section);
    }

    fs.writeFileSync(FILE_PATH, JSON.stringify(sections, null, 2), "utf-8");
    return sections;
  } catch (err) {
    console.error("Error saving stored section:", err);
    return [];
  }
}

export function removeStoredSection(
  sectionId?: string,
  departmentId?: string,
  semesterId?: string,
  subjectId?: string,
  sectionType?: string
): StoredSection[] {
  try {
    ensureDirectory();
    let sections = getStoredSections();
    sections = sections.filter(s => {
      if (sectionId && s.id === sectionId) return false;
      if (
        departmentId && semesterId && subjectId && sectionType &&
        s.departmentId === departmentId &&
        String(s.semesterId) === String(semesterId) &&
        s.subjectId === subjectId &&
        s.sectionType === sectionType
      ) {
        return false;
      }
      return true;
    });

    fs.writeFileSync(FILE_PATH, JSON.stringify(sections, null, 2), "utf-8");
    return sections;
  } catch (err) {
    console.error("Error removing stored section:", err);
    return [];
  }
}
