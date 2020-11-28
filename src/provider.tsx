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
    const [timeoutId, setTimeoutId] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [explicitDisconnect, setExplicitDisconnect] = useState(false);
    const [connected, setConnected] = useState(false);

    const [client, setClient] = useState<Client>(() =>
        Stomp.over(new SockJS(props.url, null, props.options), !!props.debug)
    );

    const getRetryInterval = useCallback((count) => 1000 * count, []);

    const packageMessage = useCallback((channel, msg, optHeaders) => {
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
    }, []);

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

    const connect = useCallback(() => {
        client.connect(
            props.headers,
            () => {
                console.log('[use-stomp::connection::success]');
                setConnected(() => true);
            },
            (error: any) => {
                console.error('[use-stomp::connection::error]', error);

                if (connected) {
                    setConnected(() => false);
                    setRetryCount(() => 0);
                }

                if (!explicitDisconnect) {
                    setRetryCount((prev) => prev + 1);

                    const timeoutId = setTimeout(
                        connect,
                        getRetryInterval(retryCount)
                    );

                    setTimeoutId(() => timeoutId);
                }
            }
        );
    }, [
        client,
        connected,
        explicitDisconnect,
        getRetryInterval,
        props.headers,
        retryCount
    ]);

    const disconnect = useCallback(() => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            setTimeoutId(() => null);
        }

        if (connected) {
            setExplicitDisconnect(() => true);
        }

        if (connected) {
            client.disconnect(() => {
                setConnected(() => false);
                setRetryCount(() => 0);
                console.log('[use-stomp:disconnect]', 'disconnected');
            });
        }
    }, [client.disconnect, connected, timeoutId]);

    const send = useCallback(
        (channel, msg, optHeaders = {}) => {
            if (connected) {
                client.send(
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
        [client.send, connected, packageMessage]
    );

    const subscribe = useCallback(
        (channel, callback) => {
            try {
                return client.subscribe(
                    channel,
                    (msg: any) => {
                        const body = parseMessage(channel, msg.body);

                        callback(body, msg.headers.destination);

                        if (body && body.status === 'END') {
                            disconnect();
                        }
                    },
                    props.subscribeHeaders
                );
            } catch (e) {
                throw Error(e);
            }
        },
        [client.subscribe, disconnect, parseMessage, props.subscribeHeaders]
    );

    useEffect(() => {
        if (props.headers && !connected) {
            setExplicitDisconnect(() => false);
            connect();
        }

        return () => {
            disconnect();
        };
    }, [connected, props.headers]);

    useEffect(() => {
        return () => {
            setClient(() => null);
        };
    }, []);

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
