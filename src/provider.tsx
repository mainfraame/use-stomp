import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

import UseStompCtx from './context';

export type UseStompProviderProps = {
    /**
     * HTTP to connect
     */
    url: string;
    /**
     * SockJS Options (https://github.com/sockjs/sockjs-client#sockjs-client-api)
     */
    options?: object;
    /**
     * The request header will be passed to the server or agent through the STOMP connection frame
     */
    headers?: object;
    /**
     * The request header that will be passed when subscribing to the target
     */
    subscribeHeaders?: object;
    /**
     * The number of milliseconds to send and wait for a heartbeat message
     */
    heartbeatInterval?: number;
    /**
     * The heartbeat channel
     */
    heartbeatChannel?: string;
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
    const explicitDisconnect = useRef(false);
    const retryCount = useRef(0);
    const timeoutId = useRef<any>(null);

    const [connected, setConnected] = useState(false);
    const [subscriptions, setSubscriptions] = useState({});

    const [client, setClient] = useState(() =>
        Stomp.over(new SockJS(props.url, null, props.options))
    );

    const getRetryInterval = useCallback((count) => 1000 * count, []);

    const packageMessage = useCallback((channel, msg, optHeaders) => {
        if (props.packageMessage) {
            return props.packageMessage(channel, msg, optHeaders);
        }

        try {
            return typeof msg === 'string' ? msg : JSON.stringify(msg);
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

                return typeof parsed === 'object' && parsed.content
                    ? parsed.content
                    : parsed;
            } catch (e) {
                return msg;
            }
        },
        [props.parseMessage]
    );

    const cleanUp = useCallback(() => {
        setConnected(() => false);
        setClient(() => null);
        retryCount.current = 0;
        setSubscriptions(() => {});
    }, []);

    const connect = useCallback(() => {
        client.connect(
            props.headers,
            () => {
                setConnected(() => true);
            },
            (error: any) => {
                console.error('[use-stomp:error]', error.stack);

                if (connected) {
                    cleanUp();
                }

                if (!explicitDisconnect.current) {
                    retryCount.current = retryCount.current + 1;
                    timeoutId.current = setTimeout(
                        connect,
                        getRetryInterval(retryCount.current)
                    );
                }
            }
        );
    }, [client, connected, props.headers]);

    const disconnect = useCallback(() => {
        if (timeoutId.current) {
            clearTimeout(timeoutId.current);
            timeoutId.current = null;
        }

        explicitDisconnect.current = true;

        if (connected) {
            client.disconnect(() => {
                cleanUp();
                console.log('[use-stomp:disconnect]', 'disconnected');
            });
        }
    }, [client, cleanUp, connected]);

    const send = useCallback(
        (channel, msg, optHeaders = {}) => {
            if (connected) {
                client.send(
                    channel,
                    optHeaders,
                    packageMessage(channel, msg, optHeaders)
                );
            } else {
                console.warn('[use-stomp:send]', 'websocket not connected');
            }
        },
        [client, connected, packageMessage]
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
        [
            client,
            disconnect,
            parseMessage,
            props.subscribeHeaders,
            subscriptions
        ]
    );

    useEffect(() => {
        explicitDisconnect.current = false;
        connect();
        return () => disconnect();
    }, []);

    useEffect(() => {
        let $heartbeat;

        if (connected && props.heartbeatChannel) {
            $heartbeat = setInterval(() => {
                send(props.heartbeatChannel, '');
            }, props.heartbeatInterval);
        }

        return () => {
            if ($heartbeat) {
                clearInterval($heartbeat);
            }
        };
    }, [connected]);

    const ctx = useMemo(
        () => ({
            send,
            subscribe
        }),
        [send, subscribe]
    );

    return (
        <UseStompCtx.Provider value={ctx}>
            {props.children}
        </UseStompCtx.Provider>
    );
});
