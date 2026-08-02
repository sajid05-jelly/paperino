import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { adminDb } from "@/lib/firebase-admin";
import { SUBJECTS as STATIC_SUBJECTS } from "@/lib/subjects";

export interface UnifiedSubject {
  id: string; // subjectId (e.g., 'chem', 'ml')
  name: string; // Subject Name
  code?: string;
  departmentId: string; // e.g. 'btech', 'mca', 'cse'
  departmentName?: string; // e.g. 'Bachelor of Technology', 'Master of Computer Applications'
  semesterId: string; // e.g. '1', '2'
  status?: string;
}

export interface UnifiedDepartment {
  id: string;
  name: string;
  code: string;
  totalSemesters: number;
  status?: string;
}

/**
 * Unified Data Provider for All Courses, Semesters, and Subjects in Paperino.
 * Combines both static default subjects and dynamic Firestore departments/subjects.
 * Serves as the Single Source of Truth for Sitemap, Routing, Metadata & Structured Data.
 */
export async function getAllUnifiedData(): Promise<{
  departments: UnifiedDepartment[];
  subjects: UnifiedSubject[];
}> {
  const departmentsMap = new Map<string, UnifiedDepartment>();
  const subjectsList: UnifiedSubject[] = [];
  const subjectKeysSet = new Set<string>();

  // 1. Add Default B.Tech Department
  departmentsMap.set("btech", {
    id: "btech",
    name: "Bachelor of Technology",
    code: "B.Tech",
    totalSemesters: 8,
    status: "approved",
  });

  // 2. Add Static Default Subjects (B.Tech Semesters 1-8)
  Object.entries(STATIC_SUBJECTS).forEach(([semId, subs]) => {
    subs.forEach((s) => {
      const uniqueKey = `btech_${semId}_${s.id}`;
      subjectKeysSet.add(uniqueKey);
      subjectsList.push({
        id: s.id,
        name: s.name,
        code: "",
        departmentId: "btech",
        departmentName: "Bachelor of Technology",
        semesterId: semId,
        status: "approved",
      });
    });
  });

  // 3. Fetch Dynamic Departments & Dynamic Subjects from Firestore
  try {
    let deptDocs: any[] = [];
    let subjectDocs: any[] = [];

    if (typeof window === "undefined" && adminDb) {
      // Server-side Node / Build execution via Firebase Admin
      const deptSnap = await adminDb.collection("departments").get();
      deptDocs = deptSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const subSnap = await adminDb.collection("dynamic_subjects").get();
      subjectDocs = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else if (db) {
      // Client-side or fallback Firebase Client SDK execution
      const deptSnap = await getDocs(collection(db, "departments"));
      deptDocs = deptSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const subSnap = await getDocs(collection(db, "dynamic_subjects"));
      subjectDocs = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // Process Dynamic Departments
    deptDocs.forEach((d) => {
      if (d.status === "approved" || !d.status) {
        departmentsMap.set(d.id, {
          id: d.id,
          name: d.name || d.id.toUpperCase(),
          code: d.code || d.name || d.id.toUpperCase(),
          totalSemesters: d.totalSemesters || 8,
          status: d.status || "approved",
        });
      }
    });

    // Process Dynamic Subjects
    subjectDocs.forEach((s) => {
      if (s.status === "approved" || !s.status) {
        const deptId = s.departmentId || "btech";
        const semId = String(s.semesterId || "1");
        const subId = s.subjectId || s.id;
        const uniqueKey = `${deptId}_${semId}_${subId}`;

        if (!subjectKeysSet.has(uniqueKey)) {
          subjectKeysSet.add(uniqueKey);
          const deptObj = departmentsMap.get(deptId);

          subjectsList.push({
            id: subId,
            name: s.name || subId,
            code: s.code || "",
            departmentId: deptId,
            departmentName: deptObj ? deptObj.name : deptId.toUpperCase(),
            semesterId: semId,
            status: s.status || "approved",
          });
        }
      }
    });
  } catch (err) {
    console.warn("[getAllUnifiedData] Dynamic Firestore fetch skipped or deferred:", err);
  }

  return {
    departments: Array.from(departmentsMap.values()),
    subjects: subjectsList,
  };
}

/**
 * Fetch metadata parameters for a specific subject dynamically from the unified data source.
 */
export async function getSubjectDetails(deptId: string, semId: string, subjectId: string): Promise<{
  subjectName: string;
  deptName: string;
  deptCode: string;
}> {
  const { departments, subjects } = await getAllUnifiedData();
  
  const foundSubject = subjects.find(
    s => s.departmentId === deptId && s.semesterId === String(semId) && s.id === subjectId
  );

  const foundDept = departments.find(d => d.id === deptId);

  let subjectName = foundSubject ? foundSubject.name : subjectId.replace(/([a-zA-Z]+)(\d+)/, '$1 $2').toUpperCase();
  let deptName = foundDept ? foundDept.name : (deptId === "btech" ? "Bachelor of Technology" : deptId.toUpperCase());
  let deptCode = foundDept ? foundDept.code : (deptId === "btech" ? "B.Tech" : deptId.toUpperCase());

  return {
    subjectName,
    deptName,
    deptCode,
  };
}
