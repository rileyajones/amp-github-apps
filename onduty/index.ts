/**
 * Copyright 2020 The AMP HTML Authors. All Rights Reserved.
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

require('dotenv').config();

import {GitHub} from './src/github';
import {Octokit} from '@octokit/rest';
import {OndutyBot} from './src/bot';
import {RotationReporterPayload, RotationTeamMap} from 'onduty';
import express from 'express';
import statusCodes from 'http-status-codes';

const {
  GITHUB_ACCESS_TOKEN,
  GITHUB_ORG,
  RELEASE_ON_DUTY_TEAM,
  BUILD_ON_DUTY_TEAM,
} = process.env;

const ROTATION_TEAMS: RotationTeamMap = {
  'release-on-duty': RELEASE_ON_DUTY_TEAM,
  'build-on-duty': BUILD_ON_DUTY_TEAM,
};

const octokit = new Octokit({auth: `token ${GITHUB_ACCESS_TOKEN}`});
const github = new GitHub(octokit, GITHUB_ORG);
const bot = new OndutyBot(github, ROTATION_TEAMS);

export async function refreshRotation(
  req: express.Request,
  res: express.Response
): Promise<void> {
  const {accessToken, ...rotations}: RotationReporterPayload = req.body;

  try {
    if (accessToken === GITHUB_ACCESS_TOKEN) {
      await bot.handleUpdate(rotations);
      res.sendStatus(statusCodes.OK);
    } else {
      res.sendStatus(statusCodes.UNAUTHORIZED);
    }
  } catch (e) {
    console.error(e);
    res.status(statusCodes.INTERNAL_SERVER_ERROR);
    res.send(String(e));
  }
}
