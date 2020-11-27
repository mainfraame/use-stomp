import React from 'react';
import type {Subscription} from 'stompjs';

export type UseStompCtxProps = {
    /** whether or not the websocket is connected */
    connected?: boolean;
    /** subscribe to a channel with given callback; returns unsubscribe */
    subscribe?(
        /** channel to subscribe to */
        channel: string,
        /** callback for when message is received */
        callback: (msg: any, headers?: any) => void
    ): Subscription;
    /**
     * Send a message to the channel subscription
     * @param {any} channel subscription address
     * @param {any} msg message to send
     * @param {any} optHeaders subscribe to request header messages
     */
    send?(channel: any, msg: any, optHeaders?: any): void;
};

export default React.createContext<UseStompCtxProps>({});
