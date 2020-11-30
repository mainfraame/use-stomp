import React, {useEffect, useMemo} from 'react';

import UseStompCtx from './context';
import useToggle from './useToggle';
import WebSocketWorker from './webSocketWorker';

export type UseStompNotificationsProviderProps = {
    /**
     * HTTP to connect
     */
    url: string;
    /**
     * The request auth header will be passed to the server or agent through the STOMP connection frame
     */
    authHeader?: string;
    /**
     * The request header will be passed to the server or agent through the STOMP connection frame
     */
    headers?: Record<string, unknown>;
};

export default React.memo<UseStompNotificationsProviderProps>((props) => {
    const [connected, toggleConnected] = useToggle(false);

    const worker = useMemo<WebSocketWorker>(
        () =>
            new WebSocketWorker({
                onConnected: toggleConnected,
                onDisconnected: toggleConnected,
                url: props.url
            }),
        []
    );

    useEffect(() => {
        if (props.authHeader) {
            worker.setAuthHeader(props.authHeader);
            worker.connect();
        }
    }, [props.authHeader]);

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

    return (
        <UseStompCtx.Provider value={ctx}>
            {props.children}
        </UseStompCtx.Provider>
    );
});
