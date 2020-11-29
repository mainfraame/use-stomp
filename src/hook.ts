import {useCallback, useContext, useEffect, useState} from 'react';

import UseStompCtx, {UseStompCtxProps} from './context';

export function useStompCtx(): UseStompCtxProps {
    return useContext(UseStompCtx);
}

export default function useStomp<T>(
    /** channel to subscribe to */
    channel: string
): [T, (message: T) => void] {
    const context = useStompCtx();
    const [message, setMsg] = useState<T>(null);

    const send = useCallback(
        (message) => {
            context.send(channel, message);
        },
        [channel, context.send]
    );

    useEffect(() => {
        if (context.connected) {
            const subscription = context.subscribe(channel, (message) => {
                setMsg(() => message);
            });

            return () => {
                if (context.connected) {
                    subscription();
                }
            };
        }
    }, [context.connected]);

    return [message, send];
}
