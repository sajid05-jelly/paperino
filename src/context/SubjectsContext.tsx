"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SUBJECTS as STATIC_SUBJECTS } from "@/lib/subjects";

interface Subject {
  id: string;
  name: string;
  status?: string;
  contributorId?: string;
}

interface SubjectsContextType {
  subjects: Record<string, Subject[]>;
  loading: boolean;
  createSubject: (semId: string, name: string, code?: string, isContributor?: boolean, contributorId?: string, contributorName?: string) => Promise<string>;
  refreshSubjects: () => Promise<void>;
}

const SubjectsContext = createContext<SubjectsContextType>({
  subjects: STATIC_SUBJECTS,
  loading: true,
  createSubject: async () => "",
  refreshSubjects: async () => {}
});

export const useSubjects = () => useContext(SubjectsContext);

export const SubjectsProvider = ({ children }: { children: React.ReactNode }) => {
  const [subjects, setSubjects] = useState<Record<string, Subject[]>>(STATIC_SUBJECTS);
  const [loading, setLoading] = useState(true);

  const refreshSubjects = async () => {
    try {
      const snapshot = await getDocs(collection(db, "dynamic_subjects"));
      const mergedSubjects: Record<string, Subject[]> = JSON.parse(JSON.stringify(STATIC_SUBJECTS));
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const semId = data.semesterId;
        // Merge all courses (approved and pending) into the public subjects list
        // Route-level security will filter them out for normal users
        if (semId) {
          if (!mergedSubjects[semId]) mergedSubjects[semId] = [];
          
          // Avoid duplicates if a static subject has the same ID
          const exists = mergedSubjects[semId].find(s => s.id === data.subjectId);
          if (!exists) {
            mergedSubjects[semId].push({
              id: data.subjectId,
              name: data.name,
              status: data.status,
              contributorId: data.contributorId
            });
          }
        }
      });
      
      setSubjects(mergedSubjects);
    } catch (error) {
      console.error("Error fetching dynamic subjects:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSubjects();
  }, []);

  const createSubject = async (semId: string, name: string, code?: string, isContributor: boolean = false, contributorId?: string, contributorName?: string) => {
    // Clean string for ID creation (e.g., 'Artificial Intelligence' -> 'artificial-intelligence' or '21CSC301J' -> '21csc301j')
    const generatedId = code 
      ? code.toLowerCase().trim().replace(/[^a-z0-9]/g, '') 
      : name.toLowerCase().trim().replace(/[^a-z0-9]/g, '-');
    
    // Check if it already exists locally (in merged array)
    if (subjects[semId]?.find(s => s.id === generatedId)) {
      throw new Error("A subject with this ID/Code already exists in this semester.");
    }

    await addDoc(collection(db, "dynamic_subjects"), {
      semesterId: semId,
      subjectId: generatedId,
      name: name.trim(),
      code: code ? code.trim() : "",
      status: isContributor ? "pending" : "approved",
      contributorId: contributorId || null,
      contributorName: contributorName || null,
      createdAt: serverTimestamp()
    });

    // Refresh context list to include the newly created subject
    await refreshSubjects();

    return generatedId;
  };

  return (
    <SubjectsContext.Provider value={{ subjects, loading, createSubject, refreshSubjects }}>
      {children}
    </SubjectsContext.Provider>
  );
};
