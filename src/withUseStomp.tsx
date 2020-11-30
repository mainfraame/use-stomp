import React from 'react';

import useStomp from './useStomp';

export type WithUseStompProps<T, M> = T & {
    message: M;
    sendMessage: (message: M) => void;
    connected: boolean;
};
/** decorator for legacy class-based components; pass the channel to subscribe.
 *  latest message and function for sending message are added to the class
 */
export default function withUseStomp<T, M>(channel: string) {
    return (Component) => {
        const WrapperComponent: React.FC<WithUseStompProps<T, M>> = React.memo(
            (props) => {
                const [message, sendMessage] = useStomp(channel);

                return (
                    <Component
                        {...props}
                        message={message as M}
                        sendMessage={sendMessage}
                    />
                );
            }
        );

        WrapperComponent.displayName = Component.displayName || 'WithUseStomp';

        return WrapperComponent;
    };
}
