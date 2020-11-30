import {useCallback, useEffect, useState} from 'react';

import {useStompCtx} from './useStompCtx';

export type UseStompProps<T> = [
    T,
    (otherChannelOrMessage: string | T, message?: T) => void,
    boolean
];

export default function useStomp<T>(channel: string): UseStompProps<T> {
    const context = useStompCtx();
    const [message, setMsg] = useState<T>(null);

    const send = useCallback(
        (otherChannelOrMessage, message) => {
            context.send(
                otherChannelOrMessage && message
                    ? otherChannelOrMessage
                    : channel,
                message
            );
        },
        [channel, context.send]
    );

    useEffect(() => {
        if (context.connected) {
            const subscription = context.subscribe(channel, (message) => {
                setMsg(() => message);
            });

            return () => {
                subscription();
            };
        }
    }, [channel, context.connected]);

    return [message, send, context.connected];
}
