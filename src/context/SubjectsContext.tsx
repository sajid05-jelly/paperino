"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { collection, getDocs, serverTimestamp, setDoc, doc, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SUBJECTS as STATIC_SUBJECTS } from "@/lib/subjects";

export interface Department {
  id: string;
  name: string;
  code: string;
  totalSemesters: number;
  createdBy: string;
  contributorName?: string;
  status: "pending" | "approved" | "rejected";
  createdAt?: any;
}

export interface Subject {
  id: string; // subjectId
  name: string; // subjectName
  code?: string; // subjectCode
  departmentId: string;
  semesterId: string;
  status?: "pending" | "approved" | "rejected";
  contributorId?: string;
  contributorName?: string;
  createdAt?: any;
}

interface SubjectsContextType {
  departments: Department[];
  subjects: Record<string, Record<string, Subject[]>>; // deptId -> semId -> subjects
  allSubjectsList: Subject[]; // flat list of all subjects
  deptsWithMaterials: Set<string>;
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
    contributorName?: string
  ) => Promise<string>;
  refreshSubjects: () => Promise<void>;
  lazyLoadSubjects: (deptId: string, semId: string) => Promise<void>;
  listenToDeptsWithMaterials: () => () => void;
}

// Convert STATIC_SUBJECTS (Record<string, {id, name}[]>) to our new Subject[] format for B.Tech
const getStaticBTechSubjects = (): Subject[] => {
  const list: Subject[] = [];
  Object.entries(STATIC_SUBJECTS).forEach(([semId, subs]) => {
    subs.forEach(s => {
      list.push({
        id: s.id,
        name: s.name,
        code: "",
        departmentId: "btech",
        semesterId: semId,
        status: "approved",
        contributorId: "system",
        contributorName: "System"
      });
    });
  });
  return list;
};

const SubjectsContext = createContext<SubjectsContextType>({
  departments: [],
  subjects: {},
  allSubjectsList: [],
  deptsWithMaterials: new Set(),
  loading: true,
  createDepartment: async () => "",
  createSubject: async () => "",
  refreshSubjects: async () => {},
  lazyLoadSubjects: async () => {},
  listenToDeptsWithMaterials: () => () => {}
});

export const useSubjects = () => useContext(SubjectsContext);

