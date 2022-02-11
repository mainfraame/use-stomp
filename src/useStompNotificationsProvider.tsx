import {SnackbarProvider} from 'notistack';
import type {SnackbarProviderProps} from 'notistack';
import React, {useEffect, useMemo, useState} from 'react';

import UseStompCtx from './context';
import useToggle from './useToggle';
import WebSocketWorker from './webSocketWorker';

export type UseStompNotificationsProviderProps = SnackbarProviderProps & {
    /**
     * url to connect to stomp protocol
     */
    url: string;
    /**
     * children React.ReactNode | React.ReactNode[]
     */
    children: React.ReactNode | React.ReactNode[];
    /**
     * request auth header will be passed to the server or agent through the STOMP connection frame
     */
    authHeader?: string;
    /**
     * request header will be passed to the server or agent through the STOMP connection frame
     */
    headers?: Record<string, unknown>;
    /**
     * interval(ms) of attempts to reconnect when the websocket connection is dropped; default is 10,000ms
     */
    reconnectInterval?: number;
    /**
     * max number of attempts to reconnect when websocket connection is dropped; default is 10
     */
    reconnectMaxAttempts?: number;
    /**
     * enable testing of reconnection
     */
    testReconnect?: boolean;
};

const UseStompNotificationsProvider: React.FC<UseStompNotificationsProviderProps> = React.memo(
    ({
        authHeader,
        headers,
        reconnectInterval,
        reconnectMaxAttempts,
        testReconnect,
        url,
        ...props
    }) => {
        const [connected, toggleConnected] = useToggle(false);

        const worker = useMemo<WebSocketWorker>(
            () =>
                new WebSocketWorker({
                    onConnected: toggleConnected,
                    onDisconnected: toggleConnected,
                    reconnectInterval,
                    reconnectMaxAttempts,
                    url: url
                }),
            []
        );

        useEffect(() => {
            if (authHeader) {
                worker.setAuthHeader(authHeader);
                worker.connect();
            }
        }, [authHeader]);

        useEffect(() => {
            return () => {
                worker.destroy();
            };
        }, []);

        const ctx = useMemo(
            () => ({
                connected,
                dismiss: worker.dismiss,
                send: worker.send,
                subscribe: worker.subscribe,
                subscribeSync: worker.subscribeSync
            }),
            [
                connected,
                worker.dismiss,
                worker.send,
                worker.subscribe,
                worker.subscribeSync
            ]
        );

        useEffect(() => {
            if (connected && testReconnect) {
                const timeout = setTimeout(() => {
                    worker.testDisconnect();
                }, 10000);

                return () => {
                    clearTimeout(timeout);
                };
            }
        }, [connected, testReconnect]);

        return (
            <UseStompCtx.Provider value={ctx}>
                <SnackbarProvider {...props}>{props.children}</SnackbarProvider>
            </UseStompCtx.Provider>
        );
    }
);

UseStompNotificationsProvider.defaultProps = {
    maxSnack: 3,
    reconnectInterval: 10000,
    reconnectMaxAttempts: 10
};

export default UseStompNotificationsProvider;
