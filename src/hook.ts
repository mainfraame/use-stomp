import {useCallback, useContext, useEffect, useState} from 'react';

import UseStompCtx from './context';

export default function useStomp<T>(
    /** channel to subscribe to */
    channel: string,
    /** callback that's called when a message is received (optional) */
    callback?: (msg: T, headers?: any) => void
): [T, (msg: T) => void] {
    const context = useContext(UseStompCtx);
    const [msg, setMsg] = useState<T>({} as T);

    const send = useCallback(
        (msg) => {
            context.send(channel, msg);
        },
        [channel, context.send]
    );

    useEffect(() => {
        const subscription = context.subscribe(channel, (msg, headers) => {
            if (callback) {
                callback(msg, headers);
            }

            setMsg(() => msg);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return [msg, send];
}
