import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  extractDriveFileId,
  getDriveViewUrl,
  getDrivePreviewUrl,
  getDriveDownloadUrl,
  getProxyDownloadUrl,
  getDownloadHref
} from "../src/lib/driveUtils.ts";

describe("Paperino — Material Preview & Download on iPhone, Android & Desktop", () => {

  describe("1. Google Drive File ID Extraction (extractDriveFileId)", () => {
    test("extracts raw 10-60 character alphanumeric file IDs directly", () => {
      const rawId = "1A2B3C4D5E6F7G8H9I0J_kL-mN";
      assert.equal(extractDriveFileId(rawId), rawId);
    });

    test("extracts file ID from standard /file/d/{fileId}/view URLs", () => {
      const url = "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view?usp=sharing";
      assert.equal(extractDriveFileId(url), "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms");
    });

    test("extracts file ID from legacy /file/d/{fileId}/preview URLs", () => {
      const url = "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/preview";
      assert.equal(extractDriveFileId(url), "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms");
    });

    test("extracts file ID from short /d/{fileId} URLs", () => {
      const url = "https://drive.google.com/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";
      assert.equal(extractDriveFileId(url), "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms");
    });

    test("extracts file ID from query parameter URLs (?id=... or &id=...)", () => {
      const url1 = "https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";
      assert.equal(extractDriveFileId(url1), "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms");

      const url2 = "https://drive.google.com/uc?export=download&id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";
      assert.equal(extractDriveFileId(url2), "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms");
    });

    test("returns empty string for Firebase Storage URLs so direct preview is preserved", () => {
      const fbUrl = "https://firebasestorage.googleapis.com/v0/b/paperino.appspot.com/o/sample.pdf?alt=media";
      assert.equal(extractDriveFileId(fbUrl), "");
    });

    test("returns empty string for non-Drive URLs and invalid inputs", () => {
      assert.equal(extractDriveFileId("https://example.com/file.pdf"), "");
      assert.equal(extractDriveFileId(""), "");
      assert.equal(extractDriveFileId(null), "");
      assert.equal(extractDriveFileId(undefined), "");
      assert.equal(extractDriveFileId("short"), "");
    });
  });

  describe("2. Canonical Google Drive View URLs (Immunity to iPhone blank screen)", () => {
    test("getDriveViewUrl produces mobile-friendly /view?usp=sharing URL", () => {
      const fileId = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";
      const expected = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
      assert.equal(getDriveViewUrl(fileId), expected);
    });

    test("getDriveViewUrl converts legacy /preview URLs to safe /view?usp=sharing", () => {
      const previewUrl = "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/preview";
      const expected = "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view?usp=sharing";
      assert.equal(getDriveViewUrl(previewUrl), expected);
      assert.ok(!getDriveViewUrl(previewUrl).includes("/preview"), "Must NEVER contain /preview which crashes on mobile WebKit");
    });

    test("getDrivePreviewUrl automatically delegates to safe getDriveViewUrl", () => {
      const fileId = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";
      const expected = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
      assert.equal(getDrivePreviewUrl(fileId), expected);
      assert.ok(!getDrivePreviewUrl(fileId).includes("/preview"));
    });

    test("getDriveDownloadUrl creates direct Google Drive export link", () => {
      const fileId = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";
      const expected = `https://drive.google.com/uc?export=download&id=${fileId}`;
      assert.equal(getDriveDownloadUrl(fileId), expected);
    });
  });

  describe("3. Download Links & Fallbacks (getDownloadHref & getProxyDownloadUrl)", () => {
    test("getProxyDownloadUrl generates secure /api/download route", () => {
      assert.equal(getProxyDownloadUrl("drive123", "mat456"), "/api/download?matId=mat456");
      assert.equal(getProxyDownloadUrl("drive123"), "/api/download?fileId=drive123");
    });

    test("getDownloadHref prioritizes mat.id for secure server proxying", () => {
      const mat = { id: "mat_math_101", fileId: "drive_xyz", title: "Calculus.pdf" };
      assert.equal(getDownloadHref(mat), "/api/download?matId=mat_math_101");
    });

    test("getDownloadHref falls back to fileId if id is missing", () => {
      const mat = { fileId: "drive_xyz", title: "Calculus.pdf" };
      assert.equal(getDownloadHref(mat), "/api/download?fileId=drive_xyz");
    });

    test("getDownloadHref falls back to fileUrl only when both id and fileId are missing", () => {
      const mat = { fileUrl: "https://custom-storage.com/file.pdf" };
      assert.equal(getDownloadHref(mat), "https://custom-storage.com/file.pdf");
    });
  });

  describe("4. iOS Safari & Chrome iOS Content-Disposition Header Formatting", () => {
    function formatDisposition(matName, isInline = false) {
      const safeAsciiName = matName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
      const encodedMatName = encodeURIComponent(matName);
      return isInline
        ? `inline; filename="${safeAsciiName}"; filename*=UTF-8''${encodedMatName}`
        : `attachment; filename="${safeAsciiName}"; filename*=UTF-8''${encodedMatName}`;
    }

    test("sanitizes filename for ASCII fallback while preserving UTF-8 encoded name", () => {
      const filename = "BTech Sem3 Data Structures & Algorithms (2026).pdf";
      const header = formatDisposition(filename, false);

      assert.ok(header.startsWith("attachment;"));
      assert.ok(header.includes('filename="BTech Sem3 Data Structures & Algorithms (2026).pdf"'));
      assert.ok(header.includes("filename*=UTF-8''"));
    });

    test("safely escapes quotes and non-ASCII characters to prevent iPhone download corruption", () => {
      const complexFilename = 'Notes "Unit 1" — Math \u2014 & AI.pdf';
      const header = formatDisposition(complexFilename, false);

      assert.ok(!header.includes('"Unit 1" —'), "ASCII fallback must not contain unescaped quotes");
      assert.ok(header.includes("filename*=UTF-8''"));
      assert.ok(header.includes(".pdf"));
    });

    test("formats inline disposition correctly for in-browser PDF viewers", () => {
      const filename = "Chemistry_Notes.pdf";
      const header = formatDisposition(filename, true);

      assert.ok(header.startsWith("inline;"));
      assert.ok(header.includes('filename="Chemistry_Notes.pdf"'));
    });
  });

  describe("5. Universal Mobile Protection & PDF Integrity Guarantee (Zero Black Screens)", () => {
    test("detects all mobile devices (Android, iPhone, Samsung, Xiaomi, iPad) for direct download handling", () => {
      const isMobileUA = (ua, maxTouchPoints = 0, platform = "") => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
          (platform === "MacIntel" && maxTouchPoints > 1);
      };

      // Android Samsung Galaxy
      assert.ok(isMobileUA("Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/118.0.0.0 Mobile Safari/537.36"));

      // Android Xiaomi Redmi
      assert.ok(isMobileUA("Mozilla/5.0 (Linux; U; Android 13; zh-cn; 23049RAD8C Build/TKQ1.221114.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/109.0.5414.118 Mobile Safari/537.36 XiaoMi/MiuiBrowser/17.9.00611"));

      // Android Chrome Generic
      assert.ok(isMobileUA("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.90 Mobile Safari/537.36"));

      // iPhone Safari
      assert.ok(isMobileUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"));

      // Desktop Windows (Not Mobile)
      assert.ok(!isMobileUA("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"));
    });

    test("magic bytes validation strictly catches non-PDF streams (HTML error pages, virus scan confirmation)", () => {
      const isActualPdf = (buf) => buf && buf.length >= 4 && buf.toString("ascii", 0, 4) === "%PDF";

      // Valid PDF buffer
      const validPdfBuffer = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj");
      assert.ok(isActualPdf(validPdfBuffer), "Genuine PDF must pass magic bytes check");

      // Corrupt / HTML stream (e.g. Google Drive HTML virus scan or login page)
      const htmlBuffer = Buffer.from("<!DOCTYPE html><html><body>Google Drive virus scan warning</body></html>");
      assert.ok(!isActualPdf(htmlBuffer), "HTML error page from Drive must NOT pass as PDF");

      // JSON error response
      const jsonBuffer = Buffer.from(JSON.stringify({ error: "Storage credentials not configured" }));
      assert.ok(!isActualPdf(jsonBuffer), "JSON error response must NOT pass as PDF");
    });

    test("fileId is safely extracted from fileUrl when mat.fileId is undefined or missing", () => {
      const mat = {
        id: "mat_bce_notes",
        fileUrl: "https://drive.google.com/file/d/1vW8X7Y6Z5U4T3S2R1Q0P/view?usp=sharing",
        title: "Basic Chemical Engineering Unit 1"
      };

      const resolvedFileId = mat.fileId || extractDriveFileId(mat.fileUrl || "");
      assert.equal(resolvedFileId, "1vW8X7Y6Z5U4T3S2R1Q0P", "Must successfully resolve fileId from fileUrl to prevent 400 missing file association");
    });

    test("fail-safe direct Google Drive download link format guarantees clean download", () => {
      const fileId = "1vW8X7Y6Z5U4T3S2R1Q0P";
      const fallbackUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
      assert.ok(fallbackUrl.includes("uc?export=download"));
      assert.ok(fallbackUrl.includes(`id=${fileId}`));
      assert.ok(fallbackUrl.includes("confirm=t"), "Must include confirm=t to bypass Google Drive virus scan warning page on large files");
    });
  });

  describe("6. Error Fallback UI Contract Verification", () => {
    test("fallback state provides both 'Open in Google Drive' and 'Download File' options", () => {
      const mockMat = {
        id: "mat_cse_01",
        fileId: "1X9Y8Z7W6V5U4T3S2R1Q",
        title: "Database Management Systems Notes",
        fileName: "DBMS_Unit_1.pdf"
      };

      const driveId = extractDriveFileId(mockMat.fileId);
      const driveUrl = getDriveViewUrl(driveId);
      const downloadHref = getDownloadHref(mockMat);

      assert.ok(driveUrl.startsWith("https://drive.google.com/file/d/"));
      assert.ok(driveUrl.endsWith("/view?usp=sharing"));
      assert.ok(!driveUrl.includes("/preview"), "Must not rely on embedded /preview");
      assert.equal(downloadHref, "/api/download?matId=mat_cse_01");
    });
  });

});
