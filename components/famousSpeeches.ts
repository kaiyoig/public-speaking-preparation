export interface FamousSpeech {
  orator: string;
  /** Where or what the speech was, and the year. */
  occasion: string;
  /**
   * The words, one paragraph per entry: either written here, or the path of a
   * text file under `public/` holding the whole speech with one paragraph per line.
   *
   * Every speech here is in the public domain and given whole, from the
   * transcript named beside it.
   */
  words: string[] | { transcript: string };
}

/** The speeches typed out behind the name on the Title panel: ones people quote to find their nerve. */
export const FAMOUS_SPEECHES: FamousSpeech[] = [
  {
    orator: "Theodore Roosevelt",
    occasion: "The Sorbonne, 1910",
    // "Citizenship in a Republic", as transcribed on Wikisource.
    words: { transcript: "/speeches/citizenship-in-a-republic.txt" },
  },
  {
    orator: "John F. Kennedy",
    occasion: "Rice University, 1962",
    // As transcribed on Wikisource from the recording.
    words: { transcript: "/speeches/we-choose-to-go-to-the-moon.txt" },
  },
  {
    orator: "Ralph Waldo Emerson",
    occasion: "The American Scholar, 1837",
    // The second edition of the oration (Boston: James Munroe, 1838), as transcribed on Wikisource.
    words: { transcript: "/speeches/the-american-scholar.txt" },
  },
  {
    orator: "Ronald Reagan",
    occasion: "After the loss of Challenger, 1986",
    // The Reagan Presidential Library's text of the address.
    words: { transcript: "/speeches/challenger-address.txt" },
  },
  {
    orator: "Russell Conwell",
    occasion: "Acres of Diamonds, as given in Philadelphia",
    // The lecture as printed in "Acres of Diamonds" (1915), Project Gutenberg's text.
    words: { transcript: "/speeches/acres-of-diamonds.txt" },
  },
  {
    orator: "Barack Obama",
    occasion: "To students on the first day of school, 2009",
    // "My education, my future", as transcribed on Wikisource.
    words: { transcript: "/speeches/my-education-my-future.txt" },
  },
  {
    orator: "Marie Curie",
    occasion: "Vassar College, 1921",
    // "The Discovery of Radium", Vassar's printing of the address, as transcribed on Wikisource.
    words: { transcript: "/speeches/the-discovery-of-radium.txt" },
  },
  {
    orator: "Swami Vivekananda",
    occasion: "Parliament of Religions, Chicago, 1893",
    // The response to welcome from his Complete Works, as transcribed on Wikisource.
    words: { transcript: "/speeches/response-to-welcome.txt" },
  },
  {
    orator: "Theodore Roosevelt",
    occasion: "The Strenuous Life, Chicago, 1899",
    // As transcribed on Wikisource.
    words: { transcript: "/speeches/the-strenuous-life.txt" },
  },
  {
    orator: "Henry David Thoreau",
    occasion: "Life Without Principle, a lecture first given in 1854",
    // The text he prepared for print from the lecture, from "Miscellanies", as transcribed on Wikisource.
    words: { transcript: "/speeches/life-without-principle.txt" },
  },
];
