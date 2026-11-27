"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { collection, getDocs, serverTimestamp, setDoc, doc, query, where, getDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { SUBJECTS as STATIC_SUBJECTS, COMPREHENSIVE_CATALOG, DEFAULT_DEPARTMENTS } from "@/lib/subjects";

export interface Department {
  id: string;
  name: string;
  code: string;
  totalSemesters: number;
  createdBy: string;
  contributorName?: string;
  status: "pending" | "approved" | "rejected";
  parentCourse?: string;
  createdAt?: any;
}

export interface Subject {
  id: string; // subjectId
  name: string; // subjectName
  code?: string; // subjectCode
  departmentId: string;
  semesterId: string;
  sections?: string[]; // configured material sections e.g. ["pyq", "notes", "questions"]
  status?: "pending" | "approved" | "rejected";
  contributorId?: string;
  contributorName?: string;
  createdAt?: any;
}

interface SubjectsContextType {
  departments: Department[];
  subjects: Record<string, Record<string, Subject[]>>; // deptId -> semId -> subjects
  allSubjectsList: Subject[]; // flat list of all subjects
  deptMaterialCounts: Record<string, number>;
  loading: boolean;
  createDepartment: (
    name: string,
    code: string,
    totalSemesters: number,
    isContributor?: boolean,
    contributorId?: string,
    contributorName?: string
  ) => Promise<string>;
  createSubject: (
    deptId: string,
    semId: string,
    name: string,
    code?: string,
    isContributor?: boolean,
    contributorId?: string,
    contributorName?: string,
    sections?: string[]
  ) => Promise<string>;
  deleteSubject: (subjectId: string, deptId?: string, semId?: string) => Promise<void>;
  editSubject: (subjectId: string, name: string, code: string, deptId?: string, semId?: string) => Promise<void>;
  refreshSubjects: (forceRefresh?: boolean) => Promise<void>;
  lazyLoadSubjects: (deptId: string, semId: string, force?: boolean) => Promise<void>;
  listenToDeptsWithMaterials: () => () => void;
}

// Convert COMPREHENSIVE_CATALOG to our Subject[] format across all departments and semesters
const getComprehensiveCatalogSubjects = (): Subject[] => {
  const map = new Map<string, Subject>();

  COMPREHENSIVE_CATALOG.forEach((s) => {
    const dDept = (s.departmentId || "btech").toLowerCase().trim();
    const dSem = String(s.semesterId || "1").trim();
    const cleanId = (s.id || "").toLowerCase().trim();
    const key = `${dDept}_${dSem}_${cleanId}`;

    if (!map.has(key)) {
      map.set(key, {
        id: cleanId,
        name: s.name,
        code: s.code || "",
        departmentId: dDept,
        semesterId: dSem,
        sections: s.sections,
        status: "approved",
        contributorId: s.contributorId || "system",
        contributorName: s.contributorName || "System"
      });
    }
  });

  return Array.from(map.values());
};

const getInitialDepartments = (): Department[] => {
  return DEFAULT_DEPARTMENTS.map(d => ({
    id: d.id,
    name: d.name,
    code: d.code,
    totalSemesters: d.totalSemesters,
    createdBy: "system",
    status: d.status
  }));
};

const SubjectsContext = createContext<SubjectsContextType>({
  departments: [],
  subjects: {},
  allSubjectsList: [],
  deptMaterialCounts: {},
  loading: true,
  createDepartment: async () => "",
  createSubject: async () => "",
  deleteSubject: async () => {},
  editSubject: async () => {},
  refreshSubjects: async () => {},
  lazyLoadSubjects: async () => {},
  listenToDeptsWithMaterials: () => () => {}
});

export const useSubjects = () => useContext(SubjectsContext);

