import React from 'react';

export type UseStompCtxProps<T = any> = {
    /** whether or not the websocket is connected */
    connected?: boolean;
    /** subscribe to a channel with given callback; returns unsubscribe */
    subscribe?(
        /** channel to subscribe to */
        channel: string,
        /** callback for when message is received */
        callback: (message: any) => void
    ): () => void /** returns unsubscribe callback */;
    /** subscribe to a channel with given callback; this will handle all messages as a queue */
    subscribeSync?(
        /** channel to subscribe to */
        channel: string,
        /** callback for when message is received */
        callback: (message: any) => void
    ): () => void /** returns unsubscribe callback */;
    /**
     * dismiss a message in list
     * @param {string} channel of the list
     * @param {number} id of the message of the list
     */
    dismiss?(channel: string, id: string): void;
    /**
     * Send a message to the channel subscription
     * @param {any} channel subscription address
     * @param {any} msg message to send
     */
    send?(channel: any, msg: any): void;
};

export default React.createContext<UseStompCtxProps>({});
