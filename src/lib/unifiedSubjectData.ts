import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { adminDb } from "@/lib/firebase-admin";
import { SUBJECTS as STATIC_SUBJECTS, COMPREHENSIVE_CATALOG, DEFAULT_DEPARTMENTS } from "@/lib/subjects";

export interface UnifiedSubject {
  id: string; // subjectId (e.g., 'chem', 'ml')
  name: string; // Subject Name
  code?: string;
  departmentId: string; // e.g. 'btech', 'mca', 'cse'
  departmentName?: string; // e.g. 'Bachelor of Technology', 'Master of Computer Applications'
  semesterId: string; // e.g. '1', '2'
  sections?: string[];
  status?: string;
  updatedAt?: any;
  createdAt?: any;
}

export interface UnifiedDepartment {
  id: string;
  name: string;
  code: string;
  totalSemesters: number;
  parentCourse?: string;
  status?: string;
  updatedAt?: any;
  createdAt?: any;
}

import { cache } from "react";
import fs from "fs";
import path from "path";
import { logFirestoreRead, logFirestoreCacheHit } from "@/lib/firestoreDiagnostics";

let inMemoryUnifiedData: {
  departments: UnifiedDepartment[];
  subjects: UnifiedSubject[];
} | null = null;
let lastUnifiedFetchTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 60m TTL to protect read quota across crawlers & SSR

let memoizedStaticUnifiedData: {
  departments: UnifiedDepartment[];
  subjects: UnifiedSubject[];
} | null = null;

export function isCrawlerUserAgent(userAgent?: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  const botKeywords = [
    "bot", "crawler", "spider", "googlebot", "bingbot", "yandex",
    "baiduspider", "duckduckbot", "slurp", "ahrefs", "semrush",
    "dotbot", "petalbot", "facebookexternalhit", "twitterbot", "linkedinbot",
    "feedfetcher", "mediapartners", "headlesschrome", "bytespider"
  ];
  return botKeywords.some(kw => ua.includes(kw));
}

/**
 * 100% Static Catalog Fallback (Zero Firestore Reads).
 * Immediately resolves all 273 pre-configured subjects and all canonical departments
 * from local memory / comprehensive_catalog.json without any network or database calls.
 */
export function getStaticUnifiedData(filterDeptId?: string, filterSemId?: string): {
  departments: UnifiedDepartment[];
  subjects: UnifiedSubject[];
} {
  if (!memoizedStaticUnifiedData) {
    const departmentsMap = new Map<string, UnifiedDepartment>();
    DEFAULT_DEPARTMENTS.forEach((dept) => {
      departmentsMap.set(dept.id, {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        totalSemesters: dept.totalSemesters,
        status: dept.status,
      });
    });

    const subjectsList: UnifiedSubject[] = [];
    const subjectKeysSet = new Set<string>();

    COMPREHENSIVE_CATALOG.forEach((s) => {
      const deptId = (s.departmentId || "btech").toLowerCase().trim();
      const semId = String(s.semesterId || "1").trim();
      const subId = (s.id || "").toLowerCase().trim();
      const uniqueKey = `${deptId}_${semId}_${subId}`;

      if (!subjectKeysSet.has(uniqueKey)) {
        subjectKeysSet.add(uniqueKey);
        const deptObj = departmentsMap.get(deptId);
        subjectsList.push({
          id: subId,
          name: s.name,
          code: s.code || "",
          departmentId: deptId,
          departmentName: deptObj ? deptObj.name : deptId.toUpperCase(),
          semesterId: semId,
          sections: s.sections,
          status: "approved",
        });
      }
    });

    memoizedStaticUnifiedData = {
      departments: Array.from(departmentsMap.values()),
      subjects: subjectsList,
    };
  }

  if (filterDeptId || filterSemId) {
    return {
      departments: filterDeptId
        ? memoizedStaticUnifiedData.departments.filter(d => d.id === filterDeptId)
        : memoizedStaticUnifiedData.departments,
      subjects: memoizedStaticUnifiedData.subjects.filter(s => {
        if (filterDeptId && s.departmentId !== filterDeptId) return false;
        if (filterSemId && s.semesterId !== filterSemId) return false;
        return true;
      }),
    };
  }

  return memoizedStaticUnifiedData;
}

