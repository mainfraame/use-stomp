import React, {useEffect, useMemo, useRef} from 'react';

import UseStompCtx from './context';
import useToggle from './useToggle';
import WebSocketWorker from './webSocketWorker';

export type UseStompWorkerProviderProps = {
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

export default React.memo<UseStompWorkerProviderProps>((props) => {
    const [connected, toggleConnected] = useToggle(false);

    const worker = useRef<WebSocketWorker>(
        new WebSocketWorker({
            onConnected: toggleConnected,
            onDisconnected: toggleConnected,
            url: props.url
        })
    );

    useEffect(() => {
        if (props.authHeader) {
            worker.current.setAuthHeader(props.authHeader);
        }
    }, [props.authHeader]);

    const ctx = useMemo(
        () => ({
            send: worker.current.send,
            subscribe: worker.current.subscribe,
            connected
        }),
        [connected, worker.current.send, worker.current.subscribe]
    );

    return (
        <UseStompCtx.Provider value={ctx}>
            {props.children}
        </UseStompCtx.Provider>
    );
});
