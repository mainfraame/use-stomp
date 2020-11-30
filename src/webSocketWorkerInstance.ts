import SockJS from 'sockjs-client';
import type {Client, Subscription} from 'stompjs';
import {v4} from 'uuid';

import Stomp from './stomp';
import {Events, States} from './webSocketConfigs';

type WEBSOCKET_CONNECTION = {
    WEBSOCKET: Client;
    WEBSOCKET_AUTH_HEADER: string;
    WEBSOCKET_CONNECTION: string;
    WEBSOCKET_HEADER: string;
    WEBSOCKET_URL: string;
    WEBSOCKET_STATE: {
        [channel: string]: {id: string; message: any}[];
    };
    WEBSOCKET_PORTS: Map<string, MessagePort>;
    WEBSOCKET_CHANNELS: Map<string, Subscription>;
    WEBSOCKET_SUBSCRIPTIONS: Map<string, string[]>;
    WEBSOCKET_VISIBLE_TABS: Set<string>;
};

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

const ctx: WEBSOCKET_CONNECTION = {
    WEBSOCKET: null,
    WEBSOCKET_AUTH_HEADER: '',
    WEBSOCKET_CONNECTION: States.DISCONNECTED,
    WEBSOCKET_HEADER: '',
    WEBSOCKET_URL: '',
    WEBSOCKET_STATE: {},
    WEBSOCKET_PORTS: new Map(),
    WEBSOCKET_CHANNELS: new Map(),
    WEBSOCKET_SUBSCRIPTIONS: new Map(),
    WEBSOCKET_VISIBLE_TABS: new Set()
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

        return typeof parsed === 'object' && parsed !== null && parsed.content
            ? parsed.content
            : parsed;
    } catch (e) {
        return message;
    }
}

const broadcast = (type, payload) => {
    ctx.WEBSOCKET_PORTS.forEach((port, id) => {
        emit(id, type, payload);
    });
};

const emit = (id, type, payload, onlyVisible = false) => {
    if (ctx.WEBSOCKET_PORTS.has(id)) {
        // if (!onlyVisible || ctx.WEBSOCKET_VISIBLE_TABS.has(id)) {
        ctx.WEBSOCKET_PORTS.get(id).postMessage({
            type,
            payload
        });
    }
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
        // if (isAnyTabVisible()) {
        ctx.WEBSOCKET_SUBSCRIPTIONS.get(channel).forEach((id) => {
            emit(id, Events.MESSAGE, {
                channel,
                message
            });
        });
        // } else {
        // }
    }
};

const onChannelMessageSync = (channel) => (msg) => {
    const message = parseMessage(msg.body);

    if (message?.status === 'END') {
        disconnect();
    } else {
        ctx.WEBSOCKET_STATE[channel] = [
            ...(ctx.WEBSOCKET_STATE[channel] || []),
            {
                id: v4(),
                message
            }
        ];

        ctx.WEBSOCKET_SUBSCRIPTIONS.get(channel).forEach((id) => {
            emit(id, Events.MESSAGE, {
                channel,
                message: ctx.WEBSOCKET_STATE[channel]
            });
        });
    }
};

const onDismissSync = (e) => {
    ctx.WEBSOCKET_STATE[e.data.payload.channel] = ctx.WEBSOCKET_STATE[
        e.data.payload.channel
    ].filter((message) => message.id !== e.data.payload.id);

    console.log('list state', ctx.WEBSOCKET_STATE[e.data.payload.channel]);

    ctx.WEBSOCKET_SUBSCRIPTIONS.get(e.data.payload.channel).forEach((id) => {
        emit(id, Events.MESSAGE, {
            channel: e.data.payload.channel,
            message: ctx.WEBSOCKET_STATE[e.data.payload.channel]
        });
    });
};

const onDisconnected = () => {
    setState(States.DISCONNECTED);
};

const onError = (e) => {
    broadcast(Events.ERROR, e);
};

const isConnected = () => ctx.WEBSOCKET_CONNECTION === States.CONNECTED;
const isConnecting = () => ctx.WEBSOCKET_CONNECTION === States.CONNECTING;
const isDisconnected = () => ctx.WEBSOCKET_CONNECTION === States.DISCONNECTED;
const isDisconnecting = () => ctx.WEBSOCKET_CONNECTION === States.DISCONNECTING;
const isAnyTabVisible = () => ctx.WEBSOCKET_VISIBLE_TABS.size > 0;

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
    if (ctx.WEBSOCKET?.subscribe && ctx.WEBSOCKET?.connected && isConnected()) {
        ctx.WEBSOCKET_CHANNELS.forEach((subscription, channel) => {
            ctx.WEBSOCKET_CHANNELS.set(
                channel,
                ctx.WEBSOCKET.subscribe(channel, onChannelMessage(channel))
            );
        });
    }
};

