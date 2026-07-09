"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { collection, getDocs, addDoc, serverTimestamp, setDoc, doc } from "firebase/firestore";
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
  loading: true,
  createDepartment: async () => "",
  createSubject: async () => "",
  refreshSubjects: async () => {}
});

export const useSubjects = () => useContext(SubjectsContext);

export const SubjectsProvider = ({ children }: { children: React.ReactNode }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Record<string, Record<string, Subject[]>>>({});
  const [allSubjectsList, setAllSubjectsList] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshSubjects = async () => {
    try {
      // 1. Fetch Departments
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

      setDepartments(deptList);

      // 2. Fetch Subjects
      const subSnapshot = await getDocs(collection(db, "dynamic_subjects"));
      const mergedList: Subject[] = [...getStaticBTechSubjects()];

      subSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Handle backwards compatibility (older records might not have departmentId)
        const departmentId = data.departmentId || "btech";
        
        // Avoid duplicate matches
        const exists = mergedList.find(
          s => s.id === data.subjectId && s.departmentId === departmentId && s.semesterId === data.semesterId
        );
        
        if (!exists) {
          mergedList.push({
            id: data.subjectId,
            name: data.name,
            code: data.code || "",
            departmentId,
            semesterId: data.semesterId,
            status: data.status || "approved",
            contributorId: data.contributorId || null,
            contributorName: data.contributorName || null,
            createdAt: data.createdAt
          });
        }
      });

      setAllSubjectsList(mergedList);

      // 3. Group subjects by departmentId -> semesterId for O(1) reads
      const grouped: Record<string, Record<string, Subject[]>> = {};
      mergedList.forEach((sub) => {
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
      console.error("Error fetching dynamic subjects & departments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSubjects();
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
      throw new Error("A subject with this ID/Code already exists in this semester.");
    }

    await addDoc(collection(db, "dynamic_subjects"), {
      departmentId: deptId,
      semesterId: semId,
      subjectId: generatedId,
      name: name.trim(),
      code: code ? code.trim() : "",
      status: isContributor ? "pending" : "approved",
      contributorId: contributorId || null,
      contributorName: contributorName || null,
      createdAt: serverTimestamp()
    });

    await refreshSubjects();
    return generatedId;
  };

  return (
    <SubjectsContext.Provider
      value={{
        departments,
        subjects,
        allSubjectsList,
        loading,
        createDepartment,
        createSubject,
        refreshSubjects
      }}
    >
      {children}
    </SubjectsContext.Provider>
  );
};
