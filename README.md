# < react-use-stomp >

react providers, decorators, and hooks for handling websockets using the stomp protocol.

## Components

## Providers

### < [UseStompNotificationsProvider](src/useStompNotificationsProvider.tsx) >

This is the shared-worker provider. It connects to the websocket using stomp protocol, and manages the state of notifications.
The list is based on the notifications received from the websocket channel and notifications dismissed by the user.

-   queueing/dismissal management
-   cross tab/window syncing of notifications

Automatic reconnection is built into the [webSocketWorkerInstance](./src/webSocketWorkerInstance.ts). You can control
the max number of attempts and interval for reconnecting.

Additionally, all [ < SnackProvider > ](https://iamhosseindhv.com/notistack/api#snackbarprovider) props are accepted and
passed to the SnackProvider component.

For more info, please see the typescript definition for the provider for the full list of props.

```typescript jsx
import React, {useState} from 'react';
import {UseStompNotificationsProvider} from 'react-use-stomp';

const App = () => {

    const [authHeaders] = useState('auth-token');

    // authHeaders = {Authorization: props.authHeaders};

    // if you have a different set up, you can set the headers
    // by using the headers prop

    return (
        <UseStompNotificationsProvider
            authHeaders={authHeaders}
            maxSnack={3}
            reconnectInterval={10000}
            reconnectMaxAttempts={10}
            url='https://domain.com/messages'>
            <App/>
        </UseStompNotificationsProvider>
    )
}
```

\* Make sure install dependencies in your project, or add in package.json

```
"peerDependencies": {
    "react": "^16.8.0",
    "react-dom": "^16.8.0",
    "@material-ui/core": "^4.0.0"
  },
```

\* Make sure your public/dist folder contains the [webSocketWorkerInstance.js](./webSocketWorkerInstance.js) AND
the [webSocketWorkerInstance.js.map](./webSocketWorkerInstance.js.map) files:

```
node_modules/use-stomp/webSocketWorkerInstance.js
node_modules/use-stomp/webSocketWorkerInstance.js.map
```

### < [UseStompProvider](src/useStompProvider.tsx) >

This is the non shared-worker provider, and does not provide any queueing functionality. Instead,
it provides a way to subscribe to messages and send messages to channels.

Please see the typescript definition for the provider; it has notes regarding all the properties available.

```typescript jsx
import React, {useState} from 'react';
import {UseStompProvider} from 'react-use-stomp';

const App = () => {

    const [authHeaders] = useState({
        Authorization: 'auth-token'
    })

    return (
        <UseStompProvider
            authHeaders={authHeaders}
            url='ws://ws-endpoint'>
            <App/>
        </UseStompProvider>
    )
}
```

## Hooks

### [useStompNotifications](src/useStompNotifications.tsx)

\* Only works with [useStompNotificationsProvider](src/useStompNotificationsProvider.tsx)

Internally, [notistack](https://github.com/iamhosseindhv/notistack) will handle driving the notifications.
To specify the options passed to [enqueueSnackbar](https://iamhosseindhv.com/notistack/api#enqueuesnackbar-options), use the second
parameter of the hook, like below.

Two additional/optional options are available:

-   parseMessage(message) - return the formatted message jsx markup (React.ReactNode)
-   parseVariant(message) - return the variant type (error, info, success, warning)

```typescript jsx
import React from 'react';
import {useStompNotifications} from 'react-use-stomp';

export default () => {

    const [messages, send, connected] = useStompNotifications('/user/queue/messages', {
        action: (dismiss) => (
            <button onClick={dismiss}>
                Dismiss
            </button>
        ),
        parseMessage: (message) => (
            <strong>{message.id} - {message.content}</strong>
        ),
        parseVariant: (message) =>
            message.content.includes('Error') ? 'error' : 'info'
    });

    const sendMessageToDifferentChannel = () => {
        send('/app/message', {
            message: 'toSameChannel'
        });
    };

    const sendMessageToSameChannel = () => {
        send({
            message: 'toSameChannel'
        });
    };

    return (
        <>
            <h4>Status: {connected}</h4>

            <h4>Notifications:</h4>

            <button onClick={sendMessageToDifferentChannel}>
                send message to different channel
            </button>

            <button onClick={sendMessageToSameChannel}>
                send message to same channel
            </button>

            {/* do something with messages (optional) */}
            <ul>
                {messages.map((item) => (
                    <li key={item.id}>
                       <span>{item.content}</span>
                       <button
                          onClick={item.dismiss}>
                          Dismiss
                        </button>
                    </li>
                ))}
            </ul>
        </>
    )
}
```

### [useStomp](./src/useStomp.ts)

```typescript jsx
import React from 'react';
import {useStomp} from 'react-use-stomp';

export default () => {

    const [message, send] = useStomp('channel');

    const sendMessageToDifferentChannel = () => {
        send('/app/message', {
            message: 'toSameChannel'
        });
    };

    const sendMessageToSameChannel = () => {
        send({
            message: 'toSameChannel'
        });
    };

    return (

        <>
            <button onClick={sendMessageToDifferentChannel}>
                send message to different channel
            </button>

            <button onClick={sendMessageToSameChannel}>
                send message to same channel
            </button>

            <h4>Latest Message</h4>

            <div>{message}</div>
        </>
    )
}
```

### [UseStompCtx](./src/useStompCtx.ts)

If you need direct access to the context, use this hook.

```typescript jsx
import React from 'react';
import {useStompCtx} from 'react-use-stomp';

export default () => {

    const context = useStompCtx();

    // do whatever with it.
};
```

## Decorators

### [@withUseStomp](src/withUseStomp.tsx)

The decorator allows you to use the useStomp hook with legacy class-based components.

```typescript jsx
import React from 'react';
import {withUseStomp} from 'react-use-stomp';

@withUseStomp('/message/channel')
class ExampleDecorator extends React.Component {

    _sendMessageToDifferentChannel = () => {
        this.props.sendMessage('/app/messages', 'test');
    }

    _sendMesageToSameChannel = () => {
        this.props.sendMessage('test');
    }

    return (
        <>
            <button onClick={this._sendMessageToDifferentChannel}>
                send message to different channel
            </button>

            <button onClick={this._sendMesageToSameChannel}>
                send message to same channel
            </button>

            <h4>Latest Message</h4>

            <div>{this.props.message}</div>
        </>
    )
}
```

### [@withUseStomp](src/withUseStomp.tsx)

This decorator provides decorates your component with the props provided by `useStompNotifications`. For use with legacy class-based components

```typescript jsx
import React from 'react';
import {withUseStompNotifications} from 'react-use-stomp';

@withUseStompNotifications('/message/channel',{
    action: (dismiss) => (
        <button onClick={dismiss}>
          Dismiss
        </button>
    ),
    parseMessage: (message) => (
        <strong>{message.id} - {message.content}</strong>
    ),
    parseVariant: (message) =>
        message.content.includes('Error') ? 'error' : 'info'
})
class ExampleDecorator extends React.Component {

    _sendMessageToDifferentChannel = () => {
        this.props.sendMessage('/app/messages', 'test');
    }

    _sendMesageToSameChannel = () => {
        this.props.sendMessage('test');
    }

    return (
        <>
            <h4>Status: {this.props.connected}</h4>

            <button onClick={this._sendMessageToDifferentChannel}>
                send message to different channel
            </button>

            <button onClick={this._sendMesageToSameChannel}>
                send message to same channel
            </button>

            <h4>Notifications:</h4>

            {/* do something with messages (optional) */}
            <ul>
                {this.props.messages.map((item) => (
                    <li key={item.id}>
                       <span>{item.content}</span>
                       <button
                          onClick={item.dismiss}>
                          Dismiss
                        </button>
                    </li>
                ))}
            </ul>
        </>
    )
}
```
