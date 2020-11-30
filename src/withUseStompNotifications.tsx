import React from 'react';

import useStompNotifications, {
    StompNotification,
    StompNotistackOptions
} from './useStompNotifications';

export type WithUseStompNotificationsProps<T, M> = T & {
    connected: boolean;
    messages: StompNotification<M>[];
    sendMessage: (message: any) => void;
};
/** decorator for legacy class-based components; pass the channel to subscribe.
 *  it will add a lists prop, which contains all the notifications to display
 */
export default function withUseStompNotifications<OtherProps, Message>(
    channel: string,
    options?: StompNotistackOptions<Message>
) {
    return (Component) => {
        const WrapperComponent: React.FC<
            WithUseStompNotificationsProps<OtherProps, Message>
        > = React.memo((props) => {
            const [
                messages,
                sendMessage,
                connected
            ] = useStompNotifications<Message>(channel, options);

            return (
                <Component
                    {...props}
                    messages={messages}
                    connected={connected}
                    sendMessage={sendMessage}
                />
            );
        });

        WrapperComponent.displayName =
            Component.displayName || 'WithUseStompNotifications';

        return WrapperComponent;
    };
}