export const SubjectsProvider = ({ children }: { children: React.ReactNode }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Record<string, Record<string, Subject[]>>>({});
  const [allSubjectsList, setAllSubjectsList] = useState<Subject[]>([]);
  const [deptsWithMaterials, setDeptsWithMaterials] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const loadedSemestersRef = useRef<Record<string, boolean>>({});
  const initialFetchDone = useRef(false);

  const listenToDeptsWithMaterials = useCallback(() => {
    const q = query(collection(db, "materials"), where("status", "==", "approved"));
    return onSnapshot(q, (snap) => {
      const depts = new Set<string>();
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.departmentId) {
          depts.add(data.departmentId);
        }
      });
      setDeptsWithMaterials(depts);
    });
  }, []);

  const refreshSubjects = async () => {
    try {
      // 1. Fetch Departments (0 Materials Collection Sweeps)
      const deptSnapshot = await getDocs(collection(db, "departments"));
      let deptList: Department[] = [];
      deptSnapshot.forEach((docSnap) => {
        deptList.push({ id: docSnap.id, ...docSnap.data() } as Department);
      });

      // Seed B.Tech department virtually/locally if empty, and try to persist it
      if (deptList.length === 0) {
        const defaultBTech: Department = {
          id: "btech",
          name: "Bachelor of Technology",
          code: "B.Tech",
          totalSemesters: 8,
          createdBy: "system",
          status: "approved"
        };
        try {
          await setDoc(doc(db, "departments", "btech"), {
            name: defaultBTech.name,
            code: defaultBTech.code,
            totalSemesters: defaultBTech.totalSemesters,
            createdBy: defaultBTech.createdBy,
            status: defaultBTech.status,
            createdAt: serverTimestamp()
          });
        } catch (seedingError) {
          console.warn("[Seeding] Skipped writing B.Tech department due to permission levels:", seedingError);
        }
        deptList = [defaultBTech];
      }

      // Sort alphabetically by Code to bypass heavy materials count sweep on startup
      deptList.sort((a, b) => a.code.localeCompare(b.code));
      setDepartments(deptList);

      // 2. Pre-populate B.Tech subjects from static definition so they load instantly
      const staticBTech = getStaticBTechSubjects();
      setAllSubjectsList(staticBTech);

      const grouped: Record<string, Record<string, Subject[]>> = {};
      staticBTech.forEach((sub) => {
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
      console.error("Error fetching departments:", error);
    } finally {
      setLoading(false);
    }
  };

  const lazyLoadSubjects = async (deptId: string, semId: string) => {
    const cacheKey = `${deptId}_${semId}`;
    if (loadedSemestersRef.current[cacheKey]) {
      return; // Cache Hit - Already loaded in this browser session
    }

    try {
      console.log(`[SubjectsContext] Lazy loading dynamic subjects for: ${deptId} Sem ${semId}...`);
      const q = query(
        collection(db, "dynamic_subjects"),
        where("departmentId", "==", deptId),
        where("semesterId", "==", semId)
      );
      
      const subSnapshot = await getDocs(q);
      const newSubjects: Subject[] = [];

      subSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        newSubjects.push({
          id: data.subjectId,
          name: data.name,
          code: data.code || "",
          departmentId: deptId,
          semesterId: semId,
          status: data.status || "approved",
          contributorId: data.contributorId || null,
          contributorName: data.contributorName || null,
          createdAt: data.createdAt
        });
      });

      // Update state in-memory
      setSubjects(prev => {
        const copy = { ...prev };
        if (!copy[deptId]) copy[deptId] = {};
        
        // Retain static entries
        const staticSubs = getStaticBTechSubjects().filter(s => s.departmentId === deptId && s.semesterId === semId);
        const combined = [...staticSubs];
        
        newSubjects.forEach(newSub => {
          if (!combined.some(s => s.id === newSub.id)) {
            combined.push(newSub);
          }
        });
        
        copy[deptId][semId] = combined;
        return copy;
      });

      setAllSubjectsList(prev => {
        const copy = [...prev];
        newSubjects.forEach(newSub => {
          if (!copy.some(s => s.id === newSub.id && s.departmentId === deptId && s.semesterId === semId)) {
            copy.push(newSub);
          }
        });
        return copy;
      });

      loadedSemestersRef.current[cacheKey] = true;
    } catch (err) {
      console.error("[SubjectsContext] Failed to lazy load subjects:", err);
    }
  };

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
    
    // Check if duplicate ID exists
    if (departments.find(d => d.id === generatedId)) {
      throw new Error("A department with this name already exists.");
    }

    await setDoc(doc(db, "departments", generatedId), {
      name: name.trim(),
      code: code.trim(),
      totalSemesters,
      createdBy: contributorId || "system",
      contributorName: contributorName || null,
      status: isContributor ? "pending" : "approved",
      createdAt: serverTimestamp()
    });

    await refreshSubjects();
    return generatedId;
  };

  const createSubject = async (
    deptId: string,
    semId: string,
    name: string,
    code?: string,
    isContributor: boolean = false,
    contributorId?: string,
    contributorName?: string
  ): Promise<string> => {
    const generatedId = code 
      ? code.toLowerCase().trim().replace(/[^a-z0-9]/g, "") 
      : name.toLowerCase().trim().replace(/[^a-z0-9]/g, "-");
    
    // Check duplicates inside the specific department and semester
    if (subjects[deptId]?.[semId]?.find(s => s.id === generatedId)) {
      throw new Error("A subject with this code or name already exists in this semester.");
    }

    const docId = `${deptId}_sem${semId}_${generatedId}`;

    await setDoc(doc(db, "dynamic_subjects", docId), {
      subjectId: generatedId,
      name: name.trim(),
      code: code ? code.trim() : "",
      departmentId: deptId,
      semesterId: semId,
      createdBy: contributorId || "system",
      contributorId: contributorId || null,
      contributorName: contributorName || null,
      status: isContributor ? "pending" : "approved",
      createdAt: serverTimestamp()
    });

    // Reset local cache so it gets refetched
    const cacheKey = `${deptId}_${semId}`;
    delete loadedSemestersRef.current[cacheKey];
    await lazyLoadSubjects(deptId, semId);

    return generatedId;
  };

  return (
    <SubjectsContext.Provider
      value={{
        departments,
        subjects,
        allSubjectsList,
        deptsWithMaterials,
        loading,
        createDepartment,
        createSubject,
        refreshSubjects,
        lazyLoadSubjects,
        listenToDeptsWithMaterials
      }}
    >
      {children}
    </SubjectsContext.Provider>
  );
};
