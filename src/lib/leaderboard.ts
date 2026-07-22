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
      
      if (!usersMap.has(uid)) return;

      allTimeCounts[uid] = (allTimeCounts[uid] || 0) + 1;
      
      if (data.createdAt && data.createdAt >= startDate.getTime()) {
        seasonCounts[uid] = (seasonCounts[uid] || 0) + 1;
      }
    });

    const getBadgeTitle = (uploads: number) => {
      if (uploads >= 20) return "Elite Contributor";
      if (uploads >= 5) return "Active Contributor";
      if (uploads >= 1) return "Contributor";
      return "Explorer";
    };

    const buildBoard = (counts: Record<string, number>, useSeason: boolean = false) => {
      return Object.keys(counts)
        .map((uid) => {
          const user = usersMap.get(uid);
          const uploads = useSeason ? (user.seasonUploads || 0) : (user.uploads || 0);
          const contributionPoints = useSeason ? (user.seasonPoints || 0) : (user.contributionPoints || 0);
          const downloads = user.downloads || 0;
          
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
            downloads,
            contributionPoints,
            contributorLevel: user.contributorLevel || "",
            rankTitle: getBadgeTitle(user.uploads || 0)
          };
        })
        .sort((a, b) => {
          if (b.contributionPoints !== a.contributionPoints) {
            return b.contributionPoints - a.contributionPoints;
          }
          if (b.uploads !== a.uploads) {
            return b.uploads - a.uploads;
          }
          return b.downloads - a.downloads;
        });
    };

    const seasonBoard = buildBoard(seasonCounts, true);
    const allTimeBoard = buildBoard(allTimeCounts, false);

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

export async function updateLeaderboardForUser(
  db: any,
  userId: string
) {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;
    const userData = userSnap.data();

    if (userData.status === "blocked") {
      await removeUserFromLeaderboards(db, userId);
      return;
    }

    const joinedDateStr = userData.createdAt
      ? (typeof userData.createdAt.toDate === "function"
          ? userData.createdAt.toDate().toISOString()
          : new Date(userData.createdAt).toISOString())
      : null;

    const getBadgeTitle = (uploads: number) => {
      if (uploads >= 20) return "Elite Contributor";
      if (uploads >= 5) return "Active Contributor";
      if (uploads >= 1) return "Contributor";
      return "Explorer";
    };

    const updateBoard = async (boardId: string, isSeason: boolean) => {
      const boardRef = doc(db, "leaderboards", boardId);
      const boardSnap = await getDoc(boardRef);
      let contributors: any[] = [];
      let seasonStartDate = new Date(0);

      if (boardSnap.exists()) {
        const boardData = boardSnap.data();
        contributors = boardData.contributors || [];
        if (isSeason && boardData.seasonStartDate) {
          seasonStartDate = new Date(boardData.seasonStartDate);
        }
      }

      // Check if user is active in this season (if it's season board)
      const isSeasonEligible = !isSeason || (userData.createdAt && new Date(userData.createdAt) >= seasonStartDate);

      // Remove existing entry
      contributors = contributors.filter((c: any) => c.uid !== userId);

      if (isSeasonEligible) {
        const uploads = isSeason ? (userData.seasonUploads || 0) : (userData.uploads || 0);
        const contributionPoints = isSeason ? (userData.seasonPoints || 0) : (userData.contributionPoints || 0);
        const downloads = userData.downloads || 0;

        contributors.push({
          uid: userId,
          displayName: userData.displayName || "Anonymous Contributor",
          paperinoAvatar: userData.paperinoAvatar || null,
          joinedDate: joinedDateStr,
          uploads,
          downloads,
          contributionPoints,
          contributorLevel: userData.contributorLevel || "",
          rankTitle: getBadgeTitle(userData.uploads || 0)
        });
      }

      // Re-sort
      contributors.sort((a, b) => {
        if (b.contributionPoints !== a.contributionPoints) {
          return b.contributionPoints - a.contributionPoints;
        }
        if (b.uploads !== a.uploads) {
          return b.uploads - a.uploads;
        }
        return b.downloads - a.downloads;
      });

      await setDoc(boardRef, {
        updatedAt: Date.now(),
        ...(isSeason ? { seasonStartDate: seasonStartDate.toISOString() } : {}),
        contributors
      }, { merge: true });
    };

    await updateBoard("currentSeason", true);
    await updateBoard("hallOfFame", false);

  } catch (err) {
    console.error("Error incrementally updating leaderboard:", err);
  }
}

async function removeUserFromLeaderboards(db: any, userId: string) {
  const boards = ["currentSeason", "hallOfFame"];
  for (const boardId of boards) {
    const boardRef = doc(db, "leaderboards", boardId);
    const boardSnap = await getDoc(boardRef);
    if (boardSnap.exists()) {
      const contributors = boardSnap.data().contributors || [];
      const updated = contributors.filter((c: any) => c.uid !== userId);
      await setDoc(boardRef, { contributors: updated }, { merge: true });
    }
  }
}