const DISK_CACHE_DIR = path.join(process.cwd(), "node_modules", ".cache");
const DISK_CACHE_PATH = path.join(DISK_CACHE_DIR, "unified_subjects_cache.json");

function getDiskCache(): { departments: UnifiedDepartment[]; subjects: UnifiedSubject[] } | null {
  try {
    if (typeof window === "undefined" && fs.existsSync(DISK_CACHE_PATH)) {
      const stat = fs.statSync(DISK_CACHE_PATH);
      if (Date.now() - stat.mtimeMs < CACHE_TTL_MS) {
        const raw = fs.readFileSync(DISK_CACHE_PATH, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.departments) && Array.isArray(parsed.subjects) && parsed.subjects.length > 0) {
          return parsed;
        }
      }
    }
  } catch {}
  return null;
}

function setDiskCache(data: { departments: UnifiedDepartment[]; subjects: UnifiedSubject[] }) {
  try {
    if (typeof window === "undefined") {
      if (!fs.existsSync(DISK_CACHE_DIR)) {
        fs.mkdirSync(DISK_CACHE_DIR, { recursive: true });
      }
      fs.writeFileSync(DISK_CACHE_PATH, JSON.stringify(data), "utf8");
    }
  } catch {}
}

export function invalidateUnifiedDataCache() {
  inMemoryUnifiedData = null;
  lastUnifiedFetchTime = 0;
  try {
    if (typeof window === "undefined" && fs.existsSync(DISK_CACHE_PATH)) {
      fs.unlinkSync(DISK_CACHE_PATH);
    }
  } catch {}
}

/**
 * Unified Data Provider for All Courses, Semesters, and Subjects in Paperino.
 * Combines comprehensive default subjects and dynamic Firestore departments/subjects.
 * Resilient against Firestore quota exhaustion.
 */
