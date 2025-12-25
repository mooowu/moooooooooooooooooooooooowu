export interface GithubWebhookOptions {
  port?: number;
  path?: string;
  secret?: string;
}

export interface GithubWebhookHeaders {
  'x-github-event': string;
  'x-github-delivery': string;
  'x-hub-signature-256'?: string;
  'x-github-hook-id'?: string;
  'x-github-hook-installation-target-type'?: string;
  'x-github-hook-installation-target-id'?: string;
}

export interface GithubUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  url: string;
  html_url: string;
  type: string;
  [key: string]: unknown;
}

export interface GithubRepository {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  private: boolean;
  owner: GithubUser;
  html_url: string;
  description: string | null;
  fork: boolean;
  url: string;
  default_branch: string;
  [key: string]: unknown;
}

export interface GithubWebhookEvent {
  action?: string;
  sender: GithubUser;
  repository?: GithubRepository;
  organization?: {
    login: string;
    id: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface GithubPingEvent extends GithubWebhookEvent {
  zen: string;
  hook_id: number;
  hook: {
    type: string;
    id: number;
    name: string;
    active: boolean;
    events: string[];
    config: {
      content_type: string;
      url: string;
      insecure_ssl: string;
    };
    [key: string]: unknown;
  };
}

export interface GithubPushEvent extends GithubWebhookEvent {
  ref: string;
  before: string;
  after: string;
  created: boolean;
  deleted: boolean;
  forced: boolean;
  compare: string;
  commits: Array<{
    id: string;
    message: string;
    timestamp: string;
    url: string;
    author: {
      name: string;
      email: string;
      username?: string;
    };
    committer: {
      name: string;
      email: string;
      username?: string;
    };
    added: string[];
    removed: string[];
    modified: string[];
  }>;
  head_commit: {
    id: string;
    message: string;
    timestamp: string;
    url: string;
    author: {
      name: string;
      email: string;
      username?: string;
    };
    [key: string]: unknown;
  } | null;
  pusher: {
    name: string;
    email: string;
  };
}

export interface GithubPullRequestEvent extends GithubWebhookEvent {
  action: string;
  number: number;
  pull_request: {
    id: number;
    node_id: string;
    number: number;
    state: string;
    title: string;
    body: string | null;
    user: GithubUser;
    html_url: string;
    created_at: string;
    updated_at: string;
    merged_at: string | null;
    head: {
      ref: string;
      sha: string;
      [key: string]: unknown;
    };
    base: {
      ref: string;
      sha: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

export interface GithubIssuesEvent extends GithubWebhookEvent {
  action: string;
  issue: {
    id: number;
    node_id: string;
    number: number;
    title: string;
    body: string | null;
    user: GithubUser;
    state: string;
    html_url: string;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
  };
}

export interface GithubIssueCommentEvent extends GithubWebhookEvent {
  action: string;
  issue: {
    id: number;
    number: number;
    title: string;
    state: string;
    [key: string]: unknown;
  };
  comment: {
    id: number;
    body: string;
    user: GithubUser;
    created_at: string;
    updated_at: string;
    html_url: string;
    [key: string]: unknown;
  };
}

export const GITHUB_WEBHOOK_OPTIONS = Symbol('GITHUB_WEBHOOK_OPTIONS');
