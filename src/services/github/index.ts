// Public surface of the GitHub service layer.

export { GitHubClient, GitHubError } from './githubClient';
export type { GitHubErrorCode } from './githubClient';
export { authenticate, canWriteRepos, makeClient } from './githubAuth';
export type { AuthResult } from './githubAuth';
export { listRepositories, getRepository } from './repositories';
export { listBranches, getBranchHeadSha, createBranch, branchExists } from './branches';
export { getTree, getBlobText, getFileText } from './files';
export type { RepositoryTree, BlobResult } from './files';
export { commitChanges } from './commits';
export type { CommitChangesInput, CommitResult, FileWrite } from './commits';
export { createPullRequest, findOpenPullRequest } from './pullRequests';
export type { CreatePRInput } from './pullRequests';
export {
  oauthConfigured,
  beginOAuth,
  readOAuthCallback,
  verifyState,
  clearOAuthParams,
  exchangeOAuthCode,
} from './oauth';