export const getAllUnifiedData = cache(async (
  forceRefetch = false,
  filterDeptId?: string,
  filterSemId?: string
): Promise<{
  departments: UnifiedDepartment[];
  subjects: UnifiedSubject[];
}> => {
  // During static build generation, skip Firestore queries entirely
  if (process.env.NEXT_PHASE === "phase-production-build" || process.env.IS_NEXT_BUILD === "true") {
    return getStaticUnifiedData(filterDeptId, filterSemId);
  }

  const now = Date.now();
  if (!forceRefetch && inMemoryUnifiedData && (now - lastUnifiedFetchTime) < CACHE_TTL_MS) {
    if (!filterDeptId && !filterSemId) {
      logFirestoreCacheHit("getAllUnifiedData", `Serving ${inMemoryUnifiedData.subjects.length} subjects from 30m server cache`);
      return inMemoryUnifiedData;
    } else {
      logFirestoreCacheHit("getAllUnifiedData", `Serving filtered subjects from global 30m server cache`);
      return {
        departments: filterDeptId 
          ? inMemoryUnifiedData.departments.filter(d => d.id === filterDeptId)
          : inMemoryUnifiedData.departments,
        subjects: inMemoryUnifiedData.subjects.filter(s => {
          if (filterDeptId && s.departmentId !== filterDeptId) return false;
          if (filterSemId && s.semesterId !== filterSemId) return false;
          return true;
        })
      };
    }
  }

  // Cross-worker disk cache check
  if (!forceRefetch) {
    const diskCached = getDiskCache();
    if (diskCached) {
      inMemoryUnifiedData = diskCached;
      lastUnifiedFetchTime = Date.now();
      logFirestoreCacheHit("getAllUnifiedData", `Serving ${diskCached.subjects.length} subjects from multi-worker disk cache`);
      if (!filterDeptId && !filterSemId) {
        return diskCached;
      }
      return {
        departments: filterDeptId 
          ? diskCached.departments.filter(d => d.id === filterDeptId)
          : diskCached.departments,
        subjects: diskCached.subjects.filter(s => {
          if (filterDeptId && s.departmentId !== filterDeptId) return false;
          if (filterSemId && s.semesterId !== filterSemId) return false;
          return true;
        })
      };
    }
  }

  logFirestoreRead("departments & dynamic_subjects", "getAllUnifiedData cache miss - executing catalog fetch");
  const departmentsMap = new Map<string, UnifiedDepartment>();
  const subjectsList: UnifiedSubject[] = [];
  const subjectKeysSet = new Set<string>();

  // 1. Seed All Canonical Default Departments (Resilience against Firestore downtime/quota exhaustion)
  DEFAULT_DEPARTMENTS.forEach((dept) => {
    departmentsMap.set(dept.id, {
      id: dept.id,
      name: dept.name,
      code: dept.code,
      totalSemesters: dept.totalSemesters,
      status: dept.status,
    });
  });

  // 2. Add Pre-Configured Catalog Subjects (strictly filtered to subjects with >= 1 study material)
  COMPREHENSIVE_CATALOG.forEach((s) => {
    const deptId = (s.departmentId || "btech").toLowerCase().trim();
    const semId = String(s.semesterId || "1").trim();
    const subId = (s.id || "").toLowerCase().trim();
    const uniqueKey = `${deptId}_${semId}_${subId}`;

    if (!subjectKeysSet.has(uniqueKey)) {
      subjectKeysSet.add(uniqueKey);
      const deptObj = departmentsMap.get(deptId);
      subjectsList.push({
        id: subId,
        name: s.name,
        code: s.code || "",
        departmentId: deptId,
        departmentName: deptObj ? deptObj.name : deptId.toUpperCase(),
        semesterId: semId,
        sections: s.sections,
        status: "approved",
      });
    }
  });

  // 4. Fetch Dynamic Departments & Dynamic Subjects from Firestore (Merge live user submissions)
  try {
    let deptDocs: any[] = [];
    let subjectDocs: any[] = [];

    if (typeof window === "undefined" && adminDb) {
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
      const deptSnap = await getDocs(collection(db, "departments"));
      deptDocs = deptSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const subSnap = await getDocs(collection(db, "dynamic_subjects"));
      subjectDocs = subSnap.docs.map((d: any) => ({ id: d.id, ...(d.data() || {}) }));
    }

    // Process Dynamic Departments
    deptDocs.forEach((d) => {
      if (d.status !== "rejected") {
        const serializeTimestamp = (ts: any) => {
          if (!ts) return null;
          if (ts.toDate) return ts.toDate().toISOString();
          if (ts._seconds) return new Date(ts._seconds * 1000).toISOString();
          return String(ts);
        };
        const cleanId = (d.id || "").toLowerCase().trim();
        departmentsMap.set(cleanId, {
          id: cleanId,
          name: d.name || cleanId.toUpperCase(),
          code: d.code || d.name || cleanId.toUpperCase(),
          totalSemesters: Number(d.totalSemesters) || 8,
          parentCourse: d.parentCourse || undefined,
          status: d.status || "approved",
          updatedAt: serializeTimestamp(d.updatedAt || d.createdAt),
          createdAt: serializeTimestamp(d.createdAt),
        });
      }
    });

    // Process Dynamic Subjects
    subjectDocs.forEach((s) => {
      if (s.status !== "rejected") {
        const deptId = (s.departmentId || "btech").toLowerCase().trim();
        const semId = String(s.semesterId || "1").trim();
        const subId = (s.subjectId || s.id || "").toLowerCase().trim();
        const uniqueKey = `${deptId}_${semId}_${subId}`;

        const deptObj = departmentsMap.get(deptId);
        const serializeTimestamp = (ts: any) => {
          if (!ts) return null;
          if (ts.toDate) return ts.toDate().toISOString();
          if (ts._seconds) return new Date(ts._seconds * 1000).toISOString();
          return String(ts);
        };

        const item: UnifiedSubject = {
          id: subId,
          name: s.name || subId,
          code: s.code || "",
          departmentId: deptId,
          departmentName: deptObj ? deptObj.name : deptId.toUpperCase(),
          semesterId: semId,
          sections: Array.isArray(s.sections) ? s.sections : undefined,
          status: s.status || "approved",
          updatedAt: serializeTimestamp(s.updatedAt || s.createdAt),
          createdAt: serializeTimestamp(s.createdAt),
        };

        if (subjectKeysSet.has(uniqueKey)) {
          // Update existing with live Firestore data
          const existingIdx = subjectsList.findIndex(
            x => x.departmentId === deptId && x.semesterId === semId && x.id.toLowerCase() === subId
          );
          if (existingIdx !== -1) {
            subjectsList[existingIdx] = { ...subjectsList[existingIdx], ...item };
          }
        } else {
          subjectKeysSet.add(uniqueKey);
          subjectsList.push(item);
        }
      }
    });
  } catch (err) {
    console.warn("[getAllUnifiedData] Dynamic Firestore fetch skipped or deferred (using comprehensive fallback catalog):", err);
  }

  const fullResult = {
    departments: Array.from(departmentsMap.values()),
    subjects: subjectsList,
  };

  inMemoryUnifiedData = fullResult;
  lastUnifiedFetchTime = Date.now();
  setDiskCache(fullResult);

  if (filterDeptId || filterSemId) {
    return {
      departments: filterDeptId 
        ? fullResult.departments.filter(d => d.id === filterDeptId)
        : fullResult.departments,
      subjects: fullResult.subjects.filter(s => {
        if (filterDeptId && s.departmentId !== filterDeptId) return false;
        if (filterSemId && s.semesterId !== filterSemId) return false;
        return true;
      })
    };
  }

  return fullResult;
});

