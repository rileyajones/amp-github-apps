/**
 * Copyright 2020 The AMP HTML Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Context, Probot} from 'probot';
import {EventPayloads} from '@octokit/webhooks';
import {Octokit} from '@octokit/rest';

import {InviteBot} from './src/invite_bot';

type CommentWebhookPayload =
  | EventPayloads.WebhookPayloadIssueComment
  | EventPayloads.WebhookPayloadIssues
  | EventPayloads.WebhookPayloadPullRequest
  | EventPayloads.WebhookPayloadPullRequestReview
  | EventPayloads.WebhookPayloadPullRequestReviewComment;

export default (app: Probot): void => {
  if (process.env.NODE_ENV !== 'test') {
    require('dotenv').config();
  }

  const helpUserToTag = process.env.HELP_USER_TO_TAG || null;

  function botFromContext({
    github,
    payload,
    log,
  }: Context<CommentWebhookPayload>): InviteBot {
    return new InviteBot(
      // This type-cast is required because Probot exports a separate GitHubAPI
      // class, even though it's in Octokit instance.
      (github as unknown) as Octokit,
      payload.repository.owner.login,
      process.env.ALLOW_TEAM_SLUG,
      helpUserToTag,
      log
    );
  }

  app.on(
    'issue_comment.created',
    async (context: Context<EventPayloads.WebhookPayloadIssueComment>) => {
      await botFromContext(context).processComment(
        context.payload.repository.name,
        context.payload.issue.number,
        context.payload.comment.body,
        context.payload.comment.user.login
      );
    }
  );

  app.on(
    'issues.opened',
    async (context: Context<EventPayloads.WebhookPayloadIssues>) => {
      await botFromContext(context).processComment(
        context.payload.repository.name,
        context.payload.issue.number,
        context.payload.issue.body,
        context.payload.issue.user.login
      );
    }
  );

  app.on(
    'pull_request.opened',
    async (context: Context<EventPayloads.WebhookPayloadPullRequest>) => {
      await botFromContext(context).processComment(
        context.payload.repository.name,
        context.payload.pull_request.number,
        context.payload.pull_request.body,
        context.payload.pull_request.user.login
      );
    }
  );

  app.on(
    'pull_request_review.submitted',
    async (context: Context<EventPayloads.WebhookPayloadPullRequestReview>) => {
      await botFromContext(context).processComment(
        context.payload.repository.name,
        context.payload.pull_request.number,
        context.payload.review.body,
        context.payload.review.user.login
      );
    }
  );

  app.on(
    'pull_request_review_comment.created',
    async (
      context: Context<EventPayloads.WebhookPayloadPullRequestReviewComment>
    ) => {
      await botFromContext(context).processComment(
        context.payload.repository.name,
        context.payload.pull_request.number,
        context.payload.comment.body,
        context.payload.comment.user.login
      );
    }
  );

  app.on(
    'organization.member_added',
    async ({
      github,
      payload,
      log,
    }: Context<EventPayloads.WebhookPayloadOrganization>) => {
      const inviteBot = new InviteBot(
        (github as unknown) as Octokit,
        payload.organization.login,
        process.env.ALLOW_TEAM_SLUG,
        helpUserToTag,
        log
      );
      await inviteBot.processAcceptedInvite(payload.membership.user.login);
    }
  );
};
