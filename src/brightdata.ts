import "dotenv/config";

// Structure of one search result.
export interface SearchResult {
  title: string;
  description: string;
  url: string;
}

// Structure returned to Improv Mode.
export interface ResearchResponse {
  topic: string;
  sources: SearchResult[];
}

// Bright Data search result structure.
interface BrightDataResult {
  title?: string;
  description?: string;
  link?: string;
}

interface BrightDataResponse {
  organic?: BrightDataResult[];
}

// Check whether a source URL is usable.
function isValidUrl(link: string): boolean {
  try {
    const url = new URL(link);

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      return false;
    }

    // Exclude Google's redirect links.
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

// Wait before retrying a failed request.
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run a Bright Data Google SERP search for an arbitrary query string.
export async function searchWebContext(
  query: string,
  timeoutMs: number = 30000
): Promise<SearchResult[]> {

  // Step 1: Load API credentials.
  const apiKey = process.env.BRIGHTDATA_API_KEY;
  const zone = process.env.BRIGHTDATA_SERP_ZONE;

  if (!apiKey || !zone) {
    throw new Error("Missing Bright Data credentials!");
  }

  // Step 2: Build our Google search.
  const searchUrl = new URL(
    "https://www.google.com/search"
  );

  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("hl", "en");
  searchUrl.searchParams.set("gl", "us");
  searchUrl.searchParams.set("brd_json", "1");

  // Step 3: Attempt the request up to 2 times.
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {

    console.log(
      `Bright Data research attempt ${attempt}/${maxAttempts}`
    );

    let response: Response;

    try {
      response = await fetch(
        "https://api.brightdata.com/request",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            zone,
            url: searchUrl.toString(),
            format: "raw"
          }),
          signal: AbortSignal.timeout(timeoutMs)
        }
      );
    } catch (error) {
      if (attempt < maxAttempts) {
        console.warn("Network request failed. Retrying...");
        await wait(1500);
        continue;
      }

      throw error;
    }

    // Do not retry quota or authentication errors.
    if (response.status === 429) {
      throw new Error(
        "Bright Data rate limit reached."
      );
    }

    // Retry temporary server errors.
    if (!response.ok) {
      const temporaryError =
        [502, 503, 504].includes(response.status);

      if (temporaryError && attempt < maxAttempts) {
        console.warn("Temporary server error. Retrying...");
        await wait(1500);
        continue;
      }

      throw new Error(
        `Bright Data error: HTTP ${response.status}`
      );
    }

    // Step 4: Read the response.
    const responseText = await response.text();

    // Retry if Bright Data returned an empty response.
    if (!responseText.trim()) {

      if (attempt < maxAttempts) {
        console.warn(
          "Bright Data returned empty data. Retrying..."
        );

        await wait(1500);
        continue;
      }

      throw new Error(
        "Bright Data returned an empty response after retry."
      );
    }

    // Step 5: Parse the response JSON.
    let data: BrightDataResponse;

    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(
        "Bright Data returned invalid JSON."
      );
    }

    if (!Array.isArray(data.organic)) {
      throw new Error(
        "Bright Data did not return organic search results."
      );
    }

    // Step 6: Extract and clean results.
    return data.organic
      .map(result => ({
        title: result.title ?? "",
        description: result.description ?? "",
        url: result.link ?? ""
      }))
      .filter(result =>
        result.title.length > 0 &&
        isValidUrl(result.url)
      )
      .slice(0, 5);
  }

  throw new Error("Bright Data request failed.");
}

// Research an improv speaking topic.
export async function researchTopic(
  topic: string
): Promise<ResearchResponse> {
  const sources = await searchWebContext(
    `${topic} arguments for and against pros cons`,
    30000
  );

  return {
    topic,
    sources,
  };
}
