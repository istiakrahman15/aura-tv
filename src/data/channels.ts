/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import channelsData from './channels.json';

export interface Channel {
  name: string;
  logo: string;
  group: string;
  url: string;
}

export const channels: Channel[] = channelsData as Channel[];
