import {v4} from 'uuid';

import {Events, States} from './webSocketConfigs';
import worker from './worker';

export type WebSocketWorkerProps = {
    onConnected?(): void;
    onDisconnected?(): void;
    url?: string;
};

export default class WebSocketWorker extends SharedWorker {
    _channels = {};

    _id = v4();

    _onConnected;

    _onDisconnected;

    _webSocketState = States.DISCONNECTED;

    constructor(props?: WebSocketWorkerProps) {
        super(URL.createObjectURL(new Blob([`(` + worker.toString() + ')()'])));

        if (props?.onConnected) {
            this._onConnected = props.onConnected;
        }

        if (props?.onDisconnected) {
            this._onDisconnected = props.onDisconnected;
        }

        this.port.start();

        this.port.addEventListener('message', this._onWorkerEvent);

        this._register();

        if (props.url) {
            this.setUrl(props.url);
        }

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
        if (!this._channels[channel]) {
            this._channels[channel] = [callback];
        } else {
            this._channels[channel] = [...this._channels[channel], callback];
        }

        this.port.postMessage({
            type: Events.SUBSCRIBE,
            payload: {
                id: this._id,
                channel
            }
        });

        return () => {
            this._channels[channel] = (this._channels[channel] || []).filter(
                (fn) => fn !== callback
            );

            if (!this._channels[channel].length) {
                this.unsubscribe(channel);
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

    _onWorkerEvent = (event) => {
        if (this._workerEvents[event.data.type]) {
            this._workerEvents[event.data.type](event);
        }
    };

    _register = () => {
        this.port.postMessage({
            type: Events.REGISTER,
            payload: this._id
        });
    };

    _setWorkerError = (event) => {
        console.error('[use-stomp]', event.data.payload);
    };

    _setWorkerMessage = (event) => {
        if (this._channels[event.data.payload.channel]) {
            this._channels[event.data.payload.channel](
                event.data.payload.message
            );
        }
    };
    _setWorkerState = (event) => {
        this._webSocketState = event.data.payload;

        switch (event.data.payload) {
            case States.CONNECTED:
                if (this._onConnected) {
                    this._onConnected();
                }
                break;
            case States.DISCONNECTED:
                if (this._onDisconnected) {
                    this._onDisconnected();
                }
                break;
        }
    };

    _unregister = () => {
        this.port.removeEventListener('message', this._onWorkerEvent);

        this.port.postMessage({
            type: Events.UNREGISTER,
            payload: this._id
        });
    };

    _workerEvents = {
        [Events.SET_WS_STATE]: this._setWorkerState,
        [Events.ERROR]: this._setWorkerError,
        [Events.MESSAGE]: this._setWorkerMessage
    };
}
