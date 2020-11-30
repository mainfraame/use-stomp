import React from 'react';

import useStompNotifications, {
    StompNotification
} from './useStompNotifications';

export type WithUseStompNotificationsProps<T, M> = T & {
    connected: boolean;
    list: StompNotification<M>[];
    sendMessage: (message: any) => void;
};
/** decorator for legacy class-based components; pass the channel to subscribe.
 *  it will add a lists prop, which contains all the notifications to display
 */
export default function withUseStompNotifications<T, M>(channel: string) {
    return (Component) => {
        const WrapperComponent: React.FC<
            WithUseStompNotificationsProps<T, M>
        > = React.memo((props) => {
            const [list, sendMessage, connected] = useStompNotifications<M>(
                channel
            );

            return (
                <Component
                    {...props}
                    connected={connected}
                    list={list}
                    sendMessage={sendMessage}
                />
            );
        });

        WrapperComponent.displayName =
            Component.displayName || 'WithUseStompNotifications';

        return WrapperComponent;
    };
}
