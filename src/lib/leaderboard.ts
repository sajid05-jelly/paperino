import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";

/**
 * Recalculates both the Current Season and All-Time (Hall of Fame) leaderboards
 * and saves the pre-aggregated results into Firestore.
 * 
 * @param db The Firestore database instance
 */
export async function recalculateLeaderboards(db: any) {
  try {
    // 1. Fetch Season Settings
    const settingsRef = doc(db, "settings", "leaderboard");
    const settingsSnap = await getDoc(settingsRef);
    let startDate = new Date(0);
    
    if (settingsSnap.exists() && settingsSnap.data().seasonStartDate) {
      const dateVal = settingsSnap.data().seasonStartDate;
      if (dateVal && typeof dateVal.toDate === "function") {
        startDate = dateVal.toDate();
      } else if (dateVal instanceof Date) {
        startDate = dateVal;
      } else if (typeof dateVal === "number" || typeof dateVal === "string") {
        startDate = new Date(dateVal);
      }
    }

    // 2. Fetch Users
    const usersSnap = await getDocs(collection(db, "users"));
    const usersMap = new Map();
    usersSnap.forEach(d => {
      if (d.data().status !== "blocked") {
        usersMap.set(d.id, d.data());
      }
    });

    // 3. Fetch Approved Materials
    const matQ = query(collection(db, "materials"), where("status", "==", "approved"));
    const matSnap = await getDocs(matQ);
    
    const allTimeCounts: Record<string, number> = {};
    const seasonCounts: Record<string, number> = {};

    matSnap.forEach(doc => {
      const data = doc.data();
      if (!data.uploaderId) return;
      const uid = data.uploaderId;
      
      // Only count if user is active and exists
      if (!usersMap.has(uid)) return;

      allTimeCounts[uid] = (allTimeCounts[uid] || 0) + 1;
      
      if (data.createdAt && data.createdAt >= startDate.getTime()) {
        seasonCounts[uid] = (seasonCounts[uid] || 0) + 1;
      }
    });

    const getRankTitle = (points: number) => {
      if (points >= 100) return "Elite Contributor";
      if (points >= 50) return "Top Contributor";
      if (points >= 20) return "Active Helper";
      if (points >= 1) return "Community Supporter";
      return "Newcomer";
    };

    const buildBoard = (counts: Record<string, number>) => {
      return Object.entries(counts)
        .map(([uid, uploads]) => {
          const user = usersMap.get(uid);
          const points = uploads * 10;
          
          let joinedDateStr = null;
          if (user.createdAt) {
            if (typeof user.createdAt.toDate === "function") {
              joinedDateStr = user.createdAt.toDate().toISOString();
            } else if (user.createdAt instanceof Date) {
              joinedDateStr = user.createdAt.toISOString();
            } else {
              joinedDateStr = new Date(user.createdAt).toISOString();
            }
          }

          return {
            uid,
            displayName: user.displayName || "Anonymous Contributor",
            paperinoAvatar: user.paperinoAvatar || null,
            joinedDate: joinedDateStr,
            uploads,
            points,
            rankTitle: getRankTitle(points)
          };
        })
        .sort((a, b) => b.points - a.points);
    };

    const seasonBoard = buildBoard(seasonCounts);
    const allTimeBoard = buildBoard(allTimeCounts);

    // Save aggregated documents to the leaderboards collection
    await setDoc(doc(db, "leaderboards", "currentSeason"), {
      updatedAt: Date.now(),
      seasonStartDate: startDate.toISOString(),
      contributors: seasonBoard
    });

    await setDoc(doc(db, "leaderboards", "hallOfFame"), {
      updatedAt: Date.now(),
      contributors: allTimeBoard
    });

    console.log("Leaderboards successfully updated in Firestore.");
  } catch (error) {
    console.error("Error recalculating leaderboards:", error);
    throw error;
  }
}
