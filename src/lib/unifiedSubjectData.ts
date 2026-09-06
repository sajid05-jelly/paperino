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
  updatedAt?: any;
  createdAt?: any;
}

export interface UnifiedDepartment {
  id: string;
  name: string;
  code: string;
  totalSemesters: number;
  status?: string;
  updatedAt?: any;
  createdAt?: any;
}

import { cache } from "react";
import { logFirestoreRead, logFirestoreCacheHit } from "@/lib/firestoreDiagnostics";

let inMemoryUnifiedData: {
  departments: UnifiedDepartment[];
  subjects: UnifiedSubject[];
} | null = null;
let lastUnifiedFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minute TTL — reduces Firestore reads while still detecting new subjects reasonably fast

/**
 * Unified Data Provider for All Courses, Semesters, and Subjects in Paperino.
 * Combines both static default subjects and dynamic Firestore departments/subjects.
 * Serves as the Single Source of Truth for Sitemap, Routing, Metadata & Structured Data.
 */
export const getAllUnifiedData = cache(async (forceRefetch = false): Promise<{
  departments: UnifiedDepartment[];
  subjects: UnifiedSubject[];
}> => {
  const now = Date.now();
  if (!forceRefetch && inMemoryUnifiedData && (now - lastUnifiedFetchTime) < CACHE_TTL_MS) {
    logFirestoreCacheHit("getAllUnifiedData", `Serving ${inMemoryUnifiedData.subjects.length} subjects from 1m server cache`);
    return inMemoryUnifiedData;
  }

  logFirestoreRead("departments & dynamic_subjects", "getAllUnifiedData cache miss - executing server fetch");
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
      // 3s timeout to prevent hanging when Firestore quota is exhausted
      const timeoutMs = 3000;
      const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore fetch timeout")), ms));

      const [deptResult, subResult] = await Promise.allSettled([
        Promise.race([adminDb.collection("departments").get(), timeout(timeoutMs)]),
        Promise.race([adminDb.collection("dynamic_subjects").get(), timeout(timeoutMs)]),
      ]);

      if (deptResult.status === "fulfilled" && deptResult.value) {
        deptDocs = (deptResult.value as any).docs.map((d: any) => ({ id: d.id, ...d.data() }));
      }
      if (subResult.status === "fulfilled" && subResult.value) {
        subjectDocs = (subResult.value as any).docs.map((d: any) => ({ id: d.id, ...d.data() }));
      }
    } else if (db) {
      // Client-side or fallback Firebase Client SDK execution
      const deptSnap = await getDocs(collection(db, "departments"));
      deptDocs = deptSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const subSnap = await getDocs(collection(db, "dynamic_subjects"));
      subjectDocs = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // Process Dynamic Departments
    deptDocs.forEach((d) => {
      const codeUpper = (d.code || "").toUpperCase().trim();
      const nameLower = (d.name || "").toLowerCase().trim();
      if (codeUpper === "COM" || codeUpper === "BTE" || codeUpper === "BME" || nameLower === "computer network" || nameLower === "btech cse aiml" || nameLower.includes("biomedical eng")) {
        return;
      }
      if (d.status === "approved" || !d.status) {
        departmentsMap.set(d.id, {
          id: d.id,
          name: d.name || d.id.toUpperCase(),
          code: d.code || d.name || d.id.toUpperCase(),
          totalSemesters: d.totalSemesters || 8,
          status: d.status || "approved",
          updatedAt: d.updatedAt || d.createdAt || null,
          createdAt: d.createdAt || null,
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
            updatedAt: s.updatedAt || s.createdAt || null,
            createdAt: s.createdAt || null,
          });
        }
      }
    });
  } catch (err) {
    console.warn("[getAllUnifiedData] Dynamic Firestore fetch skipped or deferred:", err);
  }

  const result = {
    departments: Array.from(departmentsMap.values()),
    subjects: subjectsList,
  };

  inMemoryUnifiedData = result;
  lastUnifiedFetchTime = Date.now();

  return result;
});

/**
 * Fetch metadata parameters for a specific subject dynamically from the unified data source.
 */
export async function getSubjectDetails(deptId: string, semId: string, subjectIdOrSlug: string): Promise<{
  subjectName: string;
  subjectCode: string;
  deptName: string;
  deptCode: string;
  updatedAt?: any;
  createdAt?: any;
}> {
  const { departments, subjects } = await getAllUnifiedData();
  
  const target = subjectIdOrSlug.toLowerCase().trim();
  const normalize = (str: string) => (str || "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
  const normalizedTarget = normalize(target);

  const deptSubjects = subjects.filter(
    s => s.departmentId.toLowerCase() === deptId.toLowerCase() && String(s.semesterId) === String(semId)
  );

  const foundSubject = deptSubjects.find(
    s => s.id.toLowerCase() === target ||
         normalize(s.id) === normalizedTarget ||
         normalize(s.name) === normalizedTarget ||
         (s.code && normalize(s.code).replace(/-/g, "") === target.replace(/[^a-z0-9]/g, "")) ||
         normalizedTarget.includes(normalize(s.name)) ||
         normalize(s.name).includes(normalizedTarget)
  );

  const foundDept = departments.find(d => d.id.toLowerCase() === deptId.toLowerCase());

  let subjectName = foundSubject ? foundSubject.name : subjectIdOrSlug.replace(/([a-zA-Z]+)(\d+)/, '$1 $2').toUpperCase();
  let subjectCode = foundSubject?.code || "";
  let deptName = foundDept ? foundDept.name : (deptId === "btech" ? "Bachelor of Technology" : deptId.toUpperCase());
  let deptCode = foundDept ? foundDept.code : (deptId === "btech" ? "B.Tech" : deptId.toUpperCase());

  return {
    subjectName,
    subjectCode,
    deptName,
    deptCode,
    updatedAt: foundSubject?.updatedAt || foundDept?.updatedAt || null,
    createdAt: foundSubject?.createdAt || foundDept?.createdAt || null,
  };
}
