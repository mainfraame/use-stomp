import {w3cwebsocket as WebSocketClass} from 'websocket';
const __hasProp = {}.hasOwnProperty;
const __slice = [].slice;

const Byte = {
    LF: '\x0A',
    NULL: '\x00'
};

const Frame = (function () {
    function Frame(command, headers, body) {
        this.command = command;
        this.headers = headers != null ? headers : {};
        this.body = body != null ? body : '';
    }

    Frame.prototype.toString = function () {
        const lines = [this.command];
        const skipContentLength = this.headers['content-length'] === false;

        if (skipContentLength) {
            delete this.headers['content-length'];
        }

        const _ref = this.headers;

        for (let name in _ref) {
            if (!__hasProp.call(_ref, name)) continue;
            const value = _ref[name];
            lines.push('' + name + ':' + value);
        }

        if (this.body && !skipContentLength) {
            lines.push('content-length:' + Frame.sizeOfUTF8(this.body));
        }

        lines.push(Byte.LF + this.body);

        return lines.join(Byte.LF);
    };

    Frame.sizeOfUTF8 = function (s) {
        if (s) {
            return encodeURI(s).match(/%..|./g).length;
        } else {
            return 0;
        }
    };

    const unmarshallSingle = function (data) {
        let i;
        let _j;
        let _ref1;
        let chr;
        let idx;
        let len;
        let line;

        const divider = data.search(RegExp('' + Byte.LF + Byte.LF));

        const headerLines = data.substring(0, divider).split(Byte.LF);

        const command = headerLines.shift();

        const headers = {};

        const trim = function (str) {
            return str.replace(/^\s+|\s+$/g, '');
        };

        const _ref = headerLines.reverse();

        for (let _i = 0, _len = _ref.length; _i < _len; _i++) {
            line = _ref[_i];
            idx = line.indexOf(':');
            headers[trim(line.substring(0, idx))] = trim(
                line.substring(idx + 1)
            );
        }

        let body = '';
        const start = divider + 2;

        if (headers['content-length']) {
            len = parseInt(headers['content-length']);
            body = ('' + data).substring(start, start + len);
        } else {
            chr = null;
            for (
                i = _j = start, _ref1 = data.length;
                start <= _ref1 ? _j < _ref1 : _j > _ref1;
                i = start <= _ref1 ? ++_j : --_j
            ) {
                chr = data.charAt(i);
                if (chr === Byte.NULL) {
                    break;
                }
                body += chr;
            }
        }
        return new Frame(command, headers, body);
    };

    Frame.unmarshall = function (datas) {
        return (function () {
            const _ref = datas.split(RegExp('' + Byte.NULL + Byte.LF + '*'));
            const _results = [];

            for (let _i = 0, _len = _ref.length; _i < _len; _i++) {
                const data = _ref[_i];
                if ((data != null ? data.length : void 0) > 0) {
                    _results.push(unmarshallSingle(data));
                }
            }

            return _results;
        })();
    };

    Frame.marshall = function (command, headers, body) {
        const frame = new Frame(command, headers, body);
        return frame.toString() + Byte.NULL;
    };

    return Frame;
})();

