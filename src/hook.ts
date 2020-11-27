import {useCallback, useContext, useEffect, useState} from 'react';

import UseStompCtx, {UseStompCtxProps} from './context';

export function useStompCtx(): UseStompCtxProps {
    return useContext(UseStompCtx);
}

export default function useStomp<T>(
    /** channel to subscribe to */
    channel: string,
    /** callback that's called when a message is received (optional) */
    callback?: (msg: T, headers?: any) => void
): [T, (msg: T) => void] {
    const context = useStompCtx();
    const [msg, setMsg] = useState<T>(null);

    const send = useCallback(
        (msg) => {
            context.send(channel, msg);
        },
        [channel, context.send]
    );

    useEffect(() => {
        if (context.connected) {
            const subscription = context.subscribe(channel, (msg, headers) => {
                if (callback) {
                    callback(msg, headers);
                }

                setMsg(() => msg);
            });

            return () => {
                if (context.connected) {
                    subscription.unsubscribe();
                }
            };
        }
    }, [context.connected]);

    return [msg, send];
}
