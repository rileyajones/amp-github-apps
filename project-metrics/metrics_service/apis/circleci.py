"""Client for querying CircleCI API.

For an overview of the API https://circleci.com/docs/api/v2/
"""
import json
from typing import Dict
from http import HTTPStatus
from absl import logging
import logging
import requests
from database import models

import env

CIRCLECI_API = 'https://circleci.com/api/v2'
VCS_STAB = 'github'
PROJECT = env.get('GITHUB_REPO')
INSIGHTS_API = f'{CIRCLECI_API}/insights/{VCS_STAB}/{PROJECT}'


class CircleCiError(Exception):
  def __init__(self, status_code: int, message: str):
    msg = 'CircleCI API Error status %d. Message: %s' % (status_code, message)
    super(CircleCiError, self).__init__(msg)


class CircleCiAPI(object):
  """Interface class for executing queries agains the CircleCI API."""
  def __init__(self, token = env.get('CIRCLECI_API_ACCESS_TOKEN')):
    self._token = token

  @staticmethod
  def _dict_to_params(params: Dict):
    param_string = '&'.join([f'{key}={value}' for (key, value) in params.items()])
    if param_string:
      return '?' + param_string
    return param_string

  def get_workflow_stats(self, reporting_window = models.CircleCiReportingWindow.LAST_90_DAYS) -> models.CircleCiWorkflowStats:
    params = {
      'reporting-window': reporting_window.value
    }
    endpoint = f'{INSIGHTS_API}/workflows'
    logging.info(endpoint + self._dict_to_params(params))
    headers = { 'authorization': 'Basic %s' % env.get('CIRCLECI_API_ACCESS_TOKEN') }
    response = requests.get(endpoint + self._dict_to_params(params), headers=headers)
    parsed = json.loads(response.text)
    if response.status_code != HTTPStatus.OK:
      raise CircleCiError(response.status_code, parsed['message'])
    stats = models.CircleCiWorkflowStats.from_json(parsed['items'][0])
    
    return stats

