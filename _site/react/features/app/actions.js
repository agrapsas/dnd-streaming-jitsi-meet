// @flow

import type { Dispatch } from 'redux';

import { setRoom } from '../base/conference';
import {
    configWillLoad,
    loadConfigError,
    restoreConfig,
    setConfig,
    storeConfig
} from '../base/config';
import { connect, disconnect, setLocationURL } from '../base/connection';
import { loadConfig } from '../base/lib-jitsi-meet';
import { createDesiredLocalTracks } from '../base/tracks';
import { parseURIString, toURLString } from '../base/util';
import { setFatalError } from '../overlay';

import { getDefaultURL } from './functions';

const logger = require('jitsi-meet-logger').getLogger(__filename);

declare var APP: Object;

/**
 * Triggers an in-app navigation to a specific route. Allows navigation to be
 * abstracted between the mobile/React Native and Web/React applications.
 *
 * @param {string|undefined} uri - The URI to which to navigate. It may be a
 * full URL with an HTTP(S) scheme, a full or partial URI with the app-specific
 * scheme, or a mere room name.
 * @returns {Function}
 */
export function appNavigate(uri: ?string) {
    return async (dispatch: Dispatch<any>, getState: Function) => {
        let location = parseURIString(uri);

        // If the specified location (URI) does not identify a host, use the app's
        // default.
        if (!location || !location.host) {
            const defaultLocation = parseURIString(getDefaultURL(getState));

            if (location) {
                location.host = defaultLocation.host;

                // FIXME Turn location's host, hostname, and port properties into
                // setters in order to reduce the risks of inconsistent state.
                location.hostname = defaultLocation.hostname;
                location.pathname
                    = defaultLocation.pathname + location.pathname.substr(1);
                location.port = defaultLocation.port;
                location.protocol = defaultLocation.protocol;
            } else {
                location = defaultLocation;
            }
        }

        location.protocol || (location.protocol = 'https:');
        const { contextRoot, host, room } = location;
        const locationURL = new URL(location.toString());

        // Disconnect from any current conference.
        // FIXME: unify with web.
        if (navigator.product === 'ReactNative') {
            dispatch(disconnect());
        }

        dispatch(configWillLoad(locationURL, room));

        let protocol = location.protocol.toLowerCase();

        // The React Native app supports an app-specific scheme which is sure to not
        // be supported by fetch.
        protocol !== 'http:' && protocol !== 'https:' && (protocol = 'https:');

        const baseURL = `${protocol}//${host}${contextRoot || '/'}`;
        let url = `${baseURL}config.js`;

        // XXX In order to support multiple shards, tell the room to the deployment.
        room && (url += `?room=${room.toLowerCase()}`);

        let config;

        // Avoid (re)loading the config when there is no room.
        if (!room) {
            config = restoreConfig(baseURL);
        }

        if (!config) {
            try {
                config = await loadConfig(url);
                dispatch(storeConfig(baseURL, config));
            } catch (error) {
                config = restoreConfig(baseURL);

                if (!config) {
                    dispatch(loadConfigError(error, locationURL));

                    return;
                }
            }
        }

        if (getState()['features/base/config'].locationURL !== locationURL) {
            dispatch(loadConfigError(new Error('Config no longer needed!'), locationURL));

            return;
        }

        dispatch(setLocationURL(locationURL));
        dispatch(setConfig(config));
        dispatch(setRoom(room));

        // FIXME: unify with web, currently the connection and track creation happens in conference.js.
        if (room && navigator.product === 'ReactNative') {
            dispatch(createDesiredLocalTracks());
            dispatch(connect());
        }
    };
}

/**
 * Redirects to another page generated by replacing the path in the original URL
 * with the given path.
 *
 * @param {(string)} pathname - The path to navigate to.
 * @returns {Function}
 */
export function redirectWithStoredParams(pathname: string) {
    return (dispatch: Dispatch<any>, getState: Function) => {
        const { locationURL } = getState()['features/base/connection'];
        const newLocationURL = new URL(locationURL.href);

        newLocationURL.pathname = pathname;
        window.location.assign(newLocationURL.toString());
    };
}

/**
 * Reloads the page.
 *
 * @protected
 * @returns {Function}
 */
export function reloadNow() {
    return (dispatch: Dispatch<Function>, getState: Function) => {
        dispatch(setFatalError(undefined));

        const { locationURL } = getState()['features/base/connection'];

        logger.info(`Reloading the conference using URL: ${locationURL}`);

        if (navigator.product === 'ReactNative') {
            dispatch(appNavigate(toURLString(locationURL)));
        } else {
            dispatch(reloadWithStoredParams());
        }
    };
}

/**
 * Reloads the page by restoring the original URL.
 *
 * @returns {Function}
 */
export function reloadWithStoredParams() {
    return (dispatch: Dispatch<any>, getState: Function) => {
        const { locationURL } = getState()['features/base/connection'];
        const windowLocation = window.location;
        const oldSearchString = windowLocation.search;

        windowLocation.replace(locationURL.toString());

        if (window.self !== window.top
                && locationURL.search === oldSearchString) {
            // NOTE: Assuming that only the hash or search part of the URL will
            // be changed!
            // location.reload will not trigger redirect/reload for iframe when
            // only the hash params are changed. That's why we need to call
            // reload in addition to replace.
            windowLocation.reload();
        }
    };
}