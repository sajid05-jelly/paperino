import jsPDF from "jspdf";
import { GitHubAnalysisResult } from "@/app/api/github-intelligence/route";

export async function generateDeveloperReportPdf(analysis: GitHubAnalysisResult) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const purpleDark = [109, 40, 217]; // #6d28d9
  const purplePrimary = [139, 92, 246]; // #8b5cf6
  const purpleLight = [243, 232, 255]; // #f3e8ff
  const bluePrimary = [59, 130, 246]; // #3b82f6
  const textDark = [17, 24, 39]; // #111827
  const textMuted = [75, 85, 99]; // #4b5563
  const borderGray = [229, 231, 235]; // #e5e7eb
  const bgCard = [249, 250, 251]; // #f9fafb
  const greenText = [16, 185, 129]; // #10b981
  const amberText = [217, 119, 6]; // #d97706

  const generatedDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Helper for adding standard page headers and footers
  const addPageHeaderFooter = (pageNo: number, totalPages: number, pageTitle: string) => {
    // Header bar
    doc.setFillColor(purpleDark[0], purpleDark[1], purpleDark[2]);
    doc.rect(0, 0, pageWidth, 4, "F");

    // Header content
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(purpleDark[0], purpleDark[1], purpleDark[2]);
    doc.text("PAPERINO LABS", margin, 12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text("•  GitHub Intelligence Developer Report", margin + 28, 12);

    doc.setFontSize(8);
    doc.text(pageTitle, pageWidth - margin, 12, { align: "right" });

    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, 15, pageWidth - margin, 15);

    // Footer
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFontSize(8);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(`Report for @${analysis.username}  |  Generated on ${generatedDate}`, margin, pageHeight - 7);
    doc.text(`Page ${pageNo} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: "right" });
  };

  // -------------------------------------------------------------
  // PAGE 1: DEVELOPER OVERVIEW
  // -------------------------------------------------------------
  addPageHeaderFooter(1, 7, "Developer Overview");

  let y = 24;

  // Title Banner Card
  doc.setFillColor(245, 243, 255);
  doc.setDrawColor(221, 214, 254);
  doc.roundedRect(margin, y, contentWidth, 38, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(purpleDark[0], purpleDark[1], purpleDark[2]);
  doc.text("Developer Intelligence Report", margin + 8, y + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Official Developer Profile & Code Analysis for @${analysis.username}`, margin + 8, y + 22);

  // Score Badge in Banner
  const scoreBoxWidth = 35;
  const scoreBoxX = pageWidth - margin - scoreBoxWidth - 6;
  doc.setFillColor(purpleDark[0], purpleDark[1], purpleDark[2]);
  doc.roundedRect(scoreBoxX, y + 6, scoreBoxWidth, 26, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(`${analysis.developerMetrics?.score || 85}/100`, scoreBoxX + scoreBoxWidth / 2, y + 18, { align: "center" });

  doc.setFontSize(7);
  doc.setTextColor(233, 213, 255);
  doc.text("DEVELOPER SCORE", scoreBoxX + scoreBoxWidth / 2, y + 23, { align: "center" });

  y += 46;

  // Profile Card
  doc.setFillColor(bgCard[0], bgCard[1], bgCard[2]);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(margin, y, contentWidth, 54, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(analysis.name || analysis.username, margin + 8, y + 12);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(purplePrimary[0], purplePrimary[1], purplePrimary[2]);
  doc.text(`@${analysis.username}`, margin + 8, y + 18);

  if (analysis.bio) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    const bioLines = doc.splitTextToSize(analysis.bio, contentWidth - 16);
    doc.text(bioLines.slice(0, 2), margin + 8, y + 25);
  }

  // Developer Level & Rank Pills
  doc.setFillColor(purpleDark[0], purpleDark[1], purpleDark[2]);
  doc.roundedRect(margin + 8, y + 36, 68, 12, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(analysis.developerMetrics?.level || "Advanced Developer", margin + 12, y + 43);

  doc.setFillColor(238, 242, 255);
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(margin + 80, y + 36, 52, 12, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(55, 48, 163);
  doc.text(`Top ${analysis.developerMetrics?.rankPercentile || 12}% Paperino Dev`, margin + 84, y + 43);

  y += 62;

  // Key Statistics Grid (4 Cards)
  const gridW = (contentWidth - 9) / 4;
  const stats = [
    { label: "Public Repos", val: String(analysis.publicReposCount) },
    { label: "Followers", val: String(analysis.followers) },
    { label: "Following", val: String(analysis.following) },
    { label: "Account Created", val: analysis.createdAt || "N/A" },
  ];

  stats.forEach((st, idx) => {
    const sx = margin + idx * (gridW + 3);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.roundedRect(sx, y, gridW, 22, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(purpleDark[0], purpleDark[1], purpleDark[2]);
    doc.text(st.val, sx + gridW / 2, y + 10, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(st.label, sx + gridW / 2, y + 16, { align: "center" });
  });

  y += 30;

  // Additional Meta Info
  doc.setFillColor(bgCard[0], bgCard[1], bgCard[2]);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(margin, y, contentWidth, 32, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text("ACCOUNT & ACTIVITY METRICS", margin + 8, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`• GitHub Profile URL: https://github.com/${analysis.username}`, margin + 8, y + 17);
  doc.text(`• Portfolio Website: ${analysis.portfolioUrl || "Not linked on GitHub profile"}`, margin + 8, y + 23);
  doc.text(`• Recent Activity Status: ${analysis.activityInsights?.recentActivityStatus || "Active GitHub Contributor"}`, margin + 8, y + 29);

  y += 40;

  // XP Progress Box
  doc.setFillColor(245, 243, 255);
  doc.setDrawColor(221, 214, 254);
  doc.roundedRect(margin, y, contentWidth, 32, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(purpleDark[0], purpleDark[1], purpleDark[2]);
  doc.text(`Developer Level ${analysis.developerMetrics?.levelNum || 12} Progress`, margin + 8, y + 10);

  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`XP ${analysis.developerMetrics?.xpCurrent || 820} / ${analysis.developerMetrics?.xpMax || 1000} (${analysis.developerMetrics?.xpPercentage || 82}%)`, pageWidth - margin - 8, y + 10, { align: "right" });

  // Draw progress bar track
  const barW = contentWidth - 16;
  const barH = 5;
  const barX = margin + 8;
  const barY = y + 16;

  doc.setFillColor(229, 231, 235);
  doc.roundedRect(barX, barY, barW, barH, 2, 2, "F");

  const fillW = Math.max(4, (barW * (analysis.developerMetrics?.xpPercentage || 82)) / 100);
  doc.setFillColor(purpleDark[0], purpleDark[1], purpleDark[2]);
  doc.roundedRect(barX, barY, fillW, barH, 2, 2, "F");

  doc.setFontSize(8);
  doc.setTextColor(purplePrimary[0], purplePrimary[1], purplePrimary[2]);
  doc.text(`Next Reward: ${analysis.developerMetrics?.nextRewardBadge || "Elite Builder Badge"}`, margin + 8, y + 27);

  // -------------------------------------------------------------
  // PAGE 2: TECHNICAL INTELLIGENCE
  // -------------------------------------------------------------
  doc.addPage();
  addPageHeaderFooter(2, 7, "Technical Intelligence");
  y = 24;

  // Section Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(purpleDark[0], purpleDark[1], purpleDark[2]);
  doc.text("Technical Intelligence & Language Breakdown", margin, y);
  doc.line(margin, y + 3, pageWidth - margin, y + 3);

  y += 12;

  // Detected Skills Pills Card
  doc.setFillColor(bgCard[0], bgCard[1], bgCard[2]);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(margin, y, contentWidth, 42, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text("AUTOMATICALLY DETECTED SKILLS & TECH STACK", margin + 8, y + 10);

  let skillX = margin + 8;
  let skillY = y + 17;
  const skills = analysis.detectedSkills || [];

  if (skills.length > 0) {
    skills.forEach((sk) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const textWidth = doc.getTextWidth(sk) + 6;
      if (skillX + textWidth > margin + contentWidth - 8) {
        skillX = margin + 8;
        skillY += 9;
      }
      doc.setFillColor(237, 233, 254);
      doc.setDrawColor(196, 181, 253);
      doc.roundedRect(skillX, skillY, textWidth, 6.5, 1.5, 1.5, "FD");
      doc.setTextColor(76, 29, 149);
      doc.text(sk, skillX + 3, skillY + 4.5);
      skillX += textWidth + 3;
    });
  } else {
    doc.setFontSize(8.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text("No explicit technology tags detected in public repositories.", margin + 8, skillY + 4);
  }

  y += 50;

  // Programming Language Distribution
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text("MOST USED PROGRAMMING LANGUAGES", margin, y);

  y += 6;

  const languages = analysis.mostUsedLanguages || [];
  if (languages.length > 0) {
    languages.slice(0, 5).forEach((lang) => {
      doc.setFillColor(bgCard[0], bgCard[1], bgCard[2]);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.roundedRect(margin, y, contentWidth, 14, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(lang.language, margin + 6, y + 9);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(purpleDark[0], purpleDark[1], purpleDark[2]);
      doc.text(`${lang.percentage}% (${lang.count} repos)`, pageWidth - margin - 6, y + 9, { align: "right" });

      const lBarW = 75;
      const lBarX = margin + 65;
      const lBarY = y + 5.5;

      doc.setFillColor(229, 231, 235);
      doc.roundedRect(lBarX, lBarY, lBarW, 4, 1, 1, "F");

      const lFill = Math.max(3, (lBarW * lang.percentage) / 100);
      doc.setFillColor(purplePrimary[0], purplePrimary[1], purplePrimary[2]);
      doc.roundedRect(lBarX, lBarY, lFill, 4, 1, 1, "F");

      y += 17;
    });
  } else {
    doc.setFontSize(8.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text("Language data unavailable.", margin, y + 4);
    y += 12;
  }

  y += 5;

  // 10 Skill Breakdown Progress Cards
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text("DEVELOPER SKILLS MATRIX (0-100)", margin, y);

  y += 6;

  const breakdown = analysis.developerMetrics?.skillsBreakdown || {
    frontend: 80,
    backend: 70,
    database: 65,
    aiMl: 40,
    devOps: 50,
    cloud: 55,
    problemSolving: 75,
    documentation: 60,
    uiUx: 70,
    testing: 45,
  };

  const skillPairs = [
    [
      { label: "Frontend Development", val: breakdown.frontend },
      { label: "Backend Architecture", val: breakdown.backend },
    ],
    [
      { label: "Database Management", val: breakdown.database },
      { label: "AI / Machine Learning", val: breakdown.aiMl },
    ],
    [
      { label: "DevOps & CI/CD", val: breakdown.devOps },
      { label: "Cloud Infrastructure", val: breakdown.cloud },
    ],
    [
      { label: "Problem Solving", val: breakdown.problemSolving },
      { label: "Documentation Quality", val: breakdown.documentation },
    ],
    [
      { label: "UI / UX Design", val: breakdown.uiUx },
      { label: "Software Testing", val: breakdown.testing },
    ],
  ];

  const colW = (contentWidth - 6) / 2;

  skillPairs.forEach((pair) => {
    pair.forEach((item, colIdx) => {
      const px = margin + colIdx * (colW + 6);

      doc.setFillColor(bgCard[0], bgCard[1], bgCard[2]);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.roundedRect(px, y, colW, 13, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(item.label, px + 5, y + 8);

      doc.setFontSize(8);
      doc.setTextColor(purpleDark[0], purpleDark[1], purpleDark[2]);
      doc.text(`${item.val}/100`, px + colW - 5, y + 8, { align: "right" });
    });
    y += 16;
  });

  // -------------------------------------------------------------
  // PAGE 3: TOP PROJECTS
  // -------------------------------------------------------------
  doc.addPage();
  addPageHeaderFooter(3, 7, "Top Portfolio Projects");
  y = 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(purpleDark[0], purpleDark[1], purpleDark[2]);
  doc.text("Featured Portfolio Projects", margin, y);
  doc.line(margin, y + 3, pageWidth - margin, y + 3);

  y += 12;

  const projects = (analysis.bestProjects || []).slice(0, 4);

  if (projects.length > 0) {
    projects.forEach((proj, idx) => {
      doc.setFillColor(bgCard[0], bgCard[1], bgCard[2]);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.roundedRect(margin, y, contentWidth, 48, 3, 3, "FD");

      // Project Title & Number Badge
      doc.setFillColor(purpleDark[0], purpleDark[1], purpleDark[2]);
      doc.roundedRect(margin + 6, y + 6, 18, 6, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`PROJ 0${idx + 1}`, margin + 15, y + 10.2, { align: "center" });

      // Project Name (Truncated if too long so stats don't overlap or overflow container)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      const maxNameWidth = 90;
      let projName = proj.name;
      if (doc.getTextWidth(projName) > maxNameWidth) {
        while (projName.length > 3 && doc.getTextWidth(projName + "...") > maxNameWidth) {
          projName = projName.slice(0, -1);
        }
        projName += "...";
      }
      doc.text(projName, margin + 28, y + 10.5);

      // Stars & Forks (Aligned cleanly inside card container boundary)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(amberText[0], amberText[1], amberText[2]);
      doc.text(`${proj.stars} stars  |  ${proj.forks} forks`, pageWidth - margin - 8, y + 10.5, { align: "right" });

      // Description
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      const descText = proj.description || "No project description provided in repository metadata.";
      const descLines = doc.splitTextToSize(descText, contentWidth - 16);
      doc.text(descLines.slice(0, 2), margin + 8, y + 20);

      // Metadata Row
      doc.setFont("helvetica", "semibold");
      doc.setFontSize(8);
      doc.setTextColor(purpleDark[0], purpleDark[1], purpleDark[2]);
      doc.text(`Language: ${proj.language || "Multi-language / Config"}`, margin + 8, y + 33);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text(`Last Updated: ${proj.updatedAt || "Recent"}`, margin + 65, y + 33);

      // Selection Reason Box
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(margin + 8, y + 37, contentWidth - 16, 7, 1, 1, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(55, 65, 81);
      doc.text(`Reason: Strong activity signals with ${proj.stars} star(s) and structured code repository setup.`, margin + 11, y + 41.5);

      y += 54;
    });
  } else {
    doc.setFillColor(bgCard[0], bgCard[1], bgCard[2]);
    doc.roundedRect(margin, y, contentWidth, 30, 2, 2, "F");
    doc.setFontSize(9);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text("No public repositories available for project analysis.", margin + 8, y + 16);
  }

  // -------------------------------------------------------------
  // PAGE 4: GITHUB HEALTH REPORT
  // -------------------------------------------------------------
  doc.addPage();
  addPageHeaderFooter(4, 7, "GitHub Health Assessment");
  y = 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(purpleDark[0], purpleDark[1], purpleDark[2]);
  doc.text("GitHub Profile Health Report", margin, y);
  doc.line(margin, y + 3, pageWidth - margin, y + 3);

  y += 12;

  // Health Score Header Card
  const healthScore = analysis.healthReport?.score || 82;
  doc.setFillColor(245, 243, 255);
  doc.setDrawColor(221, 214, 254);
  doc.roundedRect(margin, y, contentWidth, 26, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(purpleDark[0], purpleDark[1], purpleDark[2]);
  doc.text(`Overall GitHub Health Score: ${healthScore} / 100`, margin + 8, y + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(
    healthScore >= 80 ? "Excellent profile health with strong public presence." : "Good foundation with clear growth opportunities.",
    margin + 8,
    y + 20
  );

  y += 34;

  // Strengths Card
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(margin, y, contentWidth, 75, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(22, 101, 52);
  doc.text("PROFILE STRENGTHS", margin + 8, y + 12);

  const strengths = analysis.healthReport?.strengths || [
    "Consistent public repository structure",
    "Active use of primary programming languages",
    "Clear GitHub account setup with public visibility",
  ];

  let strY = y + 21;
  strengths.forEach((str) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(22, 101, 52);
    doc.text("✓", margin + 8, strY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    const sLines = doc.splitTextToSize(str, contentWidth - 24);
    doc.text(sLines, margin + 14, strY);
    strY += sLines.length * 5 + 4;
  });

  y += 84;

  // Areas to Improve Card
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(margin, y, contentWidth, 75, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(153, 27, 27);
  doc.text("WHAT CAN BE IMPROVED", margin + 8, y + 12);

  const improvements = analysis.healthReport?.improvements || [
    "Add detailed README.md files to top repositories",
    "Include live deployment URLs in repository headers",
    "Diversify backend and database technology projects",
  ];

  let impY = y + 21;
  improvements.forEach((imp) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(153, 27, 27);
    doc.text("!", margin + 8, impY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    const iLines = doc.splitTextToSize(imp, contentWidth - 24);
    doc.text(iLines, margin + 14, impY);
    impY += iLines.length * 5 + 4;
  });

  // -------------------------------------------------------------
  // PAGE 5: PORTFOLIO & CAREER READINESS
  // -------------------------------------------------------------
  doc.addPage();
  addPageHeaderFooter(5, 7, "Portfolio & Career Readiness");
  y = 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(purpleDark[0], purpleDark[1], purpleDark[2]);
  doc.text("Recruiter Perspective & Portfolio Checklist", margin, y);
  doc.line(margin, y + 3, pageWidth - margin, y + 3);

  y += 12;

  // Overall Recruiter Quote Box
  doc.setFillColor(238, 242, 255);
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(margin, y, contentWidth, 34, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(55, 48, 163);
  doc.text(`RECRUITER IMPRESSION  •  ${analysis.recruiterPerspective?.readinessStatus || "Internship Ready"}`, margin + 8, y + 10);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  const quoteText = `"${analysis.recruiterPerspective?.overallImpression || "Profile exhibits good technical foundation and hands-on coding experience."}"`;
  const qLines = doc.splitTextToSize(quoteText, contentWidth - 16);
  doc.text(qLines.slice(0, 3), margin + 8, y + 18);

  y += 42;

  // Readiness Scores (4 Pillars)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text("CAREER ARCHETYPE & READINESS PILLARS", margin, y);

  y += 6;

  const readiness = analysis.developerPersonality?.readinessScores || {
    startupReadiness: 85,
    enterpriseReadiness: 70,
    freelancerPotential: 75,
    leadershipPotential: 65,
  };

  const pillars = [
    { label: "Startup Readiness", val: readiness.startupReadiness },
    { label: "Enterprise Readiness", val: readiness.enterpriseReadiness },
    { label: "Freelancer Potential", val: readiness.freelancerPotential },
    { label: "Leadership Potential", val: readiness.leadershipPotential },
  ];

  pillars.forEach((p) => {
    doc.setFillColor(bgCard[0], bgCard[1], bgCard[2]);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(p.label, margin + 6, y + 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(purpleDark[0], purpleDark[1], purpleDark[2]);
    doc.text(`${p.val}%`, pageWidth - margin - 6, y + 8, { align: "right" });

    y += 15;
  });

  y += 5;

  // Verification Checklist (Determined strictly from data)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text("PORTFOLIO VERIFICATION CHECKLIST", margin, y);

  y += 6;

  const checklistItems = [
    { label: "Public Repositories Available", pass: analysis.publicReposCount > 0 },
    { label: "Meaningful Projects (>1 Repo)", pass: analysis.publicReposCount >= 2 },
    { label: "Repository Descriptions Provided", pass: (analysis.bestProjects || []).some((p) => Boolean(p.description)) },
    { label: "GitHub Profile Bio Set", pass: Boolean(analysis.bio) },
    { label: "Portfolio Website Linked", pass: Boolean(analysis.portfolioUrl) },
    { label: "Multi-Language Tech Diversity", pass: (analysis.mostUsedLanguages || []).length >= 2 },
  ];

  checklistItems.forEach((chk) => {
    doc.setFillColor(chk.pass ? 240 : 254, chk.pass ? 253 : 242, chk.pass ? 244 : 242);
    doc.setDrawColor(chk.pass ? 187 : 254, chk.pass ? 247 : 202, chk.pass ? 208 : 202);
    doc.roundedRect(margin, y, contentWidth, 10, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(chk.pass ? greenText[0] : 185, chk.pass ? greenText[1] : 28, chk.pass ? greenText[2] : 28);
    doc.text(chk.pass ? "✓ VERIFIED" : "✗ MISSING", margin + 6, y + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(chk.label, margin + 34, y + 7);

    y += 13;
  });

  // -------------------------------------------------------------
  // PAGE 6: PERSONALIZED LEARNING ROADMAP
  // -------------------------------------------------------------
  doc.addPage();
  addPageHeaderFooter(6, 7, "Personalized Learning Roadmap");
  y = 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(purpleDark[0], purpleDark[1], purpleDark[2]);
  doc.text("Personalized Learning & Skill Progression", margin, y);
  doc.line(margin, y + 3, pageWidth - margin, y + 3);

  y += 12;

  const topLangs = (analysis.mostUsedLanguages || []).map((l) => l.language);
  const primaryLang = topLangs[0] || "JavaScript";

  const roadmapSteps = [
    { title: "Current Core Skills", desc: `Consolidate proficiency in ${topLangs.slice(0, 3).join(", ") || primaryLang}` },
    { title: "Skills to Strengthen", desc: "Build backend REST APIs, authentication flows, and relational database schemas" },
    { title: "Recommended Tech Stack", desc: `Expand into ${primaryLang === "JavaScript" || primaryLang === "TypeScript" ? "React, Next.js, Node.js, and Docker" : "Production-level frameworks and Cloud deployments"}` },
    { title: "Project Upgrades", desc: "Add comprehensive README documentation, environment setup guides, and live demo links" },
    { title: "Next Career Milestone", desc: analysis.recruiterPerspective?.readinessStatus || "Internship & Placement Applications" },
  ];

  roadmapSteps.forEach((step, idx) => {
    doc.setFillColor(bgCard[0], bgCard[1], bgCard[2]);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.roundedRect(margin, y, contentWidth, 22, 2, 2, "FD");

    // Step Number Badge
    doc.setFillColor(purpleDark[0], purpleDark[1], purpleDark[2]);
    doc.roundedRect(margin + 5, y + 5, 14, 12, 1.5, 1.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`0${idx + 1}`, margin + 12, y + 13, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(step.title, margin + 24, y + 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(step.desc, margin + 24, y + 16);

    y += 26;
  });

  // AI Recommended Actions Box
  y += 4;
  doc.setFillColor(245, 243, 255);
  doc.setDrawColor(221, 214, 254);
  doc.roundedRect(margin, y, contentWidth, 54, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(purpleDark[0], purpleDark[1], purpleDark[2]);
  doc.text("AI TAILORED RECOMMENDATIONS FOR YOUR PROFILE", margin + 8, y + 11);

  const recs = analysis.aiRecommendations || [
    "Create 1 production-grade full stack capstone project with live Vercel/Render deployment.",
    "Write exhaustive README.md documentation including architecture diagrams and setup instructions.",
    "Add 3-5 technical topics/tags to your top repositories to boost GitHub search discoverability.",
  ];

  let recY = y + 19;
  recs.slice(0, 3).forEach((r) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(purplePrimary[0], purplePrimary[1], purplePrimary[2]);
    doc.text("•", margin + 8, recY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    const rLines = doc.splitTextToSize(r, contentWidth - 20);
    doc.text(rLines, margin + 14, recY);
    recY += rLines.length * 4.5 + 4;
  });

  // -------------------------------------------------------------
  // PAGE 7: ACTION PLAN & CHATGPT READY PROMPT
  // -------------------------------------------------------------
  doc.addPage();
  addPageHeaderFooter(7, 7, "Growth Action Plan & AI Prompt");
  y = 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(purpleDark[0], purpleDark[1], purpleDark[2]);
  doc.text("Your Developer Growth Action Plan", margin, y);
  doc.line(margin, y + 3, pageWidth - margin, y + 3);

  y += 10;

  const actionItems = [
    { period: "QUICK WINS", task: "Add bio, portfolio link, and update READMEs for top 2 repositories" },
    { period: "NEXT 7 DAYS", task: "Add topics/tags to repositories and host live working demos on Vercel" },
    { period: "NEXT 30 DAYS", task: "Build 1 end-to-end full stack app with database integration and authentication" },
    { period: "BEFORE APPLYING", task: "Ensure zero broken links, consistent commits, and 100% complete portfolio checklist" },
  ];

  actionItems.forEach((act) => {
    doc.setFillColor(bgCard[0], bgCard[1], bgCard[2]);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, "FD");

    doc.setFillColor(purpleDark[0], purpleDark[1], purpleDark[2]);
    doc.roundedRect(margin + 4, y + 3, 30, 8, 1, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(act.period, margin + 19, y + 8.2, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(act.task, margin + 38, y + 8.5);

    y += 17;
  });

  y += 6;

  // CHATGPT / AI READY SECTION
  doc.setFillColor(245, 243, 255);
  doc.setDrawColor(167, 139, 250);
  doc.roundedRect(margin, y, contentWidth, 90, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(purpleDark[0], purpleDark[1], purpleDark[2]);
  doc.text("TAKE THIS REPORT FURTHER WITH AI", margin + 8, y + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text("Want a personalized improvement strategy? Upload this PDF to ChatGPT/Gemini and use the prompt below:", margin + 8, y + 18);

  // Copyable Prompt Border Box
  const promptY = y + 23;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(221, 214, 254);
  doc.roundedRect(margin + 8, promptY, contentWidth - 16, 56, 2, 2, "FD");

  const promptText = `Analyze my Paperino GitHub Intelligence Developer Report.

Based only on the information available in this report, identify my strongest developer skills, weaknesses, missing GitHub improvements, portfolio gaps, and areas I should prioritize.

Then create a practical 30-day improvement plan to strengthen my GitHub profile for internships and placements.

Divide the plan week-by-week and recommend specific actions, technologies, repository improvements and project ideas appropriate for my current skill level.`;

  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(55, 48, 163);
  const pLines = doc.splitTextToSize(promptText, contentWidth - 24);
  doc.text(pLines, margin + 12, promptY + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(purplePrimary[0], purplePrimary[1], purplePrimary[2]);
  doc.text("Generated using  •  Paperino Labs  •  GitHub Intelligence", margin + 8, y + 84);

  // Save/Download PDF
  const filename = `Paperino_GitHub_Intelligence_${analysis.username}.pdf`;
  doc.save(filename);
}
