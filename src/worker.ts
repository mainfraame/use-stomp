import SockJS from 'sockjs-client';
import type {Client, Subscription} from 'stompjs';

import Stomp from './stomp';
import {Events, States} from './webSocketConfigs';

interface SharedWorkerGlobalScope {
    addEventListener(
        type: string,
        listener: (event: MessageEvent) => void,
        options?: boolean | AddEventListenerOptions
    ): void;
    onconnect: (event: MessageEvent) => void;
    ws: Client;
}

const _self: SharedWorkerGlobalScope = self as any;

type WEBSOCKET_STATE = {
    WEBSOCKET: Client;
    WEBSOCKET_AUTH_HEADER: string;
    WEBSOCKET_HEADER: string;
    WEBSOCKET_STATE: string;
    WEBSOCKET_URL: string;
    WEBSOCKET_PORTS: Map<string, MessagePort>;
    WEBSOCKET_CHANNELS: Map<string, Subscription>;
    WEBSOCKET_SUBSCRIPTIONS: Map<string, string[]>;
};

export default () => {
    const ctx: WEBSOCKET_STATE = {
        WEBSOCKET: null,
        WEBSOCKET_AUTH_HEADER: '',
        WEBSOCKET_HEADER: '',
        WEBSOCKET_STATE: States.DISCONNECTED,
        WEBSOCKET_URL: '',
        WEBSOCKET_PORTS: new Map<string, MessagePort>(),
        WEBSOCKET_CHANNELS: new Map<string, Subscription>(), // channel, ids
        WEBSOCKET_SUBSCRIPTIONS: new Map<string, string[]>() // channel, ids
    };

    function packageMessage(message) {
        try {
            return typeof message === 'object' && message !== null
                ? JSON.stringify(message)
                : message;
        } catch (e) {
            return message;
        }
    }

    function parseMessage(message) {
        try {
            const parsed = JSON.parse(message);

            return typeof parsed === 'object' &&
                parsed !== null &&
                parsed.content
                ? parsed.content
                : parsed;
        } catch (e) {
            return message;
        }
    }

    const broadcast = (type, payload) => {
        ctx.WEBSOCKET_PORTS.forEach((port) => {
            port.postMessage({
                type,
                payload
            });
        });
    };

    const emit = (id, type, payload) => {
        ctx.WEBSOCKET_PORTS.get(id).postMessage({
            type,
            payload
        });
    };

    const onConnected = () => {
        resubscribeAll();

        setState(States.CONNECTED);
    };

    const onChannelMessage = (channel) => (msg) => {
        const message = parseMessage(msg.body);

        if (message?.status === 'END') {
            disconnect();
        } else {
            ctx.WEBSOCKET_SUBSCRIPTIONS.get(channel).forEach((id) => {
                emit(id, Events.MESSAGE, {
                    channel,
                    message
                });
            });
        }
    };

    const onDisconnected = () => {
        setState(States.DISCONNECTED);
    };

    const onError = (e) => {
        broadcast(Events.ERROR, e);
    };

    const isConnected = () => ctx.WEBSOCKET_STATE === States.CONNECTED;
    const isConnecting = () => ctx.WEBSOCKET_STATE === States.CONNECTING;
    const isDisconnected = () => ctx.WEBSOCKET_STATE === States.DISCONNECTED;
    const isDisconnecting = () => ctx.WEBSOCKET_STATE === States.DISCONNECTING;

    const connect = () => {
        if (isConnecting() || isConnected() || isDisconnecting()) {
            return;
        }

        disconnect();

        setState(States.CONNECTING);

        ctx.WEBSOCKET = Stomp.over(new SockJS(ctx.WEBSOCKET_URL, null, {}));

        (ctx.WEBSOCKET.connect as any)(
            ctx.WEBSOCKET_AUTH_HEADER
                ? {Authorization: ctx.WEBSOCKET_AUTH_HEADER}
                : ctx.WEBSOCKET_HEADER,
            onConnected,
            onDisconnected,
            onError
        );
    };

    const disconnect = () => {
        if (isDisconnecting() || isDisconnected()) {
            return;
        }

        setState(States.DISCONNECTING);
        unsubscribeAll();

        if (ctx.WEBSOCKET) {
            (ctx.WEBSOCKET.disconnect as any)();
        }

        setState(States.DISCONNECTED);
    };

    const resubscribeAll = () => {
        if (ctx.WEBSOCKET?.subscribe) {
            ctx.WEBSOCKET_CHANNELS.forEach((subscription, channel) => {
                ctx.WEBSOCKET_CHANNELS.set(
                    channel,
                    ctx.WEBSOCKET.subscribe(channel, onChannelMessage(channel))
                );
            });
        }
    };

    const subscribe = (e) => {
        if (
            ctx.WEBSOCKET?.subscribe &&
            !ctx.WEBSOCKET_CHANNELS.get(e.data.payload.channel)
        ) {
            ctx.WEBSOCKET_CHANNELS.set(
                e.data.payload.channel,
                ctx.WEBSOCKET.subscribe(
                    e.data.payload.channel,
                    onChannelMessage(e.data.payload.channel)
                )
            );
        }
        // if channel has no subscriptions, set it as an array and add id
        if (!ctx.WEBSOCKET_SUBSCRIPTIONS.get(e.data.payload.channel)) {
            ctx.WEBSOCKET_SUBSCRIPTIONS.set(e.data.payload.channel, [
                e.data.payload.id
            ]);
        } else {
            // if channel does exist, update the ids to include id
            ctx.WEBSOCKET_SUBSCRIPTIONS.set(e.data.payload.channel, [
                ...ctx.WEBSOCKET_SUBSCRIPTIONS.get(e.data.payload.channel),
                e.data.payload.id
            ]);
        }
    };

    const sendMessage = (e) => {
        if (ctx.WEBSOCKET) {
            ctx.WEBSOCKET.send(
                e.data.payload.channel,
                null,
                packageMessage(e.data.payload.message)
            );
        }
    };

    const setAuthHeader = (e) => {
        ctx.WEBSOCKET_AUTH_HEADER = e.data.payload;
    };

    const setHeader = (e) => {
        ctx.WEBSOCKET_HEADER = e.data.payload;
    };

    const setUrl = (e) => {
        ctx.WEBSOCKET_URL = e.data.payload;
    };

    const setState = (state) => {
        ctx.WEBSOCKET_STATE = state;
        broadcast(Events.SET_WS_STATE, ctx.WEBSOCKET_STATE);
    };
    const unregisterTab = (e) => {
        ctx.WEBSOCKET_PORTS.delete(e.data.payload);
        ctx.WEBSOCKET_SUBSCRIPTIONS.forEach((ids, channel) => {
            ctx.WEBSOCKET_SUBSCRIPTIONS.set(
                channel,
                ids.filter((id) => id !== e.data.payload)
            );
        });
    };

    const unsubscribe = (e) => {
        const channel = e.data.payload.channel;
        const uuid = e.data.payload.id;

        if (ctx.WEBSOCKET_SUBSCRIPTIONS.has(channel)) {
            ctx.WEBSOCKET_SUBSCRIPTIONS.set(
                channel,
                ctx.WEBSOCKET_SUBSCRIPTIONS.get(channel).filter(
                    (id) => id !== uuid
                )
            );

            const subscription = ctx.WEBSOCKET_CHANNELS.get(channel);
            const subscribers = ctx.WEBSOCKET_SUBSCRIPTIONS.get(channel);

            if (!subscribers.length && subscription) {
                subscription.unsubscribe();
                ctx.WEBSOCKET_CHANNELS.set(channel, null);
            }
        }
    };

    const unsubscribeAll = () => {
        ctx.WEBSOCKET_CHANNELS.forEach((subscription, channel) => {
            subscription.unsubscribe();
            ctx.WEBSOCKET_CHANNELS.set(channel, null);
        });
    };

    _self.addEventListener('connect', (e) => {
        const registerTab = (e) => {
            ctx.WEBSOCKET_PORTS.set(e.data.payload, e.ports[0]);
        };

        const messageBroker = {
            [Events.CONNECT]: connect,
            [Events.DISCONNECT]: disconnect,
            [Events.REGISTER]: registerTab,
            [Events.SEND_MESSAGE]: sendMessage,
            [Events.SET_AUTH_HEADER]: setAuthHeader,
            [Events.SET_HEADER]: setHeader,
            [Events.SET_URL]: setUrl,
            [Events.SUBSCRIBE]: subscribe,
            [Events.UNREGISTER]: unregisterTab,
            [Events.UNSUBSCRIBE]: unsubscribe
        };

        const onMessage = (e) => {
            if (messageBroker[e.data.type]) {
                messageBroker[e.data.type](e);
            }
        };

        e.ports[0].addEventListener('message', onMessage);
    });
};
