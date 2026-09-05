export interface CodeChefUserProfile {
  username: string;
  name: string | null;
  currentRating: number | null;
  highestRating: number | null;
  countryName: string | null;
  globalRank: number | null;
  countryRank: number | null;
  stars: string | null;
}

export interface CodeChefSubmission {
  id: string;
  problemCode: string;
  problemName: string;
  result: string;
  language: string;
  date: string;
}

export interface CodeChefProfilePageData {
  profile: CodeChefUserProfile;
  recentSubmissions: CodeChefSubmission[];
}
