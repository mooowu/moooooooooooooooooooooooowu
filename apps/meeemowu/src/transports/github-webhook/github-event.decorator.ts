import { MessagePattern } from '@nestjs/microservices';

export enum GithubEventType {
  Push = 'push',
  PullRequest = 'pull_request',
  PullRequestOpened = 'pull_request.opened',
  PullRequestClosed = 'pull_request.closed',
  PullRequestMerged = 'pull_request.merged',
  PullRequestReviewRequested = 'pull_request.review_requested',
  PullRequestReviewSubmitted = 'pull_request_review.submitted',
  Issues = 'issues',
  IssuesOpened = 'issues.opened',
  IssuesClosed = 'issues.closed',
  IssuesReopened = 'issues.reopened',
  IssuesAssigned = 'issues.assigned',
  IssuesLabeled = 'issues.labeled',
  IssueComment = 'issue_comment',
  IssueCommentCreated = 'issue_comment.created',
  IssueCommentEdited = 'issue_comment.edited',
  IssueCommentDeleted = 'issue_comment.deleted',
  Create = 'create',
  Delete = 'delete',
  Fork = 'fork',
  Star = 'star',
  Watch = 'watch',
  Release = 'release',
  ReleasePublished = 'release.published',
  WorkflowRun = 'workflow_run',
  WorkflowRunCompleted = 'workflow_run.completed',
  CheckRun = 'check_run',
  CheckRunCompleted = 'check_run.completed',
}

export const GITHUB_EVENT_PREFIX = 'github:';

export function githubEventPattern(event: GithubEventType): string {
  return `${GITHUB_EVENT_PREFIX}${event}`;
}

export function GithubEvent(event: GithubEventType): MethodDecorator {
  return MessagePattern(githubEventPattern(event));
}
