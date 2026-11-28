import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env / .env.local
const envLocalPath = path.resolve(__dirname, "../.env.local");
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("❌ MONGODB_URI is not set in .env.local or environment!");
  console.log("Please add MONGODB_URI=mongodb+srv://... to your .env.local and try again.");
  process.exit(1);
}

async function run() {
  console.log("🚀 Connecting to MongoDB Atlas...");
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Successfully connected to MongoDB Atlas!");

    const db = client.db("paperino");

    // 1. Materials Collection
    const verifiedMaterialsPath = path.resolve(__dirname, "../src/data/verified_materials.json");
    if (fs.existsSync(verifiedMaterialsPath)) {
      const raw = fs.readFileSync(verifiedMaterialsPath, "utf-8");
      const materials = JSON.parse(raw);
      console.log(`📦 Found ${materials.length} verified materials to sync...`);

      const materialsCol = db.collection("materials");
      
      // Create indexes for super fast queries with 0 latency
      await materialsCol.createIndex({ departmentId: 1, semesterId: 1, subjectId: 1 });
      await materialsCol.createIndex({ id: 1 }, { unique: true });
      await materialsCol.createIndex({ category: 1 });

      const bulkOps = materials.map((m) => ({
        updateOne: {
          filter: { id: m.id },
          update: {
            $set: {
              ...m,
              updatedAt: new Date(),
            },
          },
          upsert: true,
        },
      }));

      const res = await materialsCol.bulkWrite(bulkOps);
      console.log(`✅ Materials Synced! Upserted: ${res.upsertedCount}, Modified: ${res.modifiedCount}, Matched: ${res.matchedCount}`);
    }

    // 2. Subjects Catalog Collection
    const catalogPath = path.resolve(__dirname, "../src/data/comprehensive_catalog.json");
    if (fs.existsSync(catalogPath)) {
      const raw = fs.readFileSync(catalogPath, "utf-8");
      const parsed = JSON.parse(raw);
      const subjects = Array.isArray(parsed) ? parsed : parsed.subjects || [];
      console.log(`📚 Found ${subjects.length} catalog subjects to sync...`);

      if (subjects.length > 0) {
        const subjectsCol = db.collection("subjects");
        await subjectsCol.createIndex({ departmentId: 1, semesterId: 1, id: 1 });
        await subjectsCol.createIndex({ id: 1 }, { unique: true });

        const subOps = subjects.map((s) => ({
          updateOne: {
            filter: { id: s.id },
            update: {
              $set: {
                ...s,
                updatedAt: new Date(),
              },
            },
            upsert: true,
          },
        }));

        const subRes = await subjectsCol.bulkWrite(subOps);
        console.log(`✅ Subjects Synced! Upserted: ${subRes.upsertedCount}, Modified: ${subRes.modifiedCount}`);
      }
    }

    console.log("🎉 Complete! Paperino MongoDB Database is fully seeded and ready.");
  } catch (error) {
    console.error("❌ Error syncing to MongoDB:", error);
  } finally {
    await client.close();
  }
}

run();
