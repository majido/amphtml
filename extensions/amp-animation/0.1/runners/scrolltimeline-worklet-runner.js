/**
 * Copyright 2019 The AMP HTML Authors. All Rights Reserved.
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

import {AnimationRunner} from './animation-runner';
import {Services} from '../../../../src/services';
import {
  assertDoesNotContainDisplay,
  px,
  setStyles,
} from '../../../../src/style';
import {dev} from '../../../../src/log';
import {getTotalDuration} from './utils';

const moduleName = 'amp-animation-worklet';
let workletModulePromise;

/**
 */
export class ScrollTimelineWorkletRunner extends AnimationRunner {
  /**
   * @param {!Window} win
   * @param {!Array<!../web-animation-types.InternalWebAnimationRequestDef>} requests
   * @param {!JsonObject} viewportData
   */
  constructor(win, requests, viewportData) {
    super(requests);

    /** @const @private */
    this.win_ = win;

    /** @protected {?Array<!WorkletAnimation>} */
    this.players_ = [];

    this.scene_ = viewportData['scene'];
  }

  /**
   * @override
   * Initializes the players but does not change the state.
   * @suppress {missingProperties}
   */
  init() {
    const {documentElement} = this.win_.document;
    const viewportService = Services.viewportForDoc(documentElement);
    const scrollSource = viewportService.getScrollingElement();

    const timeRange = getTotalDuration(this.requests_);
    this.requests_.map((request) => {
      // Apply vars.
      if (request.vars) {
        setStyles(request.target, assertDoesNotContainDisplay(request.vars));
      }
      const scrollTimeline = new this.win_.ScrollTimeline({
        scrollSource,
        orientation: 'block',
        startScrollOffset: {target: this.scene_, edge: 'end', threshold: 0},
        endScrollOffset: {target: this.scene_, edge: 'start', threshold: 0},
        timeRange,
        fill: 'both',
      });
      const keyframeEffect = new KeyframeEffect(
        request.target,
        request.keyframes,
        /** @type {AnimationEffectTimingProperties} */ (request.timing)
      );
      const player = new this.win_.Animation(keyframeEffect, scrollTimeline);
      player.play();
      this.players_.push(player);
    });
  }

  /**
   * @override
   * Initializes the players if not already initialized,
   * and starts playing the animations.
   */
  start() {
    if (!this.players_) {
      this.init();
    }
  }

  /**
   * @override
   */
  cancel() {
    if (!this.players_) {
      return;
    }
    this.players_.forEach((player) => {
      player.cancel();
    });
  }
}
