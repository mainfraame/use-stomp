import {v4} from 'uuid';

import {Events, States} from './webSocketConfigs';

export type WebSocketWorkerProps = {
    onConnected?(): void;
    onDisconnected?(): void;
    onSyncState?(state: any): void;
    url?: string;
};

export default class WebSocketWorker extends SharedWorker {
    _channels = {};

    _connected = false;

    _id = v4();

    _onConnected = () => {};

    _onDisconnected = () => {};

    _onSyncState = (state: any) => {};

    _syncChannels = {};

    constructor(props?: WebSocketWorkerProps) {
        super('webSocketWorkerInstance.js');

        if (props?.onConnected) {
            this._onConnected = props.onConnected;
        }

        if (props?.onDisconnected) {
            this._onDisconnected = props.onDisconnected;
        }

        if (props?.onSyncState) {
            this._onSyncState = props.onSyncState;
        }

        this.port.start();

        this.port.addEventListener('message', this._onMessage);

        this._register();

        if (props.url) {
            this.setUrl(props.url);
        }

        document.addEventListener('visibilitychange', this._setVisibility);
        window.addEventListener('beforeunload', this._unregister);
    }

    connect = () => {
        this.port.postMessage({
            type: Events.CONNECT
        });
    };

    disconnect = () => {
        this.port.postMessage({
            type: Events.DISCONNECT
        });
    };

    dismiss = (channel, id) => {
        this.port.postMessage({
            type: Events.DISMISS_SYNC,
            payload: {
                channel,
                id
            }
        });
    };

    send = (channel: string, message: any) => {
        this.port.postMessage({
            type: Events.SEND_MESSAGE,
            payload: {
                channel,
                message
            }
        });
    };

    setAuthHeader = (authHeader) => {
        this.port.postMessage({
            type: Events.SET_AUTH_HEADER,
            payload: authHeader
        });
    };

    setHeader = (header) => {
        this.port.postMessage({
            type: Events.SET_HEADER,
            payload: header
        });
    };

    setUrl = (url) => {
        this.port.postMessage({
            type: Events.SET_URL,
            payload: url
        });
    };

    subscribe = (
        channel: string,
        callback: (message: any) => void
    ): (() => void) => {
        if (!(this._channels[channel] || []).length) {
            this._channels[channel] = [callback];

            this.port.postMessage({
                type: Events.SUBSCRIBE,
                payload: {
                    id: this._id,
                    channel
                }
            });
        } else {
            this._channels[channel] = [...this._channels[channel], callback];
        }

        return () => {
            this._channels[channel] = (this._channels[channel] || []).filter(
                (fn) => fn !== callback
            );

            if (!this._channels[channel].length) {
                this.unsubscribe(channel);
            }
        };
    };

    subscribeSync = (
        channel: string,
        callback: (message: any) => void
    ): (() => void) => {
        if (!(this._syncChannels[channel] || []).length) {
            this._syncChannels[channel] = [callback];

            this.port.postMessage({
                type: Events.SUBSCRIBE_SYNC,
                payload: {
                    id: this._id,
                    channel
                }
            });
        } else {
            this._syncChannels[channel] = [
                ...this._syncChannels[channel],
                callback
            ];
        }

        return () => {
            this._syncChannels[channel] = (
                this._syncChannels[channel] || []
            ).filter((fn) => fn !== callback);

            if (!this._syncChannels[channel].length) {
                this.unsubscribeSync(channel);
            }
        };
    };

    unsubscribe = (channel) => {
        this.port.postMessage({
            type: Events.UNSUBSCRIBE,
            payload: {
                id: this._id,
                channel
            }
        });
    };

    unsubscribeSync = (channel) => {
        this.port.postMessage({
            type: Events.UNSUBSCRIBE_SYNC,
            payload: {
                id: this._id,
                channel
            }
        });
    };

    _onMessage = (event) => {
        if (this._workerEvents[event.data.type]) {
            this._workerEvents[event.data.type](event);
        }
    };

    _register = () => {
        this.port.postMessage({
            type: Events.REGISTER,
            payload: {
                id: this._id,
                visibility: document.visibilityState === 'visible'
            }
        });
    };

    _setError = (event) => {
        console.error('[use-stomp]', event.data.payload);
    };

    _setVisibility = () => {
        this.port.postMessage({
            type: Events.SET_VISIBILITY,
            payload: {
                id: this._id,
                visibility: document.visibilityState === 'visible'
            }
        });
    };

    _setMessage = (event) => {
        if (this._channels[event.data.payload.channel]) {
            this._channels[event.data.payload.channel].forEach((fn) =>
                fn(event.data.payload.message)
            );
        }

        if (this._syncChannels[event.data.payload.channel]) {
            this._syncChannels[event.data.payload.channel].forEach((fn) => {
                fn(
                    (event.data.payload.message || []).map((item) => ({
                        ...item,
                        dismiss: () =>
                            this.dismiss(event.data.payload.channel, item.id)
                    }))
                );
            });
        }
    };

    _setConnection = (event) => {
        const wasConnected = !!this._connected;

        switch (event.data.payload) {
            case States.CONNECTED:
                this._connected = true;
                break;
            case States.CONNECTING:
                this._connected = false;
                break;
            case States.DISCONNECTED:
                this._connected = false;
                break;
            case States.DISCONNECTING:
                this._connected = false;
                break;
        }

        if (!wasConnected && this._connected) {
            this._onConnected();
        }

        if (wasConnected && !this._connected) {
            this._onDisconnected();
        }
    };

    _unregister = () => {
        this.port.removeEventListener('message', this._onMessage);

        this.port.postMessage({
            type: Events.UNREGISTER,
            payload: {
                id: this._id
            }
        });

        document.removeEventListener('visibilitychange', this._setVisibility);
    };

    _workerEvents = {
        [Events.CONNECTION]: this._setConnection,
        [Events.ERROR]: this._setError,
        [Events.MESSAGE]: this._setMessage
    };
}
