const fs = require('fs');
const { google } = require('googleapis');

const envContent = fs.readFileSync('.env.local', 'utf8');
function getEnv(key) {
  const lines = envContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(key + '=')) {
      let val = trimmed.slice(key.length + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      return val;
    }
  }
  return '';
}

const clientId = getEnv('GOOGLE_CLIENT_ID');
const clientSecret = getEnv('GOOGLE_CLIENT_SECRET');
const refreshToken = getEnv('GOOGLE_REFRESH_TOKEN');
const folderId = getEnv('GOOGLE_DRIVE_FOLDER_ID');

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  'https://developers.google.com/oauthplayground'
);
oauth2Client.setCredentials({ refresh_token: refreshToken });
const drive = google.drive({ version: 'v3', auth: oauth2Client });

async function fetchAllFiles() {
  let allFiles = [];
  let pageToken = null;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, webViewLink, webContentLink, createdTime, size)',
      pageSize: 100,
      pageToken: pageToken || undefined
    });
    const files = res.data.files || [];
    allFiles = allFiles.concat(files);
    pageToken = res.data.nextPageToken;
    console.log('Fetched batch of', files.length, 'files. Total so far:', allFiles.length);
  } while (pageToken);

  console.log('FINAL TOTAL FILES IN GOOGLE DRIVE FOLDER:', allFiles.length);
  fs.writeFileSync('src/data/drive_materials_catalog.json', JSON.stringify(allFiles, null, 2));
  console.log('Saved to src/data/drive_materials_catalog.json');
}

fetchAllFiles().catch(err => {
  console.error('Error fetching all files:', err);
  process.exit(1);
});
