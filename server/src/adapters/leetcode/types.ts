export interface LeetCodeUserPublic {
  username: string;
  realName: string | null;
  userAvatar: string | null;
  ranking: number | null;
  reputation: number;
  solutionCount: number;
  submitStats: {
    acSubmissionNum: Array<{ difficulty: string; count: number; submissions: number }>;
    totalSubmissionNum: Array<{ difficulty: string; count: number; submissions: number }>;
  };
  profile: {
    realName: string;
    starRating: number;
    aboutMe: string;
    userAvatar: string;
    location: string;
    skillTags: string[];
    websites: string[];
    reputation: number;
    ranking: number;
  };
}

export interface LeetCodeRecentSubmission {
  id: string;
  title: string;
  titleSlug: string;
  timestamp: string;
  statusDisplay: string;
  lang: string;
}

export interface LeetCodeProblemInfo {
  titleSlug: string;
  questionId: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topicTags: Array<{ name: string; slug: string }>;
}

export interface LeetCodeGraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}

export interface LeetCodeUserProfileData {
  matchedUser: {
    username: string;
    profile: {
      realName: string;
      userAvatar: string;
      ranking: number;
    };
    submitStats: {
      acSubmissionNum: Array<{ difficulty: string; count: number; submissions: number }>;
      totalSubmissionNum: Array<{ difficulty: string; count: number; submissions: number }>;
    };
  } | null;
}

export interface LeetCodeRecentSubmissionData {
  recentSubmissionList: LeetCodeRecentSubmission[] | null;
}

export interface LeetCodeProblemData {
  question: {
    questionId: string;
    title: string;
    titleSlug: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    topicTags: Array<{ name: string; slug: string }>;
  } | null;
}

export interface LeetCodeAllProblemsData {
  problemsetQuestionListV2: {
    questions: Array<{
      questionFrontendId: string;
      title: string;
      titleSlug: string;
      difficulty: 'EASY' | 'MEDIUM' | 'HARD';
      topicTags: Array<{ name: string; slug: string }>;
    }>;
  };
}
