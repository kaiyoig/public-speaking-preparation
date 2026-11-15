
import "dotenv/config";

// Structure of one search result.
interface SearchResult {
  title: string;
  description: string;
  url: string;
}

// Structure returned to Improv Mode.
interface ResearchResponse {
  topic: string;
  sources: SearchResult[];
}

// Structure of a Bright Data result.
interface BrightDataResult {
  title?: string;
  description?: string;
  link?: string;
}

interface BrightDataResponse {
  organic?: BrightDataResult[];
}

// Check whether a URL is valid.
function isValidUrl(link: string): boolean {
  try {
    const url = new URL(link);

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      return false;
    }

    // Exclude Google redirect links.
    if (
      (url.hostname === "google.com" ||
        url.hostname.endsWith(".google.com")) &&
      (url.pathname === "/goto" ||
        url.pathname === "/url")
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// Search the web for an improv speaking topic.
export async function researchTopic(
  topic: string
): Promise<ResearchResponse> {

  // Step 1: Load API credentials.
  const apiKey = process.env.BRIGHTDATA_API_KEY;
  const zone = process.env.BRIGHTDATA_SERP_ZONE;

  if (!apiKey || !zone) {
    throw new Error("Missing Bright Data credentials!");
  }

  // Step 2: Build our search query.
  const searchUrl = new URL(
    "https://www.google.com/search"
  );

  searchUrl.searchParams.set(
    "q",
    `${topic} arguments for and against pros cons`
  );

  searchUrl.searchParams.set("hl", "en");
  searchUrl.searchParams.set("gl", "us");
  searchUrl.searchParams.set("brd_json", "1");

  // Step 3: Send request to Bright Data.
  const response = await fetch(
    "https://api.brightdata.com/request",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        zone: zone,
        url: searchUrl.toString(),
        format: "raw"
      }),
      signal: AbortSignal.timeout(60000)
    }
  );

  // Step 4: Check for HTTP errors.
  if (!response.ok) {
    const errorCode =
      response.headers.get("x-brd-error-code") ??
      "unknown";

    throw new Error(
      `Bright Data error: ${response.status}, code: ${errorCode}`
    );
  }

  // Step 5: Read the response as text first.
  const responseText = await response.text();

  // Detect an empty response.
  if (!responseText.trim()) {
    throw new Error(
      `Bright Data returned an empty response (HTTP ${response.status}).`
    );
  }

  // Step 6: Convert response text into JSON.
  let data: BrightDataResponse;

  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(
      `Bright Data returned invalid JSON (HTTP ${response.status}, length: ${responseText.length}).`
    );
  }

  // Step 7: Verify that organic results exist.
  if (!Array.isArray(data.organic)) {
    throw new Error(
      "Bright Data did not return organic search results."
    );
  }

  // Step 8: Extract valid search results.
  const sources: SearchResult[] = data.organic
    .map((result) => ({
      title: result.title ?? "",
      description: result.description ?? "",
      url: result.link ?? ""
    }))
    .filter((result) => {
      return (
        result.title.length > 0 &&
        isValidUrl(result.url)
      );
    })
    .slice(0, 5);

  // Step 9: Return information to Improv Mode.
  return {
    topic: topic,
    sources: sources
  };
}