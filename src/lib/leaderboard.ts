import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";

const allowedAdmins = [
  "mohamedsajid.sa@gmail.com",
  "sudharajsekar2005@gmail.com",
  "admin.paperinoirfan27@gmail.com",
  "admin.paperinosam14@gmail.com",
  "gameplayitlifeitis@gmail.com"
];

const adminNames = [
  "mohamedsajid",
  "mohamed sajid",
  "sajid",
  "sudhar",
  "irfan",
  "sam",
  "admin"
];

export function isUserAdmin(user: any): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.email && allowedAdmins.includes(user.email.toLowerCase())) return true;
  if (user.displayName) {
    const nameLower = user.displayName.toLowerCase();
    if (adminNames.some(adminName => nameLower.includes(adminName))) return true;
  }
  return false;
}

/**
 * Recalculates both the Current Season and All-Time (Hall of Fame) leaderboards
 * and saves the pre-aggregated results into Firestore.
 * Excludes all admin accounts and clamps points, uploads, and downloads to a minimum of 0.
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

    // 2. Fetch Users (Exclude blocked status and admin accounts)
    const usersSnap = await getDocs(collection(db, "users"));
    const usersMap = new Map();
    usersSnap.forEach(d => {
      const data = d.data();
      const isAdmin = isUserAdmin(data);
      if (data.status !== "blocked" && !isAdmin) {
        usersMap.set(d.id, data);
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
          if (!user || isUserAdmin(user)) return null;

          const rawUploads = useSeason ? (user.seasonUploads || 0) : (user.uploads || 0);
          const rawPoints = useSeason ? (user.seasonPoints || 0) : (user.contributionPoints || 0);
          const rawDownloads = user.downloads || 0;

          const uploads = Math.max(0, rawUploads);
          const contributionPoints = Math.max(0, rawPoints);
          const downloads = Math.max(0, rawDownloads);
          
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
            email: user.email || "",
            role: user.role || "student",
            paperinoAvatar: user.paperinoAvatar || null,
            joinedDate: joinedDateStr,
            uploads,
            downloads,
            contributionPoints,
            contributorLevel: user.contributorLevel || "",
            rankTitle: getBadgeTitle(uploads)
          };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => {
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

    const isAdmin = isUserAdmin(userData);
    if (userData.status === "blocked" || isAdmin) {
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

      // Remove existing entry or any admin entries
      contributors = contributors.filter((c: any) => c.uid !== userId && !isUserAdmin(c));

      if (isSeasonEligible) {
        const rawUploads = isSeason ? (userData.seasonUploads || 0) : (userData.uploads || 0);
        const rawPoints = isSeason ? (userData.seasonPoints || 0) : (userData.contributionPoints || 0);
        const rawDownloads = userData.downloads || 0;

        const uploads = Math.max(0, rawUploads);
        const contributionPoints = Math.max(0, rawPoints);
        const downloads = Math.max(0, rawDownloads);

        contributors.push({
          uid: userId,
          displayName: userData.displayName || "Anonymous Contributor",
          email: userData.email || "",
          role: userData.role || "student",
          paperinoAvatar: userData.paperinoAvatar || null,
          joinedDate: joinedDateStr,
          uploads,
          downloads,
          contributionPoints,
          contributorLevel: userData.contributorLevel || "",
          rankTitle: getBadgeTitle(uploads)
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
      const updated = contributors.filter((c: any) => c.uid !== userId && !isUserAdmin(c));
      await setDoc(boardRef, { contributors: updated }, { merge: true });
    }
  }
}
