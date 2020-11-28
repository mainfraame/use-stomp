import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import SockJS, {Options} from 'sockjs-client';
import type {Client} from 'stompjs';

import UseStompCtx from './context';
import Stomp from './stomp';

export type UseStompProviderProps = {
    /**
     * HTTP to connect
     */
    url: string;
    /**
     * Add console logs for debugging
     */
    debug?: boolean;
    /**
     * SockJS Options (https://github.com/sockjs/sockjs-client#sockjs-client-api)
     */
    options?: Options;
    /**
     * The request auth header will be passed to the server or agent through the STOMP connection frame
     */
    authHeader?: string;
    /**
     * The request header will be passed to the server or agent through the STOMP connection frame
     */
    headers?: Record<string, unknown>;
    /**
     * The request header that will be passed when subscribing to the target
     */
    subscribeHeaders?: Record<string, unknown>;
    /**
     * override default parsing of messages
     */
    parseMessage?(channel: string, msg: any): any;
    /**
     * override default packaging of messages
     */
    packageMessage?(channel: string, msg: any, optHeaders: any): any;
};

export default React.memo<UseStompProviderProps>((props) => {
    const client = useRef<Client>(null);

    const [connected, setConnected] = useState(false);

    const packageMessage = useCallback(
        (channel, msg, optHeaders) => {
            if (props.packageMessage) {
                return props.packageMessage(channel, msg, optHeaders);
            }

            try {
                return typeof msg === 'object' && msg !== null
                    ? JSON.stringify(msg)
                    : msg;
            } catch (e) {
                return msg;
            }
        },
        [props.packageMessage]
    );

    const parseMessage = useCallback(
        (channel, msg) => {
            if (props.parseMessage) {
                return props.parseMessage(channel, msg);
            }

            try {
                const parsed = JSON.parse(msg);

                return typeof parsed === 'object' &&
                    parsed !== null &&
                    parsed.content
                    ? parsed.content
                    : parsed;
            } catch (e) {
                return msg;
            }
        },
        [props.parseMessage]
    );

    const onConnected = useCallback(() => {
        console.error('[use-stomp]::connected');
        setConnected(() => true);
    }, []);

    const onDisconnected = useCallback(() => {
        console.warn('[use-stomp]::disconnected');
        setConnected(() => false);
        client.current = null;
    }, []);

    const onError = useCallback((error) => {
        console.error('[use-stomp]', error);
    }, []);

    const send = useCallback(
        (channel, msg, optHeaders = {}) => {
            if (connected) {
                client.current.send(
                    channel,
                    optHeaders,
                    packageMessage(channel, msg, optHeaders)
                );
            } else {
                console.warn(
                    '[use-stomp:send]',
                    'cannot send when websocket is not connected'
                );
            }
        },
        [client.current, connected, packageMessage]
    );

    const subscribe = useCallback(
        (channel, callback) => {
            try {
                return client.current.subscribe(
                    channel,
                    (msg: any) => {
                        const body = parseMessage(channel, msg.body);

                        callback(body, msg.headers.destination);

                        if (body && body.status === 'END') {
                            (client.current.disconnect as any)();
                        }
                    },
                    props.subscribeHeaders
                );
            } catch (e) {
                throw Error(e);
            }
        },
        [
            client.current?.disconnect,
            client.current?.subscribe,
            parseMessage,
            props.subscribeHeaders
        ]
    );

    useEffect(() => {
        if (
            (props.headers || props.authHeader) &&
            !connected &&
            !client.current?.connected
        ) {
            client.current = Stomp.over(
                new SockJS(props.url, null, props.options),
                !!props.debug
            )(client.current.connect as any)(
                props.authHeader
                    ? {Authorization: props.authHeader}
                    : props.headers,
                onConnected,
                onDisconnected,
                onError
            );
        }

        return () => {
            if (connected && client.current?.connected) {
                (client.current.disconnect as any)();
            }
        };
    }, [connected, props.authHeader, props.headers]);

    const ctx = useMemo(
        () => ({
            send,
            subscribe,
            connected
        }),
        [connected, send, subscribe]
    );

    return (
        <UseStompCtx.Provider value={ctx}>
            {props.children}
        </UseStompCtx.Provider>
    );
});