const subscribe = (e) => {
    if (isConnected() && !ctx.WEBSOCKET_CHANNELS.has(e.data.payload.channel)) {
        ctx.WEBSOCKET_CHANNELS.set(
            e.data.payload.channel,
            ctx.WEBSOCKET.subscribe(
                e.data.payload.channel,
                onChannelMessage(e.data.payload.channel)
            )
        );
    }
    // if channel has no subscriptions, set it as an array and add id
    if (!ctx.WEBSOCKET_SUBSCRIPTIONS.has(e.data.payload.channel)) {
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

const subscribeSync = (e) => {
    if (isConnected() && !ctx.WEBSOCKET_CHANNELS.has(e.data.payload.channel)) {
        ctx.WEBSOCKET_CHANNELS.set(
            e.data.payload.channel,
            ctx.WEBSOCKET.subscribe(
                e.data.payload.channel,
                onChannelMessageSync(e.data.payload.channel)
            )
        );
    }
    // if channel has no subscriptions, set it as an array and add id
    if (!ctx.WEBSOCKET_SUBSCRIPTIONS.has(e.data.payload.channel)) {
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

const setVisibility = (e) => {
    const visible = e.data.payload.visibility;
    const current = ctx.WEBSOCKET_VISIBLE_TABS.has(e.data.payload.id);

    if (visible && !current) {
        ctx.WEBSOCKET_VISIBLE_TABS.add(e.data.payload.id);
    }

    if (!visible && current) {
        ctx.WEBSOCKET_VISIBLE_TABS.delete(e.data.payload.id);
    }
};

const setState = (state) => {
    ctx.WEBSOCKET_CONNECTION = state;
    broadcast(Events.CONNECTION, ctx.WEBSOCKET_CONNECTION);
};

const unregister = (e) => {
    ctx.WEBSOCKET_PORTS.delete(e.data.payload.id);
    ctx.WEBSOCKET_VISIBLE_TABS.delete(e.data.payload.id);

    ctx.WEBSOCKET_SUBSCRIPTIONS.forEach((ids, channel) => {
        unsubscribe({
            ...e,
            data: {
                payload: {
                    ...e.data.payload,
                    channel
                }
            }
        });
    });
};

const unsubscribe = (e) => {
    const uuid = e.data.payload.id;
    const channel = e.data.payload.channel;

    if (ctx.WEBSOCKET_SUBSCRIPTIONS.has(channel)) {
        const ids = ctx.WEBSOCKET_SUBSCRIPTIONS.get(channel).filter(
            (id) => id !== uuid
        );

        if (!ids.length) {
            ctx.WEBSOCKET_SUBSCRIPTIONS.delete(channel);
            ctx.WEBSOCKET_CHANNELS.get(channel).unsubscribe();
            ctx.WEBSOCKET_CHANNELS.delete(channel);
        } else {
            ctx.WEBSOCKET_SUBSCRIPTIONS.set(channel, ids);
        }
    }
};

const unsubscribeAll = () => {
    ctx.WEBSOCKET_CHANNELS.forEach((subscription, channel) => {
        subscription.unsubscribe();
        ctx.WEBSOCKET_CHANNELS.delete(channel);
        ctx.WEBSOCKET_SUBSCRIPTIONS.delete(channel);
    });
};

_self.addEventListener('connect', (e) => {
    const port = e.ports[0];

    const register = (e) => {
        ctx.WEBSOCKET_PORTS.set(e.data.payload.id, port);

        if (e.data.payload.visible) {
            ctx.WEBSOCKET_VISIBLE_TABS.add(e.data.payload.id);
        }
    };

    port.addEventListener('message', (e) => {
        const messageBroker = {
            [Events.CONNECT]: connect,
            [Events.DISMISS_SYNC]: onDismissSync,
            [Events.DISCONNECT]: disconnect,
            [Events.REGISTER]: register,
            [Events.SEND_MESSAGE]: sendMessage,
            [Events.SET_AUTH_HEADER]: setAuthHeader,
            [Events.SET_HEADER]: setHeader,
            [Events.SET_URL]: setUrl,
            [Events.SUBSCRIBE]: subscribe,
            [Events.SUBSCRIBE_SYNC]: subscribeSync,
            [Events.UNREGISTER]: unregister,
            [Events.UNSUBSCRIBE]: unsubscribe,
            [Events.UNSUBSCRIBE_SYNC]: unsubscribe,
            [Events.SET_VISIBILITY]: setVisibility
        };

        if (messageBroker[e.data.type]) {
            messageBroker[e.data.type](e);
        }
    });

    port.start();

    console.log('started webSocketWorkerInstance');

    port.postMessage({
        type: Events.CONNECTION,
        payload: ctx.WEBSOCKET_CONNECTION
    });
});
