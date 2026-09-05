import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  mapUserToProfile,
  mapSubmissionToPlatformSubmission,
  mapVerdict,
  mapLanguage,
  mapProblemToPlatformProblem
} from '../../src/adapters/codechef/mapper.js';
import type { CodeChefUserProfile, CodeChefSubmission } from '../../src/adapters/codechef/types.js';

const FIXTURE_PROFILE: CodeChefUserProfile = {
  username: 'gennady',
  name: 'Gennady Korotkevich',
  currentRating: 2850,
  highestRating: 2900,
  countryName: 'Belarus',
  globalRank: 1,
  countryRank: 1,
  stars: '7'
};

const FIXTURE_SUBMISSION: CodeChefSubmission = {
  id: 'codechef-gennady-ADDTWO-0',
  problemCode: 'ADDTWO',
  problemName: 'Add Two Numbers',
  result: 'AC',
  language: 'C++',
  date: '2024-01-01'
};

describe('CodeChef Mapper', () => {
  describe('mapUserToProfile', () => {
    it('should map a full profile correctly', () => {
      const result = mapUserToProfile(FIXTURE_PROFILE);

      assert.strictEqual(result.platform, 'codechef');
      assert.strictEqual(result.username, 'gennady');
      assert.strictEqual(result.name, 'Gennady Korotkevich');
      assert.strictEqual(result.rating, 2850);
      assert.strictEqual(result.maxRating, 2900);
      assert.strictEqual(result.globalRank, 1);
      assert.strictEqual(result.rank, '7★');
    });

    it('should handle null stars gracefully', () => {
      const profile: CodeChefUserProfile = { ...FIXTURE_PROFILE, stars: null };
      const result = mapUserToProfile(profile);
      assert.strictEqual(result.rank, null);
    });

    it('should handle null ratings gracefully', () => {
      const profile: CodeChefUserProfile = {
        ...FIXTURE_PROFILE,
        currentRating: null,
        highestRating: null
      };
      const result = mapUserToProfile(profile);
      assert.strictEqual(result.rating, null);
      assert.strictEqual(result.maxRating, null);
    });
  });

  describe('mapSubmissionToPlatformSubmission', () => {
    it('should map a submission correctly', () => {
      const result = mapSubmissionToPlatformSubmission(FIXTURE_SUBMISSION, 'gennady');

      assert.strictEqual(result.platform, 'codechef');
      assert.strictEqual(result.username, 'gennady');
      assert.strictEqual(result.external_submission_id, 'codechef-gennady-ADDTWO-0');
      assert.strictEqual(result.problem_external_id, 'ADDTWO');
      assert.strictEqual(result.problem_title, 'Add Two Numbers');
      assert.strictEqual(result.verdict, 'Accepted');
      assert.strictEqual(result.language, 'C++');
    });

    it('should produce a valid ISO timestamp from a date string', () => {
      const result = mapSubmissionToPlatformSubmission(FIXTURE_SUBMISSION, 'gennady');
      assert.ok(!isNaN(Date.parse(result.submitted_at)), 'submitted_at should be a valid ISO date');
    });

    it('should fall back to current time when date is empty', () => {
      const sub: CodeChefSubmission = { ...FIXTURE_SUBMISSION, date: '' };
      const before = Date.now();
      const result = mapSubmissionToPlatformSubmission(sub, 'gennady');
      const after = Date.now();
      const parsed = Date.parse(result.submitted_at);
      assert.ok(parsed >= before - 1000 && parsed <= after + 1000);
    });
  });

  describe('mapVerdict', () => {
    it('should map AC to Accepted', () => {
      assert.strictEqual(mapVerdict('AC'), 'Accepted');
      assert.strictEqual(mapVerdict('Accepted'), 'Accepted');
      assert.strictEqual(mapVerdict('correct answer'), 'Accepted');
    });

    it('should map WA to Wrong Answer', () => {
      assert.strictEqual(mapVerdict('WA'), 'Wrong Answer');
      assert.strictEqual(mapVerdict('Wrong Answer'), 'Wrong Answer');
    });

    it('should map TLE to Time Limit Exceeded', () => {
      assert.strictEqual(mapVerdict('TLE'), 'Time Limit Exceeded');
      assert.strictEqual(mapVerdict('Time Limit Exceeded'), 'Time Limit Exceeded');
    });

    it('should map MLE to Memory Limit Exceeded', () => {
      assert.strictEqual(mapVerdict('MLE'), 'Memory Limit Exceeded');
    });

    it('should map RE to Runtime Error', () => {
      assert.strictEqual(mapVerdict('RE'), 'Runtime Error');
    });

    it('should map CE to Compilation Error', () => {
      assert.strictEqual(mapVerdict('CE'), 'Compilation Error');
      assert.strictEqual(mapVerdict('Compile Error'), 'Compilation Error');
    });

    it('should return Unknown for empty string', () => {
      assert.strictEqual(mapVerdict(''), 'Unknown');
    });

    it('should pass through unrecognised verdicts', () => {
      assert.strictEqual(mapVerdict('Partially Correct'), 'Partially Correct');
    });
  });

  describe('mapLanguage', () => {
    it('should normalise C++ variants', () => {
      assert.strictEqual(mapLanguage('C++'), 'C++');
      assert.strictEqual(mapLanguage('cpp17'), 'C++');
      assert.strictEqual(mapLanguage('cpp'), 'C++');
      assert.strictEqual(mapLanguage('cpp14'), 'C++');
    });

    it('should normalise Python variants', () => {
      assert.strictEqual(mapLanguage('python3'), 'Python 3');
      assert.strictEqual(mapLanguage('Python 3'), 'Python 3');
      assert.strictEqual(mapLanguage('python'), 'Python 2');
    });

    it('should return original for unknown languages', () => {
      assert.strictEqual(mapLanguage('Haskell'), 'Haskell');
    });
  });

  describe('mapProblemToPlatformProblem', () => {
    it('should build a valid PlatformProblem from code and name', () => {
      const result = mapProblemToPlatformProblem('ADDTWO', 'Add Two Numbers');

      assert.strictEqual(result.platform, 'codechef');
      assert.strictEqual(result.external_id, 'ADDTWO');
      assert.strictEqual(result.title, 'Add Two Numbers');
      assert.strictEqual(result.url, 'https://www.codechef.com/problems/ADDTWO');
      assert.strictEqual(result.difficulty, null);
      assert.deepStrictEqual(result.topics, []);
    });

    it('should use code as title when name is empty', () => {
      const result = mapProblemToPlatformProblem('ADDTWO', '');
      assert.strictEqual(result.title, 'ADDTWO');
    });
  });
});