/**
 * Fetch metadata parameters for a specific subject dynamically from the unified data source.
 * Prioritizes the zero-read static catalog (273 subjects) to guarantee 0 Firestore reads for crawlers.
 */
export async function getSubjectDetails(deptId: string, semId: string, subjectIdOrSlug: string): Promise<{
  subjectName: string;
  subjectCode: string;
  deptName: string;
  deptCode: string;
  updatedAt?: any;
  createdAt?: any;
}> {
  const target = subjectIdOrSlug.toLowerCase().trim();
  const normalize = (str: string) => (str || "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
  const normalizedTarget = normalize(target);

  // 1. Check 100% Zero-Read Static Catalog First (273 pre-configured subjects)
  const staticData = getStaticUnifiedData(deptId, semId);
  const foundInStatic = staticData.subjects.find(
    s => s.id.toLowerCase() === target ||
         normalize(s.id) === normalizedTarget ||
         normalize(s.name) === normalizedTarget ||
         (s.code && normalize(s.code).replace(/-/g, "") === target.replace(/[^a-z0-9]/g, "")) ||
         normalizedTarget.includes(normalize(s.name)) ||
         normalize(s.name).includes(normalizedTarget)
  );

  const foundDept = staticData.departments.find(d => d.id.toLowerCase() === deptId.toLowerCase());
  const deptName = foundDept ? foundDept.name : (deptId === "btech" ? "Bachelor of Technology" : deptId.toUpperCase());
  const deptCode = foundDept ? foundDept.code : (deptId === "btech" ? "B.Tech" : deptId.toUpperCase());

  if (foundInStatic) {
    return {
      subjectName: foundInStatic.name,
      subjectCode: foundInStatic.code || "",
      deptName,
      deptCode,
      updatedAt: null,
      createdAt: null,
    };
  }

  // 2. Fallback to full unified data only for newly submitted dynamic subjects
  const { departments, subjects } = await getAllUnifiedData(false, deptId, semId);
  
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

  const finalDept = departments.find(d => d.id.toLowerCase() === deptId.toLowerCase()) || foundDept;

  let subjectName = foundSubject ? foundSubject.name : subjectIdOrSlug.replace(/([a-zA-Z]+)(\d+)/, '$1 $2').toUpperCase();
  let subjectCode = foundSubject?.code || "";
  let finalDeptName = finalDept ? finalDept.name : deptName;
  let finalDeptCode = finalDept ? finalDept.code : deptCode;

  return {
    subjectName,
    subjectCode,
    deptName: finalDeptName,
    deptCode: finalDeptCode,
    updatedAt: foundSubject?.updatedAt || finalDept?.updatedAt || null,
    createdAt: foundSubject?.createdAt || finalDept?.createdAt || null,
  };
}
