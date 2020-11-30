import {useCallback, useEffect, useState} from 'react';

import {useStompCtx} from './useStompCtx';

export type UseStompNotificationsProps<T> = [T, (message: T) => void, boolean];
export type StompNotification<T> = {
    id: string;
    message: T;
    dismiss: () => void;
};

export default function useStompNotifications<T>(
    channel: string
): UseStompNotificationsProps<StompNotification<T>[]> {
    const context = useStompCtx();
    const [list, setList] = useState<StompNotification<T>[]>([]);

    const send = useCallback(
        (message) => {
            context.send(channel, message);
        },
        [channel, context.send]
    );

    useEffect(() => {
        if (context.connected) {
            const subscription = context.subscribeSync(channel, (list) => {
                setList(() => list);
            });

            return () => {
                subscription();
            };
        }
    }, [channel, context.connected]);

    return [list, send, context.connected];
}
