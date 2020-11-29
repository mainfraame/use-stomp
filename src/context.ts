import React from 'react';

export type UseStompCtxProps = {
    /** whether or not the websocket is connected */
    connected?: boolean;
    /** subscribe to a channel with given callback; returns unsubscribe */
    subscribe?(
        /** channel to subscribe to */
        channel: string,
        /** callback for when message is received */
        callback: (message: any) => void
    ): () => void /** returns unsubscribe callback */;
    /**
     * Send a message to the channel subscription
     * @param {any} channel subscription address
     * @param {any} msg message to send
     */
    send?(channel: any, msg: any): void;
};

export default React.createContext<UseStompCtxProps>({});
