import {useSnackbar} from 'notistack';
import type {OptionsObject, VariantType} from 'notistack';
import {useCallback, useEffect, useState} from 'react';
import * as React from 'react';

import {useStompCtx} from './useStompCtx';

export type UseStompNotificationsProps<T, M> = [
    T[],
    (otherChannelOrMessage: string | T, message?: M) => void,
    boolean
];

export type StompNotification<T> = {
    id: string;
    content: T;
    dismiss: () => void;
    variant?: VariantType;
};

export type StompNotistackOptions<T> = Omit<OptionsObject, 'action' | 'key'> & {
    action: (dismiss: () => void) => React.ReactNode;
    parseMessage?: (message: StompNotification<T>) => React.ReactNode;
    parseVariant?: (message: StompNotification<T>) => VariantType;
};

export default function useStompNotifications<
    ReceiveMessage,
    SendMessage = any
>(
    channel: string,
    options?: StompNotistackOptions<ReceiveMessage>
): UseStompNotificationsProps<StompNotification<ReceiveMessage>, SendMessage> {
    const context = useStompCtx();
    const {closeSnackbar, enqueueSnackbar} = useSnackbar();
    const [messages, setMessages] = useState<
        StompNotification<ReceiveMessage>[]
    >([]);

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
            const subscription = context.subscribeSync(
                channel,
                (messages, added, removed) => {
                    added.forEach((item) => {
                        enqueueSnackbar(
                            options.parseMessage
                                ? options.parseMessage(item)
                                : item.content,
                            {
                                key: item.id,
                                disableWindowBlurListener: true,
                                ClickAwayListenerProps: {
                                    mouseEvent: false,
                                    touchEvent: false
                                },
                                ...options,
                                ...(options.action
                                    ? {
                                          action: options.action(() => {
                                              closeSnackbar(item.id);
                                          })
                                      }
                                    : {}),
                                onClose: () => {
                                    item.dismiss();
                                },
                                variant: options.parseVariant
                                    ? options.parseVariant(item)
                                    : item.variant || 'info'
                            }
                        );
                    });

                    removed.forEach((item) => {
                        closeSnackbar(item.id);
                    });

                    setMessages(() => messages);
                }
            );

            return () => {
                subscription();
            };
        }
    }, [channel, context.connected]);

    return [messages, send, context.connected];
}
