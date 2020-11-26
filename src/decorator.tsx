import React from 'react';

import useStomp from './hook';

/** decorator for legacy class-based components; pass the channel to subscribe.
 *  latest message and function for sending message are added to the class
 */
export default function withUseStomp<T>(
    /** channel to subscribe to */
    channel: string
) {
    return (Component) => {
        return React.memo((props) => {
            const [message, sendMessage] = useStomp(channel);

            return (
                <Component
                    {...props}
                    message={message as T}
                    sendMessage={sendMessage}
                />
            );
        });
    };
}