export const SubjectsProvider = ({ children }: { children: React.ReactNode }) => {
  const [departments, setDepartments] = useState<Department[]>(() => getInitialDepartments());
  const [subjects, setSubjects] = useState<Record<string, Record<string, Subject[]>>>(() => {
    const initialList = getComprehensiveCatalogSubjects();
    const grouped: Record<string, Record<string, Subject[]>> = {};
    initialList.forEach((sub) => {
      if (!grouped[sub.departmentId]) grouped[sub.departmentId] = {};
      if (!grouped[sub.departmentId][sub.semesterId]) grouped[sub.departmentId][sub.semesterId] = [];
      grouped[sub.departmentId][sub.semesterId].push(sub);
    });
    return grouped;
  });
  const [allSubjectsList, setAllSubjectsList] = useState<Subject[]>(() => getComprehensiveCatalogSubjects());
  const [deptMaterialCounts, setDeptMaterialCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const loadedSemestersRef = useRef<Record<string, boolean | undefined>>({});
  const inFlightRequestsRef = useRef<Record<string, Promise<void> | undefined>>({});
  const initialFetchDone = useRef(false);
  const countsLoadedRef = useRef(false);

  const listenToDeptsWithMaterials = useCallback(() => {
    const dummyUnsub = () => {};

    if (countsLoadedRef.current) {
      return dummyUnsub;
    }

    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("paperino_dept_material_counts");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setDeptMaterialCounts(parsed);
          countsLoadedRef.current = true;
          return dummyUnsub;
        } catch (e) {
          console.error("Failed to parse cached material counts:", e);
        }
      }
    }

    getDoc(doc(db, "platform_stats", "materialCounts"))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const counts = data.departments || {};
          setDeptMaterialCounts(counts);
          if (typeof window !== "undefined") {
            sessionStorage.setItem("paperino_dept_material_counts", JSON.stringify(counts));
          }
        }
        countsLoadedRef.current = true;
      })
      .catch((err) => {
        console.error("Failed to fetch material counts:", err);
      });

    return dummyUnsub;
  }, []);

  const refreshSubjects = async (forceRefresh: boolean = false) => {
    try {
      let deptList: Department[] = [];

      if (forceRefresh && typeof window !== "undefined") {
        sessionStorage.removeItem("paperino_cached_depts_v2");
        sessionStorage.removeItem("paperino_cached_depts_ts_v2");
        sessionStorage.removeItem("paperino_cached_dynamic_subs_v3");
        sessionStorage.removeItem("paperino_cached_dynamic_subs_ts_v1");
        loadedSemestersRef.current = {};
      }

      // Check local cache first (15m TTL)
      const DEPT_CACHE_TTL_MS = 15 * 60 * 1000;
      if (!forceRefresh && typeof window !== "undefined") {
        const cachedDepts = sessionStorage.getItem("paperino_cached_depts_v2");
        const cacheTimestamp = sessionStorage.getItem("paperino_cached_depts_ts_v2");
        
        if (cachedDepts && cacheTimestamp) {
          const isFresh = (Date.now() - parseInt(cacheTimestamp)) < DEPT_CACHE_TTL_MS;
          if (isFresh) {
            try {
              deptList = JSON.parse(cachedDepts);
            } catch (e) {}
          }
        }
      }

      if (deptList.length === 0) {
        try {
          const deptSnapshot = await getDocs(collection(db, "departments"));
          deptSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.status !== "rejected") {
              deptList.push({ id: docSnap.id, ...data } as Department);
            }
          });

          if (deptList.length > 0 && typeof window !== "undefined") {
            sessionStorage.setItem("paperino_cached_depts_v2", JSON.stringify(deptList));
            sessionStorage.setItem("paperino_cached_depts_ts_v2", Date.now().toString());
          }
        } catch (deptErr) {
          console.warn("[SubjectsContext] Firestore departments fetch fallback to defaults:", deptErr);
        }
      }

      // Merge with default canonical departments so no department is ever hidden or lost
      const deptMap = new Map<string, Department>();
      getInitialDepartments().forEach(d => deptMap.set(d.id, d));
      deptList.forEach(d => {
        const cleanId = (d.id || "").toLowerCase().trim();
        deptMap.set(cleanId, {
          ...d,
          id: cleanId,
          totalSemesters: Number(d.totalSemesters) || 8,
          status: d.status || "approved"
        });
      });

      const finalDeptList = Array.from(deptMap.values());
      finalDeptList.sort((a, b) => a.code.localeCompare(b.code));
      setDepartments(finalDeptList);

      // 2. Load dynamic subjects from Firestore & merge with comprehensive catalog
      let dynamicSubs: Subject[] = [];
      const SUB_CACHE_TTL_MS = 15 * 60 * 1000;
      let cachedSubsFound = false;

      if (!forceRefresh && typeof window !== "undefined") {
        const cachedSubs = sessionStorage.getItem("paperino_cached_dynamic_subs_v3");
        const cacheTs = sessionStorage.getItem("paperino_cached_dynamic_subs_ts_v1");
        if (cachedSubs && cacheTs && (Date.now() - parseInt(cacheTs)) < SUB_CACHE_TTL_MS) {
          try {
            dynamicSubs = JSON.parse(cachedSubs);
            cachedSubsFound = true;
          } catch (e) {}
        }
      }

      if (!cachedSubsFound) {
        try {
          const dynSnapshot = await getDocs(collection(db, "dynamic_subjects"));
          dynSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            // Never hide subjects: allow approved and pending contributor submissions
            if (data.status !== "rejected") {
              const dDept = (data.departmentId || "btech").toLowerCase().trim();
              const dSem = String(data.semesterId || "1").trim();
              const cleanId = (data.subjectId || docSnap.id || "").toLowerCase().trim();
              if (cleanId && data.name) {
                dynamicSubs.push({
                  id: cleanId,
                  name: data.name,
                  code: data.code || "",
                  departmentId: dDept,
                  semesterId: dSem,
                  sections: Array.isArray(data.sections) ? data.sections : undefined,
                  status: data.status || "approved",
                  contributorId: data.contributorId || null,
                  contributorName: data.contributorName || null,
                  createdAt: data.createdAt
                });
              }
            }
          });

          if (typeof window !== "undefined") {
            sessionStorage.setItem("paperino_cached_dynamic_subs_v3", JSON.stringify(dynamicSubs));
            sessionStorage.setItem("paperino_cached_dynamic_subs_ts_v1", Date.now().toString());
          }
        } catch (dynErr) {
          console.warn("[SubjectsContext] Error fetching dynamic_subjects, using catalog fallback:", dynErr);
        }
      }

      // Merge base catalog subjects with Firestore live subjects
      const combinedMap = new Map<string, Subject>();

      // Baseline: Add all comprehensive catalog subjects first (zero hidden subjects)
      getComprehensiveCatalogSubjects().forEach((s) => {
        const key = `${s.departmentId}_${s.semesterId}_${s.id.toLowerCase().trim()}`;
        combinedMap.set(key, s);
      });

      // Overlay live Firestore dynamic subjects
      dynamicSubs.forEach((s) => {
        const key = `${s.departmentId}_${s.semesterId}_${s.id.toLowerCase().trim()}`;
        const existing = combinedMap.get(key);
        if (existing) {
          combinedMap.set(key, { ...existing, ...s });
        } else {
          combinedMap.set(key, s);
        }
      });

      const fullSubjectsList = Array.from(combinedMap.values());
      fullSubjectsList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

      setAllSubjectsList(fullSubjectsList);

      const grouped: Record<string, Record<string, Subject[]>> = {};
      fullSubjectsList.forEach((sub) => {
        if (!grouped[sub.departmentId]) {
          grouped[sub.departmentId] = {};
        }
        if (!grouped[sub.departmentId][sub.semesterId]) {
          grouped[sub.departmentId][sub.semesterId] = [];
        }
        grouped[sub.departmentId][sub.semesterId].push(sub);
      });

      setSubjects(grouped);
    } catch (error) {
      console.error("Error refreshing subjects catalog:", error);
    } finally {
      setLoading(false);
    }
  };

  const lazyLoadSubjects = useCallback(async (deptId: string, semId: string, force: boolean = false): Promise<void> => {
    if (!deptId || !semId) return;

    const normDept = deptId.toLowerCase().trim();
    const normSem = String(semId).trim();
    const cacheKey = `${normDept}_${normSem}`;

    if (!force && loadedSemestersRef.current[cacheKey]) {
      return;
    }

    const inFlight = inFlightRequestsRef.current[cacheKey];
    if (inFlight) {
      return inFlight;
    }

    const fetchPromise = (async () => {
      try {
        const semNum = Number(normSem);
        const semValues = !isNaN(semNum) ? [normSem, semNum] : [normSem];

        const q = query(
          collection(db, "dynamic_subjects"),
          where("departmentId", "==", normDept),
          where("semesterId", "in", semValues)
        );
        
        let subSnapshot = await getDocs(q);

        if (subSnapshot.empty && normDept !== deptId) {
          const fallbackQ = query(
            collection(db, "dynamic_subjects"),
            where("departmentId", "==", deptId),
            where("semesterId", "in", semValues)
          );
          subSnapshot = await getDocs(fallbackQ);
        }

        const newSubjects: Subject[] = [];

        subSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.status !== "rejected" && data.name) {
            newSubjects.push({
              id: data.subjectId || docSnap.id,
              name: data.name,
              code: data.code || "",
              departmentId: normDept,
              semesterId: normSem,
              sections: Array.isArray(data.sections) ? data.sections : undefined,
              status: data.status || "approved",
              contributorId: data.contributorId || null,
              contributorName: data.contributorName || null,
              createdAt: data.createdAt
            });
          }
        });

        // Update state in-memory merging with existing catalog
        setSubjects(prev => {
          const copy = { ...prev };
          if (!copy[deptId]) copy[deptId] = {};
          if (normDept !== deptId && !copy[normDept]) copy[normDept] = {};
          
          // Retain base catalog entries
          const catalogSubs = getComprehensiveCatalogSubjects().filter(s => 
            (s.departmentId === deptId || s.departmentId === normDept) && 
            String(s.semesterId) === normSem
          );
          const combined = [...catalogSubs];
          
          newSubjects.forEach(newSub => {
            const idx = combined.findIndex(s => s.id.toLowerCase() === newSub.id.toLowerCase());
            if (idx !== -1) {
              combined[idx] = { ...combined[idx], ...newSub };
            } else {
              combined.push(newSub);
            }
          });
          
          copy[deptId][normSem] = combined;
          if (normDept !== deptId) {
            copy[normDept][normSem] = combined;
          }
          return copy;
        });

        setAllSubjectsList(prev => {
          const withoutThisDeptSem = prev.filter(
            s => !(
              (s.departmentId === deptId || s.departmentId === normDept) && 
              String(s.semesterId) === normSem && 
              s.contributorId !== "system"
            )
          );
          return [...withoutThisDeptSem, ...newSubjects];
        });

        loadedSemestersRef.current[cacheKey] = true;
        if (normDept !== deptId) {
          loadedSemestersRef.current[`${deptId}_${normSem}`] = true;
        }
      } catch (err) {
        console.warn("[SubjectsContext] Failed to lazy load subjects from Firestore (retaining catalog):", err);
      } finally {
        delete inFlightRequestsRef.current[cacheKey];
      }
    })();

    inFlightRequestsRef.current[cacheKey] = fetchPromise;
    return fetchPromise;
  }, []);

  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      refreshSubjects();
    }
  }, []);

  const createDepartment = async (
    name: string,
    code: string,
    totalSemesters: number,
    isContributor: boolean = false,
    contributorId?: string,
    contributorName?: string
  ): Promise<string> => {
    const generatedId = name.toLowerCase().trim().replace(/[^a-z0-9]/g, "-");
    
    if (departments.find(d => d.id === generatedId)) {
      throw new Error("A department with this name already exists.");
    }

    await setDoc(doc(db, "departments", generatedId), {
      name: name.trim(),
      code: code.trim(),
      totalSemesters,
      createdBy: contributorId || "system",
      contributorName: contributorName || null,
      status: "approved",
      createdAt: serverTimestamp()
    });

    await refreshSubjects(true);
    return generatedId;
  };

  const createSubject = async (
    deptId: string,
    semId: string,
    name: string,
    code?: string,
    isContributor: boolean = false,
    contributorId?: string,
    contributorName?: string,
    sections: string[] = []
  ): Promise<string> => {
    const generatedId = code 
      ? code.toLowerCase().trim().replace(/[^a-z0-9]/g, "") 
      : name.toLowerCase().trim().replace(/[^a-z0-9]/g, "-");
    
    if (subjects[deptId]?.[semId]?.find(s => s.id === generatedId)) {
      throw new Error("A subject with this code or name already exists in this semester.");
    }

    const docId = `${deptId}_sem${semId}_${generatedId}`;
    const deptObj = departments.find(d => d.id === deptId);
    const deptDisplayName = deptObj ? deptObj.name : deptId.toUpperCase();

    let apiSuccess = false;
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch("/api/courses/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            departmentId: deptId,
            departmentName: deptDisplayName,
            semesterId: semId,
            name: name.trim(),
            code: code ? code.trim() : "",
            sections: [],
            isSuggestion: false, // Ensure subject is immediately approved & visible
            creatorName: contributorName || currentUser.displayName || currentUser.email?.split("@")[0],
            creatorEmail: currentUser.email
          })
        });

        if (res.ok) {
          apiSuccess = true;
        } else {
          const errRes = await res.json().catch(() => ({}));
          console.warn("API course creation returned non-ok status:", errRes);
        }
      } catch (apiErr) {
        console.warn("API course creation request failed, falling back to direct Firestore:", apiErr);
      }
    }

    if (!apiSuccess) {
      await setDoc(doc(db, "dynamic_subjects", docId), {
        subjectId: generatedId,
        name: name.trim(),
        code: code ? code.trim() : "",
        departmentId: deptId,
        semesterId: semId,
        sections: [],
        createdBy: contributorId || "system",
        contributorId: contributorId || null,
        contributorName: contributorName || null,
        status: "approved", // Immediately approved so it never hides
        createdAt: serverTimestamp()
      });
    }

    const cacheKey = `${deptId}_${semId}`;
    delete loadedSemestersRef.current[cacheKey];
    await refreshSubjects(true);

    return generatedId;
  };

  const deleteSubject = async (
    subjectId: string,
    deptId: string = "btech",
    semId: string = "1"
  ): Promise<void> => {
    let apiSuccess = false;
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch("/api/admin/delete-subject", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            subjectId,
            departmentId: deptId,
            semesterId: semId
          })
        });

        if (res.ok) {
          apiSuccess = true;
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to delete subject via server API.");
        }
      } catch (apiErr: any) {
        console.warn("API delete subject error, checking client fallback:", apiErr);
        if (apiErr.message && !apiErr.message.includes("Failed to fetch")) {
          throw apiErr;
        }
      }
    }

    if (!apiSuccess) {
      const cleanSubjectId = String(subjectId).toLowerCase().trim();
      const constructedDocId = `${deptId}_sem${semId}_${cleanSubjectId}`;
      try {
        await deleteDoc(doc(db, "dynamic_subjects", constructedDocId));
      } catch (e) {}
      try {
        await deleteDoc(doc(db, "dynamic_subjects", cleanSubjectId));
      } catch (e) {}
    }

    if (typeof window !== "undefined") {
      sessionStorage.removeItem("paperino_cached_dynamic_subs_v3");
      sessionStorage.removeItem("paperino_cached_dynamic_subs_ts_v1");
      sessionStorage.removeItem("paperino_deleted_subjects");
    }
    await refreshSubjects(true);
  };

  const editSubject = async (
    subjectId: string,
    name: string,
    code: string,
    deptId: string = "btech",
    semId: string = "1"
  ): Promise<void> => {
    let apiSuccess = false;
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch("/api/admin/edit-subject", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            subjectId,
            name,
            code,
            departmentId: deptId,
            semesterId: semId
          })
        });

        if (res.ok) {
          apiSuccess = true;
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to edit subject.");
        }
      } catch (apiErr: any) {
        console.warn("API edit subject error:", apiErr);
        throw apiErr;
      }
    }

    if (typeof window !== "undefined") {
      sessionStorage.removeItem("paperino_cached_dynamic_subs_v3");
      sessionStorage.removeItem("paperino_cached_dynamic_subs_ts_v1");
    }
    await refreshSubjects(true);
  };

  return (
    <SubjectsContext.Provider
      value={{
        departments,
        subjects,
        allSubjectsList,
        deptMaterialCounts,
        loading,
        createDepartment,
        createSubject,
        deleteSubject,
        editSubject,
        refreshSubjects,
        lazyLoadSubjects,
        listenToDeptsWithMaterials
      }}
    >
      {children}
    </SubjectsContext.Provider>
  );
};
