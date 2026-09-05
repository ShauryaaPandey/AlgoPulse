import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Platform } from '../../src/config/constants.js';
import {
  mapUserToProfile,
  mapSubmissionToPlatformSubmission,
  mapProblemToPlatformProblem,
  mapRatingChangeToContest,
  mapVerdict,
} from '../../src/adapters/codeforces/mapper.js';
import type {
  CodeforcesUser,
  CodeforcesSubmission,
  CodeforcesProblem,
  CodeforcesRatingChange,
  CodeforcesContest,
} from '../../src/adapters/codeforces/types.js';

describe('Codeforces Mapper', () => {
  describe('mapUserToProfile', () => {
    it('should map complete user data to profile', () => {
      const user: CodeforcesUser = {
        handle: 'tourist',
        firstName: 'Gennady',
        lastName: 'Korotkevich',
        country: 'Belarus',
        city: 'Gomel',
        organization: 'ITMO University',
        contribution: 123,
        rank: 'legendary grandmaster',
        rating: 3822,
        maxRank: 'legendary grandmaster',
        maxRating: 3979,
        lastOnlineTimeSeconds: 1609459200,
        registrationTimeSeconds: 1268352000,
        friendOfCount: 5000,
        avatar: '//userpic.codeforces.com/avatar.jpg',
        titlePhoto: '//userpic.codeforces.com/title.jpg',
      };

      const profile = mapUserToProfile(user);

      assert.equal(profile.platform, Platform.CODEFORCES);
      assert.equal(profile.username, 'tourist');
      assert.equal(profile.name, 'Gennady Korotkevich');
      assert.equal(profile.avatarUrl, 'https://userpic.codeforces.com/avatar.jpg');
      assert.equal(profile.rating, 3822);
      assert.equal(profile.maxRating, 3979);
      assert.equal(profile.rank, 'legendary grandmaster');
      assert.equal(profile.contributionPoints, 123);
    });

    it('should handle user without name', () => {
      const user: CodeforcesUser = {
        handle: 'user123',
        contribution: 0,
        lastOnlineTimeSeconds: 1609459200,
        registrationTimeSeconds: 1268352000,
        friendOfCount: 10,
        avatar: '//avatar.jpg',
        titlePhoto: '//title.jpg',
      };

      const profile = mapUserToProfile(user);

      assert.equal(profile.name, null);
      assert.equal(profile.username, 'user123');
    });

    it('should handle user with partial name', () => {
      const user: CodeforcesUser = {
        handle: 'user123',
        firstName: 'John',
        contribution: 0,
        lastOnlineTimeSeconds: 1609459200,
        registrationTimeSeconds: 1268352000,
        friendOfCount: 10,
        avatar: '//avatar.jpg',
        titlePhoto: '//title.jpg',
      };

      const profile = mapUserToProfile(user);

      assert.equal(profile.name, null);
    });

    it('should handle missing rating and rank', () => {
      const user: CodeforcesUser = {
        handle: 'newbie',
        contribution: 0,
        lastOnlineTimeSeconds: 1609459200,
        registrationTimeSeconds: 1268352000,
        friendOfCount: 0,
        avatar: '//avatar.jpg',
        titlePhoto: '//title.jpg',
      };

      const profile = mapUserToProfile(user);

      assert.equal(profile.rating, null);
      assert.equal(profile.maxRating, null);
      assert.equal(profile.rank, null);
    });
  });

  describe('mapSubmissionToPlatformSubmission', () => {
    it('should map complete submission data', () => {
      const submission: CodeforcesSubmission = {
        id: 123456789,
        contestId: 1500,
        creationTimeSeconds: 1609459200,
        relativeTimeSeconds: 3600,
        problem: {
          contestId: 1500,
          index: 'A',
          name: 'Two Sum',
          type: 'PROGRAMMING',
          rating: 800,
          tags: ['math', 'implementation'],
        },
        author: {
          contestId: 1500,
          members: [{ handle: 'tourist' }],
          participantType: 'CONTESTANT',
          ghost: false,
        },
        programmingLanguage: 'GNU C++17',
        verdict: 'OK',
        testset: 'TESTS',
        passedTestCount: 42,
        timeConsumedMillis: 62,
        memoryConsumedBytes: 1024000,
      };

      const platformSubmission = mapSubmissionToPlatformSubmission(submission, 'tourist');

      assert.equal(platformSubmission.external_submission_id, '123456789');
      assert.equal(platformSubmission.platform, Platform.CODEFORCES);
      assert.equal(platformSubmission.username, 'tourist');
      assert.equal(platformSubmission.problem_external_id, '1500A');
      assert.equal(platformSubmission.problem_title, 'Two Sum');
      assert.equal(platformSubmission.language, 'GNU C++17');
      assert.equal(platformSubmission.verdict, 'Accepted');
      assert.equal(platformSubmission.execution_time, 62);
      assert.equal(platformSubmission.memory_used, 1024000);
      assert.equal(platformSubmission.submitted_at, '2021-01-01T00:00:00.000Z');
    });

    it('should handle submission without contestId', () => {
      const submission: CodeforcesSubmission = {
        id: 987654321,
        creationTimeSeconds: 1609459200,
        relativeTimeSeconds: 0,
        problem: {
          index: 'A',
          name: 'Problem A',
          type: 'PROGRAMMING',
          tags: [],
        },
        author: {
          members: [{ handle: 'user' }],
          participantType: 'PRACTICE',
          ghost: false,
        },
        programmingLanguage: 'Python 3',
        testset: 'TESTS',
        passedTestCount: 0,
        timeConsumedMillis: 0,
        memoryConsumedBytes: 0,
      };

      const platformSubmission = mapSubmissionToPlatformSubmission(submission, 'user');

      assert.equal(platformSubmission.problem_external_id, 'A');
    });
  });

  describe('mapVerdict', () => {
    it('should map OK to Accepted', () => {
      assert.equal(mapVerdict('OK'), 'Accepted');
    });

    it('should map WRONG_ANSWER to Wrong Answer', () => {
      assert.equal(mapVerdict('WRONG_ANSWER'), 'Wrong Answer');
    });

    it('should map TIME_LIMIT_EXCEEDED', () => {
      assert.equal(mapVerdict('TIME_LIMIT_EXCEEDED'), 'Time Limit Exceeded');
    });

    it('should map MEMORY_LIMIT_EXCEEDED', () => {
      assert.equal(mapVerdict('MEMORY_LIMIT_EXCEEDED'), 'Memory Limit Exceeded');
    });

    it('should map RUNTIME_ERROR', () => {
      assert.equal(mapVerdict('RUNTIME_ERROR'), 'Runtime Error');
    });

    it('should map COMPILATION_ERROR', () => {
      assert.equal(mapVerdict('COMPILATION_ERROR'), 'Compilation Error');
    });

    it('should map IDLENESS_LIMIT_EXCEEDED to Time Limit Exceeded', () => {
      assert.equal(mapVerdict('IDLENESS_LIMIT_EXCEEDED'), 'Time Limit Exceeded');
    });

    it('should map CHALLENGED to Wrong Answer', () => {
      assert.equal(mapVerdict('CHALLENGED'), 'Wrong Answer');
    });

    it('should handle undefined verdict', () => {
      assert.equal(mapVerdict(undefined), 'PENDING');
    });

    it('should pass through unknown verdicts', () => {
      assert.equal(mapVerdict('UNKNOWN_VERDICT'), 'UNKNOWN_VERDICT');
    });
  });

  describe('mapProblemToPlatformProblem', () => {
    it('should map problem with contestId', () => {
      const problem: CodeforcesProblem = {
        contestId: 1500,
        index: 'A',
        name: 'Problem A',
        type: 'PROGRAMMING',
        rating: 800,
        tags: ['math', 'greedy'],
      };

      const platformProblem = mapProblemToPlatformProblem(problem);

      assert.equal(platformProblem.platform, Platform.CODEFORCES);
      assert.equal(platformProblem.external_id, '1500A');
      assert.equal(platformProblem.title, 'Problem A');
      assert.equal(platformProblem.url, 'https://codeforces.com/problemset/problem/1500/A');
      assert.equal(platformProblem.rating, 800);
      assert.deepEqual(platformProblem.topics, ['math', 'greedy']);
      assert.equal(platformProblem.difficulty, null);
    });

    it('should map problem without contestId', () => {
      const problem: CodeforcesProblem = {
        index: 'A',
        name: 'Problem A',
        type: 'PROGRAMMING',
        tags: [],
      };

      const platformProblem = mapProblemToPlatformProblem(problem);

      assert.equal(platformProblem.external_id, 'A');
      assert.equal(platformProblem.url, null);
      assert.equal(platformProblem.rating, null);
    });
  });

  describe('mapRatingChangeToContest', () => {
    it('should map rating change with contest data', () => {
      const ratingChange: CodeforcesRatingChange = {
        contestId: 1500,
        contestName: 'Codeforces Round #708',
        handle: 'tourist',
        rank: 1,
        ratingUpdateTimeSeconds: 1609459200,
        oldRating: 3800,
        newRating: 3850,
      };

      const contest: CodeforcesContest = {
        id: 1500,
        name: 'Codeforces Round #708',
        type: 'CF',
        phase: 'FINISHED',
        frozen: false,
        durationSeconds: 7200,
        startTimeSeconds: 1609452000,
      };

      const platformContest = mapRatingChangeToContest(ratingChange, [contest]);

      assert.equal(platformContest.platform, Platform.CODEFORCES);
      assert.equal(platformContest.external_id, '1500');
      assert.equal(platformContest.name, 'Codeforces Round #708');
      assert.equal(platformContest.rating_change, 50);
      assert.equal(platformContest.rank, 1);
      assert.ok(platformContest.date.length > 0);
      assert.ok(platformContest.date.endsWith('Z'));
    });

    it('should handle missing contest data', () => {
      const ratingChange: CodeforcesRatingChange = {
        contestId: 9999,
        contestName: 'Unknown Contest',
        handle: 'user',
        rank: 100,
        ratingUpdateTimeSeconds: 1609459200,
        oldRating: 1200,
        newRating: 1180,
      };

      const platformContest = mapRatingChangeToContest(ratingChange, []);

      assert.equal(platformContest.rating_change, -20);
      assert.ok(platformContest.date.length > 0);
    });
  });
});
