export interface CompanyTopicWeight {
  topic: string;
  weight: number;
}

export interface CompanyProfile {
  name: string;
  aliases: string[];
  topicWeights: CompanyTopicWeight[];
  preferredDifficultyRange: { min: number; max: number };
  notes: string;
}

export const COMPANY_PROFILES: CompanyProfile[] = [
  {
    name: 'Google',
    aliases: ['google', 'alphabet'],
    topicWeights: [
      { topic: 'Dynamic Programming', weight: 0.95 },
      { topic: 'Graphs', weight: 0.90 },
      { topic: 'Trees', weight: 0.88 },
      { topic: 'Arrays', weight: 0.85 },
      { topic: 'Binary Search', weight: 0.80 },
      { topic: 'Strings', weight: 0.78 },
      { topic: 'Hash Table', weight: 0.75 },
      { topic: 'Recursion', weight: 0.72 },
      { topic: 'BFS', weight: 0.85 },
      { topic: 'DFS', weight: 0.85 },
      { topic: 'Two Pointers', weight: 0.70 },
      { topic: 'Sorting', weight: 0.68 }
    ],
    preferredDifficultyRange: { min: 1400, max: 2200 },
    notes: 'Emphasises algorithmic thinking and large-scale system design. Medium-Hard problems dominate.'
  },
  {
    name: 'Meta',
    aliases: ['meta', 'facebook'],
    topicWeights: [
      { topic: 'Arrays', weight: 0.92 },
      { topic: 'Strings', weight: 0.90 },
      { topic: 'Trees', weight: 0.88 },
      { topic: 'Graphs', weight: 0.82 },
      { topic: 'Dynamic Programming', weight: 0.78 },
      { topic: 'Hash Table', weight: 0.88 },
      { topic: 'Two Pointers', weight: 0.80 },
      { topic: 'Sliding Window', weight: 0.75 },
      { topic: 'BFS', weight: 0.80 },
      { topic: 'DFS', weight: 0.80 },
      { topic: 'Recursion', weight: 0.70 },
      { topic: 'Sorting', weight: 0.72 }
    ],
    preferredDifficultyRange: { min: 1200, max: 2000 },
    notes: 'Focuses on practical problem-solving. Medium problems are most common; speed matters.'
  },
  {
    name: 'Amazon',
    aliases: ['amazon', 'aws'],
    topicWeights: [
      { topic: 'Arrays', weight: 0.90 },
      { topic: 'Strings', weight: 0.85 },
      { topic: 'Trees', weight: 0.85 },
      { topic: 'Dynamic Programming', weight: 0.80 },
      { topic: 'Hash Table', weight: 0.88 },
      { topic: 'Graphs', weight: 0.75 },
      { topic: 'Sorting', weight: 0.80 },
      { topic: 'Two Pointers', weight: 0.75 },
      { topic: 'Recursion', weight: 0.72 },
      { topic: 'Stack', weight: 0.70 },
      { topic: 'Queue', weight: 0.68 },
      { topic: 'Greedy', weight: 0.72 }
    ],
    preferredDifficultyRange: { min: 1100, max: 1900 },
    notes: 'LP principles matter as much as coding. Medium difficulty with clean, maintainable solutions.'
  },
  {
    name: 'Microsoft',
    aliases: ['microsoft', 'msft'],
    topicWeights: [
      { topic: 'Arrays', weight: 0.88 },
      { topic: 'Trees', weight: 0.85 },
      { topic: 'Strings', weight: 0.82 },
      { topic: 'Dynamic Programming', weight: 0.78 },
      { topic: 'Graphs', weight: 0.75 },
      { topic: 'Hash Table', weight: 0.80 },
      { topic: 'Sorting', weight: 0.75 },
      { topic: 'Binary Search', weight: 0.72 },
      { topic: 'Stack', weight: 0.70 },
      { topic: 'Linked List', weight: 0.68 },
      { topic: 'Recursion', weight: 0.70 },
      { topic: 'Two Pointers', weight: 0.68 }
    ],
    preferredDifficultyRange: { min: 1000, max: 1800 },
    notes: 'Broad range of topics. Emphasis on clarity and correctness over clever tricks.'
  },
  {
    name: 'Apple',
    aliases: ['apple', 'aapl'],
    topicWeights: [
      { topic: 'Arrays', weight: 0.88 },
      { topic: 'Trees', weight: 0.85 },
      { topic: 'Strings', weight: 0.85 },
      { topic: 'Hash Table', weight: 0.82 },
      { topic: 'Dynamic Programming', weight: 0.75 },
      { topic: 'Graphs', weight: 0.72 },
      { topic: 'Sorting', weight: 0.78 },
      { topic: 'Two Pointers', weight: 0.72 },
      { topic: 'Binary Search', weight: 0.70 },
      { topic: 'Recursion', weight: 0.68 }
    ],
    preferredDifficultyRange: { min: 1000, max: 1800 },
    notes: 'Medium difficulty focus. Efficiency and clean code strongly valued.'
  },
  {
    name: 'Netflix',
    aliases: ['netflix'],
    topicWeights: [
      { topic: 'Dynamic Programming', weight: 0.88 },
      { topic: 'Arrays', weight: 0.85 },
      { topic: 'Graphs', weight: 0.82 },
      { topic: 'Trees', weight: 0.80 },
      { topic: 'Hash Table', weight: 0.80 },
      { topic: 'Strings', weight: 0.75 },
      { topic: 'Binary Search', weight: 0.72 },
      { topic: 'Greedy', weight: 0.70 },
      { topic: 'Sorting', weight: 0.72 }
    ],
    preferredDifficultyRange: { min: 1300, max: 2100 },
    notes: 'High bar for algorithmic depth. Medium-Hard questions typical.'
  },
  {
    name: 'Uber',
    aliases: ['uber'],
    topicWeights: [
      { topic: 'Graphs', weight: 0.92 },
      { topic: 'BFS', weight: 0.88 },
      { topic: 'DFS', weight: 0.88 },
      { topic: 'Arrays', weight: 0.82 },
      { topic: 'Dynamic Programming', weight: 0.78 },
      { topic: 'Trees', weight: 0.80 },
      { topic: 'Hash Table', weight: 0.78 },
      { topic: 'Sorting', weight: 0.75 },
      { topic: 'Greedy', weight: 0.72 },
      { topic: 'Two Pointers', weight: 0.68 }
    ],
    preferredDifficultyRange: { min: 1200, max: 2000 },
    notes: 'Strong graph/routing focus reflecting domain. Medium-Hard problems common.'
  },
  {
    name: 'Atlassian',
    aliases: ['atlassian'],
    topicWeights: [
      { topic: 'Arrays', weight: 0.85 },
      { topic: 'Strings', weight: 0.82 },
      { topic: 'Trees', weight: 0.80 },
      { topic: 'Hash Table', weight: 0.80 },
      { topic: 'Graphs', weight: 0.75 },
      { topic: 'Dynamic Programming', weight: 0.70 },
      { topic: 'Recursion', weight: 0.72 },
      { topic: 'Sorting', weight: 0.72 }
    ],
    preferredDifficultyRange: { min: 1000, max: 1700 },
    notes: 'Focus on practical problem-solving and code quality.'
  },
  {
    name: 'Stripe',
    aliases: ['stripe'],
    topicWeights: [
      { topic: 'Arrays', weight: 0.88 },
      { topic: 'Hash Table', weight: 0.88 },
      { topic: 'Strings', weight: 0.85 },
      { topic: 'Dynamic Programming', weight: 0.80 },
      { topic: 'Trees', weight: 0.78 },
      { topic: 'Graphs', weight: 0.75 },
      { topic: 'Sorting', weight: 0.75 },
      { topic: 'Recursion', weight: 0.72 }
    ],
    preferredDifficultyRange: { min: 1100, max: 1900 },
    notes: 'System design heavily weighted alongside DSA. Medium difficulty focus.'
  },
  {
    name: 'Generic',
    aliases: ['general', 'other', 'default'],
    topicWeights: [
      { topic: 'Arrays', weight: 0.80 },
      { topic: 'Strings', weight: 0.75 },
      { topic: 'Trees', weight: 0.75 },
      { topic: 'Dynamic Programming', weight: 0.72 },
      { topic: 'Hash Table', weight: 0.75 },
      { topic: 'Graphs', weight: 0.70 },
      { topic: 'Sorting', weight: 0.70 },
      { topic: 'Two Pointers', weight: 0.65 },
      { topic: 'Binary Search', weight: 0.65 },
      { topic: 'Recursion', weight: 0.65 }
    ],
    preferredDifficultyRange: { min: 1000, max: 1800 },
    notes: 'Balanced preparation covering core data structures and algorithms.'
  }
];

export function findCompanyProfile(companyName: string): CompanyProfile {
  const lower = companyName.trim().toLowerCase();
  const match = COMPANY_PROFILES.find(p =>
    p.name.toLowerCase() === lower ||
    p.aliases.some(a => a === lower)
  );
  return match ?? COMPANY_PROFILES[COMPANY_PROFILES.length - 1]!;
}

export const KNOWN_COMPANIES = COMPANY_PROFILES
  .filter(p => p.name !== 'Generic')
  .map(p => p.name);
