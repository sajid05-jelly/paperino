const fs = require('fs');

async function testFetchDetailRegistrationLink() {
  const eventDetailUrl = "https://www.knowafest.com/events/2026/07/1708-national-level-workshop-applied-generative-ai-foundations-vibe-coding-2026-kongu-engineering-college-erode";
  console.log("Fetching detail page:", eventDetailUrl);

  const res = await fetch(eventDetailUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    }
  });

  console.log("HTTP Status:", res.status);
  const html = await res.text();
  fs.writeFileSync('knowafest_detail_sample.html', html);
  console.log("Saved knowafest_detail_sample.html. Length:", html.length);

  // Search for external registration links (e.g. google forms, unstop, official college site, etc.)
  const links = html.match(/href=["'](https?:\/\/[^"']+)["']/gi) || [];
  console.log("Total external/absolute links found:", links.length);

  const registrationCandidates = links
    .map(l => l.match(/href=["']([^"']+)["']/)[1])
    .filter(url => {
      const u = url.toLowerCase();
      return (u.includes('form') || u.includes('docs.google') || u.includes('registration') || u.includes('register') || u.includes('unstop') || u.includes('apply')) && !u.includes('knowafest.com');
    });

  console.log("External registration candidates found:", registrationCandidates);
}

testFetchDetailRegistrationLink();
