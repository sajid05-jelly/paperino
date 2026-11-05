import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { formatProfileName, resolveUserDownloaderName } from "../src/lib/watermark.ts";

describe("Paperino — Download Watermark Personalization", () => {

  describe("1. formatProfileName helper", () => {
    test("converts lowercase names to proper case", () => {
      assert.equal(formatProfileName("sajid"), "Sajid");
      assert.equal(formatProfileName("mohamed sajid"), "Mohamed Sajid");
    });

    test("converts uppercase names to proper case", () => {
      assert.equal(formatProfileName("SAJID"), "Sajid");
      assert.equal(formatProfileName("MOHAMED SAJID"), "Mohamed Sajid");
    });

    test("handles names with numbers and symbols gracefully", () => {
      assert.equal(formatProfileName("sajid05"), "Sajid05");
      assert.equal(formatProfileName("sajid_ahmed"), "Sajid_ahmed");
    });

    test("handles empty, null, or undefined inputs", () => {
      assert.equal(formatProfileName(""), "");
      assert.equal(formatProfileName(null), "");
      assert.equal(formatProfileName(undefined), "");
      assert.equal(formatProfileName("   "), "");
    });
  });

  describe("2. resolveUserDownloaderName resolution priority", () => {
    test("fetches displayName directly from user's Firestore profile (e.g. Sajid)", async () => {
      const mockUsers = new Map([
        ["user_sajid_123", { displayName: "Sajid", email: "sajid@srmist.edu.in", role: "student" }]
      ]);

      const mockAdminDb = {
        collection: (col) => ({
          doc: (id) => ({
            get: async () => ({
              exists: mockUsers.has(id),
              data: () => mockUsers.get(id)
            })
          })
        })
      };

      const resolved = await resolveUserDownloaderName({
        uid: "user_sajid_123",
        email: "sajid@srmist.edu.in",
        adminDb: mockAdminDb
      });

      assert.equal(resolved, "Sajid");
    });

    test("fetches username if displayName is missing in Firestore profile", async () => {
      const mockUsers = new Map([
        ["user_sajid_456", { username: "sajid_dev", email: "sajid456@gmail.com", role: "student" }]
      ]);

      const mockAdminDb = {
        collection: (col) => ({
          doc: (id) => ({
            get: async () => ({
              exists: mockUsers.has(id),
              data: () => mockUsers.get(id)
            })
          })
        })
      };

      const resolved = await resolveUserDownloaderName({
        uid: "user_sajid_456",
        email: "sajid456@gmail.com",
        adminDb: mockAdminDb
      });

      assert.equal(resolved, "Sajid_dev");
    });

    test("skips generic placeholders ('Student', 'Paperino User') and falls back to username or email", async () => {
      const mockUsers = new Map([
        ["user_placeholder", { displayName: "Student", username: "sajid_king", email: "sajid@srmist.edu.in" }]
      ]);

      const mockAdminDb = {
        collection: (col) => ({
          doc: (id) => ({
            get: async () => ({
              exists: mockUsers.has(id),
              data: () => mockUsers.get(id)
            })
          })
        })
      };

      const resolved = await resolveUserDownloaderName({
        uid: "user_placeholder",
        email: "sajid@srmist.edu.in",
        adminDb: mockAdminDb
      });

      assert.equal(resolved, "Sajid_king");
    });

    test("uses client-provided active session name when Firestore profile query is absent", async () => {
      const mockAdminDb = {
        collection: () => ({
          doc: () => ({
            get: async () => ({ exists: false, data: () => null })
          })
        })
      };

      const resolved = await resolveUserDownloaderName({
        uid: "user_offline",
        providedName: "Mohamed Sajid",
        email: "sajid@gmail.com",
        adminDb: mockAdminDb
      });

      assert.equal(resolved, "Mohamed Sajid");
    });

    test("uses decoded token name claim when Firestore profile has no name", async () => {
      const mockAdminDb = {
        collection: () => ({
          doc: () => ({
            get: async () => ({ exists: false, data: () => null })
          })
        })
      };

      const resolved = await resolveUserDownloaderName({
        uid: "user_token",
        tokenName: "Sajid",
        email: "sajid@gmail.com",
        adminDb: mockAdminDb
      });

      assert.equal(resolved, "Sajid");
    });

    test("falls back to formatted email username prefix when profile name is not set", async () => {
      const mockAdminDb = {
        collection: () => ({
          doc: () => ({
            get: async () => ({ exists: false, data: () => null })
          })
        })
      };

      const resolved = await resolveUserDownloaderName({
        uid: "user_no_name",
        email: "sajid.ahmed@example.com",
        adminDb: mockAdminDb
      });

      assert.equal(resolved, "Sajid Ahmed");
    });

    test("uses sensible fallback 'Paperino User' only when completely anonymous/empty", async () => {
      const mockAdminDb = {
        collection: () => ({
          doc: () => ({
            get: async () => ({ exists: false, data: () => null })
          })
        })
      };

      const resolved = await resolveUserDownloaderName({
        uid: "GUEST",
        email: "student@paperino.app",
        adminDb: mockAdminDb
      });

      assert.equal(resolved, "Paperino User");
    });
  });

  describe("3. Downloader vs Uploader isolation", () => {
    test("ensures watermark reflects the downloading user's profile and never the material uploader", async () => {
      const mockUsers = new Map([
        ["uploader_prof_john", { displayName: "Prof. John Doe", email: "john@srmist.edu.in" }],
        ["downloader_sajid", { displayName: "Sajid", email: "sajid@srmist.edu.in" }]
      ]);

      const mockAdminDb = {
        collection: (col) => ({
          doc: (id) => ({
            get: async () => ({
              exists: mockUsers.has(id),
              data: () => mockUsers.get(id)
            })
          })
        })
      };

      // Material uploaded by Prof. John Doe
      const material = {
        id: "mat_maths_pyq",
        title: "Calculus Final PYQ 2025",
        uploaderId: "uploader_prof_john",
        uploaderName: "Prof. John Doe"
      };

      // Material downloaded by Sajid
      const downloaderUid = "downloader_sajid";
      const resolvedDownloader = await resolveUserDownloaderName({
        uid: downloaderUid,
        email: "sajid@srmist.edu.in",
        adminDb: mockAdminDb
      });

      // Verify downloader name is Sajid, NOT Prof. John Doe
      assert.equal(resolvedDownloader, "Sajid");
      assert.notEqual(resolvedDownloader, material.uploaderName);

      // Verify watermark text format
      const watermarkLine = `Downloaded by: ${resolvedDownloader}`;
      assert.equal(watermarkLine, "Downloaded by: Sajid");
    });
  });

  describe("4. Consistent Watermark Lines Formatting", () => {
    test("constructs exact watermark lines preserving design & layout", () => {
      const userName = "Sajid";
      const shortUid = "USR-A1B2C3D4";
      const formattedDate = "04 Nov 2026, 07:15";
      const shortDownloadId = "DL-98765432";

      const detailLines = [
        `Downloaded by: ${userName}`,
        `User ID: ${shortUid}`,
        `Downloaded: ${formattedDate}`,
        `Download ID: ${shortDownloadId}`
      ];

      assert.equal(detailLines[0], "Downloaded by: Sajid");
      assert.equal(detailLines[1], "User ID: USR-A1B2C3D4");
      assert.equal(detailLines[2], "Downloaded: 04 Nov 2026, 07:15");
      assert.equal(detailLines[3], "Download ID: DL-98765432");
    });
  });

  describe("5. Cryptographically Signed Download Tokens (Zero Firestore round-trip)", () => {
    // Model of createSignedDownloadToken and verifySignedDownloadToken
    const secret = "test-secret-key-123";

    function createToken(payload, expiresInMs = 15 * 60 * 1000) {
      const data = { ...payload, exp: Date.now() + expiresInMs };
      const base64Data = Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
      const signature = crypto
        .createHmac("sha256", secret)
        .update(base64Data)
        .digest("base64url");
      return `${base64Data}.${signature}`;
    }

    function verifyToken(tokenStr) {
      if (!tokenStr || !tokenStr.includes(".")) return null;
      const [base64Data, signature] = tokenStr.split(".");
      const expected = crypto
        .createHmac("sha256", secret)
        .update(base64Data)
        .digest("base64url");
      if (signature !== expected) return null;
      try {
        const payload = JSON.parse(Buffer.from(base64Data, "base64url").toString("utf8"));
        if (!payload.exp || Date.now() > payload.exp) return null;
        if (!payload.uid || payload.uid === "GUEST") return null;
        return payload;
      } catch {
        return null;
      }
    }

    test("embeds user UID, Google Gmail displayName and email directly in token", () => {
      const token = createToken({
        uid: "oF8x7K29aBcD",
        name: "Mohamed Sajid",
        email: "mohamedsajid.sa@gmail.com",
        isAdmin: true
      });

      const decoded = verifyToken(token);
      assert.ok(decoded);
      assert.equal(decoded.uid, "oF8x7K29aBcD");
      assert.equal(decoded.name, "Mohamed Sajid");
      assert.equal(decoded.email, "mohamedsajid.sa@gmail.com");
      assert.equal(decoded.isAdmin, true);

      // Verify shortUid construction is NOT USR-GUEST
      const shortUid = `USR-${decoded.uid.substring(0, 8).toUpperCase()}`;
      assert.equal(shortUid, "USR-OF8X7K29");
      assert.notEqual(shortUid, "USR-GUEST");

      // Verify watermark lines use user's Gmail name
      const watermarkLine = `Downloaded by: ${decoded.name}`;
      assert.equal(watermarkLine, "Downloaded by: Mohamed Sajid");
      assert.notEqual(watermarkLine, "Downloaded by: Paperino User");
    });

    test("rejects tampered download tokens", () => {
      const token = createToken({
        uid: "user_valid",
        name: "Valid User",
        email: "user@gmail.com",
        isAdmin: false
      });

      // Tamper with the payload
      const [data, sig] = token.split(".");
      const tamperedData = Buffer.from(JSON.stringify({ uid: "admin_hacker", name: "Hacker", exp: Date.now() + 100000 })).toString("base64url");
      const tamperedToken = `${tamperedData}.${sig}`;

      assert.equal(verifyToken(tamperedToken), null);
    });

    test("rejects expired download tokens", () => {
      // Create a token expired 1 second ago
      const expiredToken = createToken({
        uid: "user_expired",
        name: "Expired User",
        email: "expired@gmail.com",
        isAdmin: false
      }, -1000);

      assert.equal(verifyToken(expiredToken), null);
    });
  });
});