const Client = (function () {
    var now;

    function Client(ws, debug = false) {
        this.ws = ws;
        this.ws.binaryType = 'arraybuffer';
        this.counter = 0;
        this.debugEnabled = debug || false;
        this.connected = false;
        this.heartbeat = {
            outgoing: 10000,
            incoming: 10000
        };
        this.maxWebSocketFrameSize = 16 * 1024;
        this.subscriptions = {};
    }

    Client.prototype.debug = function (message) {
        let _ref;

        if (!this.debugEnabled) {
            return;
        }

        return typeof window !== 'undefined' && window !== null
            ? (_ref = window.console) != null
                ? _ref.log(message)
                : void 0
            : void 0;
    };

    now = function () {
        if (Date.now) {
            return Date.now();
        } else {
            return new Date().valueOf;
        }
    };

    Client.prototype._transmit = function (command, headers, body) {
        let out = Frame.marshall(command, headers, body);

        if (typeof this.debug === 'function') {
            this.debug('>>> ' + out);
        }

        while (true) {
            if (out.length > this.maxWebSocketFrameSize) {
                this.ws.send(out.substring(0, this.maxWebSocketFrameSize));
                out = out.substring(this.maxWebSocketFrameSize);
                if (typeof this.debug === 'function') {
                    this.debug('remaining = ' + out.length);
                }
            } else {
                return this.ws.send(out);
            }
        }
    };

    Client.prototype._setupHeartbeat = function (headers) {
        var serverIncoming, serverOutgoing, ttl, v, _ref, _ref1;

        if (
            (_ref = headers.version) !== Stomp.VERSIONS.V1_1 &&
            _ref !== Stomp.VERSIONS.V1_2
        ) {
            return;
        }

        (_ref1 = (function () {
            let _i, _len, _ref1, _results;
            _ref1 = headers['heart-beat'].split(',');
            _results = [];
            for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
                v = _ref1[_i];
                _results.push(parseInt(v));
            }
            return _results;
        })()),
            (serverOutgoing = _ref1[0]),
            (serverIncoming = _ref1[1]);

        if (!(this.heartbeat.outgoing === 0 || serverIncoming === 0)) {
            ttl = Math.max(this.heartbeat.outgoing, serverIncoming);
            if (typeof this.debug === 'function') {
                this.debug('send PING every ' + ttl + 'ms');
            }
            this.pinger = Stomp.setInterval(
                ttl,
                (function (_this) {
                    return function () {
                        _this.ws.send(Byte.LF);
                        return typeof _this.debug === 'function'
                            ? _this.debug('>>> PING')
                            : void 0;
                    };
                })(this)
            );
        }
        if (!(this.heartbeat.incoming === 0 || serverOutgoing === 0)) {
            ttl = Math.max(this.heartbeat.incoming, serverOutgoing);
            if (typeof this.debug === 'function') {
                this.debug('check PONG every ' + ttl + 'ms');
            }
            return (this.ponger = Stomp.setInterval(
                ttl,
                (function (_this) {
                    return function () {
                        var delta;
                        delta = now() - _this.serverActivity;
                        if (delta > ttl * 2) {
                            if (typeof _this.debug === 'function') {
                                _this.debug(
                                    'did not receive server activity for the last ' +
                                        delta +
                                        'ms'
                                );
                            }
                            return _this.ws.close();
                        }
                    };
                })(this)
            ));
        }
    };

    Client.prototype._parseConnect = function () {
        const args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];

        let connectCallback;
        let errorCallback;
        let headers = {} as any;

        switch (args.length) {
            case 2:
                (headers = args[0]), (connectCallback = args[1]);
                break;
            case 3:
                if (args[1] instanceof Function) {
                    (headers = args[0]),
                        (connectCallback = args[1]),
                        (errorCallback = args[2]);
                } else {
                    (headers.login = args[0]),
                        (headers.passcode = args[1]),
                        (connectCallback = args[2]);
                }
                break;
            case 4:
                (headers.login = args[0]),
                    (headers.passcode = args[1]),
                    (connectCallback = args[2]),
                    (errorCallback = args[3]);
                break;
            default:
                (headers.login = args[0]),
                    (headers.passcode = args[1]),
                    (connectCallback = args[2]),
                    (errorCallback = args[3]),
                    (headers.host = args[4]);
        }
        return [headers, connectCallback, errorCallback];
    };

    Client.prototype.connect = function () {
        var args, errorCallback, headers, out;

        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];

        out = this._parseConnect.apply(this, args);

        (headers = out[0]),
            (this.connectCallback = out[1]),
            (errorCallback = out[2]);
        if (typeof this.debug === 'function') {
            this.debug('Opening Web Socket...');
        }

        this.ws.onmessage = (function (_this) {
            return function (evt) {
                var arr,
                    c,
                    client,
                    data,
                    frame,
                    messageID,
                    onreceive,
                    subscription,
                    _i,
                    _len,
                    _ref,
                    _results;
                data =
                    typeof ArrayBuffer !== 'undefined' &&
                    evt.data instanceof ArrayBuffer
                        ? ((arr = new Uint8Array(evt.data)),
                          typeof _this.debug === 'function'
                              ? _this.debug(
                                    '--- got data length: ' + arr.length
                                )
                              : void 0,
                          (function () {
                              var _i, _len, _results;
                              _results = [];
                              for (_i = 0, _len = arr.length; _i < _len; _i++) {
                                  c = arr[_i];
                                  _results.push(String.fromCharCode(c));
                              }
                              return _results;
                          })().join(''))
                        : evt.data;
                _this.serverActivity = now();
                if (data === Byte.LF) {
                    if (typeof _this.debug === 'function') {
                        _this.debug('<<< PONG');
                    }
                    return;
                }
                if (typeof _this.debug === 'function') {
                    _this.debug('<<< ' + data);
                }
                _ref = Frame.unmarshall(data);
                _results = [];
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                    frame = _ref[_i];
                    switch (frame.command) {
                        case 'CONNECTED':
                            if (typeof _this.debug === 'function') {
                                _this.debug(
                                    'connected to server ' +
                                        frame.headers.server
                                );
                            }
                            _this.connected = true;
                            _this._setupHeartbeat(frame.headers);
                            _results.push(
                                typeof _this.connectCallback === 'function'
                                    ? _this.connectCallback(frame)
                                    : void 0
                            );
                            break;
                        case 'MESSAGE':
                            subscription = frame.headers.subscription;
                            onreceive =
                                _this.subscriptions[subscription] ||
                                _this.onreceive;
                            if (onreceive) {
                                client = _this;
                                messageID = frame.headers['message-id'];
                                frame.ack = function (headers) {
                                    if (headers == null) {
                                        headers = {};
                                    }
                                    return client.ack(
                                        messageID,
                                        subscription,
                                        headers
                                    );
                                };
                                frame.nack = function (headers) {
                                    if (headers == null) {
                                        headers = {};
                                    }
                                    return client.nack(
                                        messageID,
                                        subscription,
                                        headers
                                    );
                                };
                                _results.push(onreceive(frame));
                            } else {
                                _results.push(
                                    typeof _this.debug === 'function'
                                        ? _this.debug(
                                              'Unhandled received MESSAGE: ' +
                                                  frame
                                          )
                                        : void 0
                                );
                            }
                            break;
                        case 'RECEIPT':
                            _results.push(
                                typeof _this.onreceipt === 'function'
                                    ? _this.onreceipt(frame)
                                    : void 0
                            );
                            break;
                        case 'ERROR':
                            _results.push(
                                typeof errorCallback === 'function'
                                    ? errorCallback(frame)
                                    : void 0
                            );
                            break;
                        default:
                            _results.push(
                                typeof _this.debug === 'function'
                                    ? _this.debug('Unhandled frame: ' + frame)
                                    : void 0
                            );
                    }
                }
                return _results;
            };
        })(this);
        this.ws.onclose = (function (_this) {
            return function () {
                var msg;
                msg = 'Whoops! Lost connection to ' + _this.ws.url;
                if (typeof _this.debug === 'function') {
                    _this.debug(msg);
                }
                _this._cleanUp();
                return typeof errorCallback === 'function'
                    ? errorCallback(msg)
                    : void 0;
            };
        })(this);
        return (this.ws.onopen = (function (_this) {
            return function () {
                if (typeof _this.debug === 'function') {
                    _this.debug('Web Socket Opened...');
                }
                headers['accept-version'] = Stomp.VERSIONS.supportedVersions();
                headers['heart-beat'] = [
                    _this.heartbeat.outgoing,
                    _this.heartbeat.incoming
                ].join(',');
                return _this._transmit('CONNECT', headers);
            };
        })(this));
    };

    Client.prototype.disconnect = function (disconnectCallback, headers) {
        if (headers == null) {
            headers = {};
        }
        this._transmit('DISCONNECT', headers);
        this.ws.onclose = null;
        this.ws.close();
        this._cleanUp();
        return typeof disconnectCallback === 'function'
            ? disconnectCallback()
            : void 0;
    };

    Client.prototype._cleanUp = function () {
        this.connected = false;
        if (this.pinger) {
            Stomp.clearInterval(this.pinger);
        }
        if (this.ponger) {
            return Stomp.clearInterval(this.ponger);
        }
    };

    Client.prototype.send = function (destination, headers, body) {
        if (headers == null) {
            headers = {};
        }
        if (body == null) {
            body = '';
        }
        headers.destination = destination;
        return this._transmit('SEND', headers, body);
    };

    Client.prototype.subscribe = function (destination, callback, headers) {
        var client;
        if (headers == null) {
            headers = {};
        }
        if (!headers.id) {
            headers.id = 'sub-' + this.counter++;
        }
        headers.destination = destination;
        this.subscriptions[headers.id] = callback;
        this._transmit('SUBSCRIBE', headers);
        client = this;
        return {
            id: headers.id,
            unsubscribe: function () {
                return client.unsubscribe(headers.id);
            }
        };
    };

    Client.prototype.unsubscribe = function (id) {
        delete this.subscriptions[id];
        return this._transmit('UNSUBSCRIBE', {
            id: id
        });
    };

    Client.prototype.begin = function (transaction) {
        var client, txid;
        txid = transaction || 'tx-' + this.counter++;
        this._transmit('BEGIN', {
            transaction: txid
        });
        client = this;
        return {
            id: txid,
            commit: function () {
                return client.commit(txid);
            },
            abort: function () {
                return client.abort(txid);
            }
        };
    };

    Client.prototype.commit = function (transaction) {
        return this._transmit('COMMIT', {
            transaction: transaction
        });
    };

    Client.prototype.abort = function (transaction) {
        return this._transmit('ABORT', {
            transaction: transaction
        });
    };

    Client.prototype.ack = function (messageID, subscription, headers) {
        if (headers == null) {
            headers = {};
        }
        headers['message-id'] = messageID;
        headers.subscription = subscription;
        return this._transmit('ACK', headers);
    };

    Client.prototype.nack = function (messageID, subscription, headers) {
        if (headers == null) {
            headers = {};
        }
        headers['message-id'] = messageID;
        headers.subscription = subscription;
        return this._transmit('NACK', headers);
    };

    return Client;
})();

const Stomp = {
    debug: false,
    VERSIONS: {
        V1_0: '1.0',
        V1_1: '1.1',
        V1_2: '1.2',
        supportedVersions: function () {
            return '1.1,1.0';
        }
    },
    client: function (url, protocols) {
        if (protocols == null) {
            protocols = ['v10.stomp', 'v11.stomp'];
        }

        const klass = WebSocketClass || WebSocket;

        const ws = new klass(url, protocols);

        return new Client(ws);
    },
    over: function (ws, debug = false) {
        return new Client(ws, debug);
    },
    setInterval: function (interval, f) {
        return window.setInterval(f, interval);
    },
    clearInterval: function (id) {
        return window.clearInterval(id);
    },
    Frame
};

export default Stomp;
